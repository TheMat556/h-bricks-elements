<?php
/**
 * Admin page loader.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers and renders the admin app.
 */
class HBE_Admin_Page {

	/**
	 * Hook suffix for the admin screen.
	 *
	 * @var string
	 */
	private static $hook_suffix = '';

	/**
	 * Boots admin hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * Registers the top-level menu.
	 *
	 * @return void
	 */
	public static function register_menu() {
		self::$hook_suffix = add_menu_page(
			__( 'H-Booking', 'h-bricks-elements' ),
			__( 'H-Booking', 'h-bricks-elements' ),
			'manage_options',
			'hbe-admin',
			array( __CLASS__, 'render_page' ),
			'dashicons-calendar-alt',
			58
		);
	}

	/**
	 * Enqueues the admin bundle when available.
	 *
	 * @param string $hook_suffix Current admin hook.
	 * @return void
	 */
	public static function enqueue_assets( $hook_suffix ) {
		if ( self::$hook_suffix !== $hook_suffix ) {
			return;
		}

		$script_path = HBE_PLUGIN_PATH . 'dist/admin.js';
		$style_path  = HBE_PLUGIN_PATH . 'dist/admin.css';

		if ( file_exists( $style_path ) ) {
			wp_enqueue_style(
				'hbe-admin',
				HBE_PLUGIN_URL . 'dist/admin.css',
				array(),
				filemtime( $style_path )
			);
		}

		if ( file_exists( $script_path ) ) {
			wp_enqueue_script(
				'hbe-admin',
				HBE_PLUGIN_URL . 'dist/admin.js',
				array(),
				filemtime( $script_path ),
				true
			);

			wp_localize_script(
				'hbe-admin',
				'hbeAdmin',
				array(
					'nonce'   => wp_create_nonce( 'wp_rest' ),
					'restUrl' => rest_url( HBE_REST_API::NAMESPACE . '/' ),
				)
			);
		}
	}

	/**
	 * Renders the React mount node.
	 *
	 * @return void
	 */
	public static function render_page() {
		echo '<div class="wrap"><div id="hbe-admin-root"></div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
