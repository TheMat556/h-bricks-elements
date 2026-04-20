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
		$settings = HBE_Calendar_Settings::get( $calendar_id );
		$mail     = $settings['mailSettings'] ?? array();

		if ( empty( $mail['enabled'] ) || empty( $booking['customerEmail'] ) ) {
			return false;
		}

		$to      = sanitize_email( $booking['customerEmail'] );
		$subject = ! empty( $mail['subject'] ) ? $mail['subject'] : 'Booking confirmation';
		$name    = ! empty( $booking['customerName'] ) ? $booking['customerName'] : $to;
		$start   = ! empty( $booking['start'] ) ? $booking['start'] : '';

		$body = sprintf(
			"Hi %s,\n\nYour booking has been received.\n\nStart: %s\n\nThank you.",
			$name,
			$start
		);

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );

		if ( ! empty( $mail['fromEmail'] ) && is_email( $mail['fromEmail'] ) ) {
			$from_name = ! empty( $mail['fromName'] ) ? $mail['fromName'] : $mail['fromEmail'];
			$headers[] = 'From: ' . $from_name . ' <' . $mail['fromEmail'] . '>';
		}

		return (bool) wp_mail( $to, $subject, $body, $headers );
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
}
