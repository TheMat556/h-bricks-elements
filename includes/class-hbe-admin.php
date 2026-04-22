<?php
/**
 * Admin page bootstrap and data provisioning.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles admin page rendering and boot data.
 */
class HBE_Admin {

	/**
	 * Admin page slug.
	 *
	 * @var string
	 */
	const PAGE_SLUG = 'h-bricks-elements';

	/**
	 * Email designer submenu slug.
	 *
	 * @var string
	 */
	const EMAIL_DESIGNER_SLUG = 'h-bricks-email-designer';

	/**
	 * Registers admin hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_filter( 'script_loader_tag', array( __CLASS__, 'filter_script_loader_tag' ), 10, 3 );
	}

	/**
	 * Registers the top-level admin menu page.
	 *
	 * @return void
	 */
	public static function register_menu(): void {
		add_menu_page(
			'H-Bricks Elements',
			'H-Bricks Elements',
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' ),
			'dashicons-layout',
			80
		);

		add_submenu_page(
			self::PAGE_SLUG,
			'Email Designer',
			'Email Designer',
			'manage_options',
			self::EMAIL_DESIGNER_SLUG,
			array( __CLASS__, 'render_email_designer_page' )
		);
	}

	/**
	 * Renders the Email Designer mount point.
	 *
	 * @return void
	 */
	public static function render_email_designer_page(): void {
		echo '<div id="h-bricks-email-designer-root" data-rest-url="' . esc_attr( rest_url( 'hbe/v1/' ) ) . '" data-rest-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '"></div>';
	}

	/**
	 * Renders the admin app mount point.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		echo '<div id="h-bricks-admin-root" data-rest-url="' . esc_attr( rest_url( 'hbe/v1/' ) ) . '" data-rest-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '"></div>';
	}

	/**
	 * Enqueues the React admin app and injects initial boot data.
	 *
	 * @param string $hook Current admin hook.
	 * @return void
	 */
	public static function enqueue_assets( string $hook ): void {
		$settings_hook        = 'toplevel_page_' . self::PAGE_SLUG;
		$email_designer_hooks = array(
			'h-bricks-elements_page_' . self::EMAIL_DESIGNER_SLUG,
			'admin_page_' . self::EMAIL_DESIGNER_SLUG,
		);

		if ( $settings_hook === $hook ) {
			self::enqueue_settings_assets();
			return;
		}

		if ( in_array( $hook, $email_designer_hooks, true ) ) {
			self::enqueue_email_designer_assets();
		}
	}

	/**
	 * Enqueues the Settings SPA bundle.
	 *
	 * @return void
	 */
	private static function enqueue_settings_assets(): void {
		$theme    = get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true );
		$theme    = $theme ? $theme : 'light';
		$css_path = HBE_PLUGIN_DIR . 'dist/settings.css';
		$js_path  = HBE_PLUGIN_DIR . 'dist/settings.js';

		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'h-bricks-settings',
				HBE_PLUGIN_URL . 'dist/settings.css',
				array(),
				filemtime( $css_path )
			);
		}

		wp_enqueue_script(
			'h-bricks-settings',
			HBE_PLUGIN_URL . 'dist/settings.js',
			array(),
			file_exists( $js_path ) ? (string) filemtime( $js_path ) : HBE_VERSION,
			true
		);

		wp_add_inline_script(
			'h-bricks-settings',
			'window.hBricksAdmin=' . wp_json_encode( self::get_boot_data( $theme ) ) . ';',
			'before'
		);

		// phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- inline style has no version.
		wp_register_style( 'h-bricks-admin-page', false );
		wp_enqueue_style( 'h-bricks-admin-page' );
		wp_add_inline_style( 'h-bricks-admin-page', self::get_admin_page_styles() );
	}

	/**
	 * Enqueues the Email Designer bundle.
	 *
	 * @return void
	 */
	private static function enqueue_email_designer_assets(): void {
		$theme    = get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true );
		$theme    = $theme ? $theme : 'light';
		$css_path = HBE_PLUGIN_DIR . 'dist/email-designer.css';
		$js_path  = HBE_PLUGIN_DIR . 'dist/email-designer.js';

		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'h-bricks-email-designer',
				HBE_PLUGIN_URL . 'dist/email-designer.css',
				array(),
				filemtime( $css_path )
			);
		}

		wp_enqueue_script(
			'h-bricks-email-designer',
			HBE_PLUGIN_URL . 'dist/email-designer.js',
			array(),
			file_exists( $js_path ) ? (string) filemtime( $js_path ) : HBE_VERSION,
			true
		);

		wp_add_inline_script(
			'h-bricks-email-designer',
			'window.hBricksEmailDesigner=' . wp_json_encode( self::get_email_designer_boot_data( $theme ) ) . ';',
			'before'
		);

		// phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- inline style has no version.
		wp_register_style( 'h-bricks-email-designer-page', false );
		wp_enqueue_style( 'h-bricks-email-designer-page' );
		wp_add_inline_style( 'h-bricks-email-designer-page', self::get_email_designer_page_styles() );
	}

	/**
	 * Adds type="module" to the admin bundle tag.
	 *
	 * @param string $tag    Original script tag.
	 * @param string $handle Script handle.
	 * @param string $src    Script source URL.
	 * @return string
	 */
	public static function filter_script_loader_tag( string $tag, string $handle, string $src ): string {
		if ( 'h-bricks-settings' !== $handle && 'h-bricks-email-designer' !== $handle ) {
			return $tag;
		}

		return '<script type="module" src="' . esc_url( $src ) . '"></script>';
	}

	/**
	 * Builds the initial admin boot payload.
	 *
	 * @param string $theme Current admin theme.
	 * @return array<string,mixed>
	 */
	private static function get_boot_data( string $theme ): array {
		$calendars = HBE_Calendar_Post_Type::get_admin_items();

		return array(
			'theme'             => $theme,
			'locale'            => determine_locale(),
			'restUrl'           => esc_url_raw( rest_url( 'hbe/v1/' ) ),
			'restNonce'         => wp_create_nonce( 'wp_rest' ),
			'pluginUrl'         => HBE_PLUGIN_URL,
			'calendarPostType'  => HBE_Calendar_Post_Type::POST_TYPE,
			'bookingsTable'     => HBE_Bookings_Table::get_name(),
			'initialCalendars'  => $calendars,
			'selectedCalendarId' => ! empty( $calendars ) ? (int) $calendars[0]['id'] : 0,
			'siteLogoUrl'       => esc_url( HBE_Plugin::get_site_logo_url() ),
			'siteName'          => esc_html( get_bloginfo( 'name' ) ),
		);
	}

	/**
	 * Builds the boot payload for the Email Designer page.
	 *
	 * @param string $theme Current admin theme.
	 * @return array<string,mixed>
	 */
	private static function get_email_designer_boot_data( string $theme ): array {
		return array(
			'theme'      => $theme,
			'locale'     => determine_locale(),
			'restUrl'    => esc_url_raw( rest_url( 'hbe/v1/' ) ),
			'restNonce'  => wp_create_nonce( 'wp_rest' ),
			'pluginUrl'  => HBE_PLUGIN_URL,
			'siteLogoUrl' => esc_url( HBE_Plugin::get_site_logo_url() ),
			'siteName'   => esc_html( get_bloginfo( 'name' ) ),
		);
	}

	/**
	 * Returns the CSS needed for embedded vs standalone admin rendering.
	 *
	 * @return string
	 */
	private static function get_admin_page_styles(): string {
		$is_shell_embed = isset( $_GET['wp_shell_embed'] ) && '1' === sanitize_text_field( wp_unslash( $_GET['wp_shell_embed'] ) );

		if ( $is_shell_embed ) {
			return 'html, body, #wpwrap, #wpcontent, #wpbody, #wpbody-content, #h-bricks-admin-root { height: 100% !important; min-height: 100% !important; }
			#adminmenumain { display: none; }
			#wpcontent { padding: 0 !important; }
			#wpcontent, #wpfooter { margin-left: 0 !important; }
			#wpbody-content { padding-bottom: 0 !important; }
			#wpfooter { display: none; }
			#h-bricks-admin-root { height: 100% !important; min-height: 100% !important; }';
		}

		return 'html, body, #wpwrap, #wpcontent, #wpbody, #wpbody-content { height: 100% !important; min-height: 100% !important; }
		#wpcontent {
			height: 100vh !important;
			min-height: 100vh !important;
			padding-left: 0 !important;
		}
		#wpbody {
			height: 100% !important;
			min-height: 100% !important;
		}
		#wpfooter { display: none; }
		#wpbody-content {
			display: flex;
			flex-direction: column;
			height: 100% !important;
			min-height: 100vh !important;
			padding: 0 !important;
			padding-bottom: 0 !important;
			margin: 0 !important;
		}
		#wpbody-content > .wrap {
			height: 100% !important;
			min-height: 100% !important;
			margin: 0 !important;
			padding: 0 !important;
		}
		#h-bricks-admin-root {
			flex: 1 1 auto;
			height: 100% !important;
			min-height: 100vh !important;
		}';
	}

	/**
	 * Returns the CSS needed for the Email Designer admin page to fill the viewport.
	 *
	 * @return string
	 */
	private static function get_email_designer_page_styles(): string {
		return 'html, body, #wpwrap, #wpcontent, #wpbody, #wpbody-content { height: 100% !important; min-height: 100% !important; }
		#wpcontent {
			height: 100vh !important;
			min-height: 100vh !important;
			padding-left: 0 !important;
		}
		#wpbody {
			height: 100% !important;
			min-height: 100% !important;
		}
		#wpfooter { display: none; }
		#wpbody-content {
			display: flex;
			flex-direction: column;
			height: 100% !important;
			min-height: 100vh !important;
			padding: 0 !important;
			padding-bottom: 0 !important;
			margin: 0 !important;
		}
		#wpbody-content > .wrap {
			height: 100% !important;
			min-height: 100% !important;
			margin: 0 !important;
			padding: 0 !important;
		}
		#h-bricks-email-designer-root {
			flex: 1 1 auto;
			height: 100% !important;
			min-height: 100vh !important;
		}';
	}
}
