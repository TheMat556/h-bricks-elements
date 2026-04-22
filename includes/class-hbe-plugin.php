<?php
/**
 * Main plugin bootstrap.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Boots plugin modules.
 */
class HBE_Plugin {

	/**
	 * Starts the plugin runtime.
	 *
	 * @return void
	 */
	public static function boot(): void {
		HBE_Calendar_Post_Type::register();
		HBE_Admin::register();
		HBE_REST::register();

		add_filter( 'bricks/builder/i18n', array( __CLASS__, 'register_bricks_category' ) );
		add_action( 'init', array( __CLASS__, 'register_bricks_elements' ), 11 );
		add_action( 'admin_init', array( __CLASS__, 'maybe_upgrade' ) );
		add_action( 'template_redirect', array( __CLASS__, 'handle_cancel_page' ) );
		add_action( 'wp_mail_failed', array( __CLASS__, 'log_mail_failure' ) );
	}

	/**
	 * Logs wp_mail failures to the PHP error log.
	 *
	 * @param WP_Error $error Mail error.
	 */
	public static function log_mail_failure( \WP_Error $error ): void {
		$context = HBE_Booking_Mail::get_active_mail_context();
		error_log(
			'[HBE] wp_mail failed: '
			. $error->get_error_message()
			. ' — data: '
			. wp_json_encode( $error->get_error_data() )
			. ' — context: '
			. wp_json_encode( $context )
		);
	}

	/**
	 * Sends a booking confirmation email via wp_mail().
	 * SMTP delivery is handled by whatever mail plugin is active on the site.
	 *
	 * @param int                $calendar_id Calendar post ID.
	 * @param array<string,mixed> $booking    Formatted booking row.
	 * @return bool
	 */
	public static function send_booking_confirmation( int $calendar_id, array $booking ): bool {
		$result = HBE_Booking_Mail::send_booking_email(
			$calendar_id,
			$booking,
			array( 'force_enabled' => true )
		);
		if ( is_wp_error( $result ) ) {
			error_log(
				sprintf(
					'[HBE] send_booking_confirmation failed calendar=%d booking=%d error=%s data=%s',
					$calendar_id,
					isset( $booking['id'] ) ? (int) $booking['id'] : 0,
					$result->get_error_message(),
					wp_json_encode( $result->get_error_data() )
				)
			);
			return false;
		}

		return true;
	}

	/**
	 * Normalizes email logo URLs for client compatibility.
	 *
	 * Most major mail clients do not reliably render SVGs in <img> tags.
	 * Returning an empty string allows the renderer to omit the logo.
	 *
	 * @param string $url Raw logo URL.
	 * @return string
	 */
	public static function normalize_email_logo_url( string $url ): string {
		$normalized = esc_url( trim( $url ) );
		if ( '' === $normalized ) {
			return '';
		}

		$path = (string) wp_parse_url( $normalized, PHP_URL_PATH );

		// SVG: prefer a raster resize from WordPress, but fall through to the raw
		// SVG URL if none exists — modern mail clients (Gmail, Apple Mail) render
		// SVGs via their image proxies, so blocking them hides the logo entirely.
		if ( $path && preg_match( '/\.svg$/i', $path ) ) {
			$attachment_id = attachment_url_to_postid( $normalized );
			if ( $attachment_id > 0 ) {
				$sizes = array( 'medium_large', 'large', 'medium', 'thumbnail', 'full' );
				foreach ( $sizes as $size ) {
					$size_url = wp_get_attachment_image_url( $attachment_id, $size );
					if ( $size_url && ! preg_match( '/\.svg($|\?)/i', (string) wp_parse_url( $size_url, PHP_URL_PATH ) ) ) {
						return esc_url( $size_url );
					}
				}
			}

			// No raster resize — return the SVG URL directly.
			return $normalized;
		}

		return $normalized;
	}

	/**
	 * Runs activation tasks.
	 *
	 * @return void
	 */
	public static function activate(): void {
		HBE_Calendar_Post_Type::register_post_type();
		self::run_install();
		flush_rewrite_rules();
	}

	/**
	 * Ensures install-time resources exist for active sites after updates.
	 *
	 * @return void
	 */
	public static function maybe_upgrade(): void {
		$installed_version = get_option( 'hbe_plugin_version' );

		if ( HBE_VERSION === $installed_version ) {
			return;
		}

		self::run_install();
	}

	/**
	 * Registers the custom Bricks category label.
	 *
	 * @param array<string,string> $i18n Bricks labels.
	 * @return array<string,string>
	 */
	public static function register_bricks_category( array $i18n ): array {
		$i18n['h-additional-blocks'] = 'H-Additional-Blocks';
		return $i18n;
	}

	/**
	 * Registers Bricks elements shipped by this plugin.
	 *
	 * @return void
	 */
	public static function register_bricks_elements(): void {
		$element_files = array(
			HBE_PLUGIN_DIR . 'elements/booking/class-booking.php',
		);

		foreach ( $element_files as $file ) {
			if ( file_exists( $file ) ) {
				\Bricks\Elements::register_element( $file );
			}
		}
	}

	/**
	 * Runs install and upgrade tasks.
	 *
	 * @return void
	 */
	private static function run_install(): void {
		HBE_Bookings_Table::maybe_create();
		update_option( 'hbe_plugin_version', HBE_VERSION );
	}

	/**
	 * Returns the site logo URL (customizer logo, falling back to site icon).
	 *
	 * @param int $fallback_size Pixel size passed to get_site_icon_url() if no custom logo is set.
	 * @return string
	 */
	public static function get_site_logo_url( int $fallback_size = 64 ): string {
		$logo_id = get_theme_mod( 'custom_logo' );
		if ( $logo_id ) {
			$url = wp_get_attachment_image_url( (int) $logo_id, 'thumbnail' );
			if ( $url ) {
				return $url;
			}
		}
		return (string) get_site_icon_url( $fallback_size );
	}

	/**
	 * Generates a signed HMAC token for a booking cancel link.
	 *
	 * @param int $booking_id  Booking ID.
	 * @param int $calendar_id Calendar ID.
	 * @return string
	 */
	public static function generate_cancel_token( int $booking_id, int $calendar_id ): string {
		return hash_hmac( 'sha256', $booking_id . ':' . $calendar_id, wp_salt( 'auth' ) );
	}

	/**
	 * Generates the full cancel URL for a booking.
	 *
	 * @param int $booking_id  Booking ID.
	 * @param int $calendar_id Calendar ID.
	 * @return string
	 */
	public static function generate_cancel_url( int $booking_id, int $calendar_id ): string {
		return add_query_arg(
			array(
				'hbe_cancel_booking' => '1',
				'id'                 => $booking_id,
				'cal'                => $calendar_id,
				'token'              => self::generate_cancel_token( $booking_id, $calendar_id ),
			),
			home_url( '/' )
		);
	}

	/**
	 * Intercepts requests to the customer cancel page and outputs an HTML response.
	 *
	 * @return void
	 */
	public static function handle_cancel_page(): void {
		if ( empty( $_GET['hbe_cancel_booking'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$booking_id  = absint( $_GET['id'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$calendar_id = absint( $_GET['cal'] ?? 0 ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$token       = sanitize_text_field( wp_unslash( $_GET['token'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( ! $booking_id || ! $calendar_id || ! $token ) {
			self::render_cancel_page( 'error', __( 'Invalid cancellation link.', 'h-bricks-elements' ) );
			exit;
		}

		if ( ! hash_equals( self::generate_cancel_token( $booking_id, $calendar_id ), $token ) ) {
			self::render_cancel_page( 'error', __( 'This cancellation link is invalid or has expired.', 'h-bricks-elements' ) );
			exit;
		}

		// Handle confirmation POST.
		if ( 'POST' === $_SERVER['REQUEST_METHOD'] && ! empty( $_POST['hbe_confirm_cancel'] ) ) {
			check_admin_referer( 'hbe_cancel_' . $booking_id . '_' . $calendar_id );
			$result = HBE_Bookings::delete( $calendar_id, $booking_id );

			if ( is_wp_error( $result ) ) {
				self::render_cancel_page( 'error', $result->get_error_message() );
			} else {
				self::render_cancel_page( 'success', '' );
			}
			exit;
		}

		// Show confirm form.
		self::render_cancel_page( 'confirm', '', $booking_id, $calendar_id );
		exit;
	}

	/**
	 * Outputs a standalone HTML cancellation page.
	 *
	 * @param string $state      'confirm' | 'success' | 'error'
	 * @param string $message    Error or info message.
	 * @param int    $booking_id Booking ID (required for 'confirm' state).
	 * @param int    $calendar_id Calendar ID (required for 'confirm' state).
	 * @return void
	 */
	private static function render_cancel_page( string $state, string $message = '', int $booking_id = 0, int $calendar_id = 0 ): void {
		$site_name = get_bloginfo( 'name' );
		$logo_url  = self::get_site_logo_url();
		$home_url  = home_url( '/' );

		$action     = '';
		$nonce_html = '';
		if ( 'confirm' === $state && $booking_id && $calendar_id ) {
			$action     = add_query_arg(
				array(
					'hbe_cancel_booking' => '1',
					'id'                 => $booking_id,
					'cal'                => $calendar_id,
					'token'              => self::generate_cancel_token( $booking_id, $calendar_id ),
				),
				home_url( '/' )
			);
			$nonce_html = wp_nonce_field( 'hbe_cancel_' . $booking_id . '_' . $calendar_id, '_wpnonce', true, false );
		}

		$heading_map = array(
			'confirm' => __( 'Cancel Booking', 'h-bricks-elements' ),
			'success' => __( 'Booking Cancelled', 'h-bricks-elements' ),
			'error'   => __( 'Something went wrong', 'h-bricks-elements' ),
		);
		$heading     = $heading_map[ $state ] ?? $heading_map['error'];

		$data = array(
			'state'      => $state,
			'message'    => $message,
			'action'     => $action,
			'nonceField' => $nonce_html,
			'homeUrl'    => $home_url,
			'logoUrl'    => $logo_url,
			'siteName'   => $site_name,
		);

		$plugin_root_url  = plugin_dir_url( HBE_PLUGIN_FILE );
		$plugin_root_path = plugin_dir_path( HBE_PLUGIN_FILE );
		$cancel_js_path   = $plugin_root_path . 'dist/cancel.js';
		$cancel_js_url    = $plugin_root_url . 'dist/cancel.js';
		$cancel_js_ver    = file_exists( $cancel_js_path ) ? (string) filemtime( $cancel_js_path ) : HBE_VERSION;

		status_header( 'error' === $state ? 400 : 200 );
		header( 'Content-Type: text/html; charset=UTF-8' );

		$data_json = wp_json_encode( $data );
		if ( false === $data_json ) {
			$data_json = '{}';
		}

		echo '<!DOCTYPE html>
<html lang="' . esc_attr( get_bloginfo( 'language' ) ) . '">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . esc_html( $heading ) . ' &mdash; ' . esc_html( $site_name ) . '</title>
<style>html,body,#hbe-cancel-root{height:100%;margin:0}body{background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}</style>
</head>
<body>
<div id="hbe-cancel-root"></div>
<script>window.hbeCancelData = ' . $data_json . ';</script>
<script type="module" src="' . esc_url( add_query_arg( 'ver', $cancel_js_ver, $cancel_js_url ) ) . '"></script>
</body>
</html>';
	}
}
