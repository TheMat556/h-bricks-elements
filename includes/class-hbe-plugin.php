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
