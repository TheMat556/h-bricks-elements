<?php
/**
 * Plugin Name: H-Bricks Booking
 * Description: Booking plugin and Bricks Builder elements for H-Bricks.
 * Version: 0.1.0
 * Author: Matthias Hader
 * Text Domain: h-bricks-elements
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'HBE_PLUGIN_FILE', __FILE__ );
define( 'HBE_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'HBE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'HBE_PLUGIN_VERSION', '0.1.0' );

/**
 * Loads plugin PHP files that are safe outside Bricks runtime.
 *
 * @return void
 */
function hbe_load_plugin_files() {
	$include_files = array(
		HBE_PLUGIN_PATH . 'includes/class-db-manager.php',
		HBE_PLUGIN_PATH . 'includes/class-cpt-manager.php',
		HBE_PLUGIN_PATH . 'includes/class-booking-logic.php',
		HBE_PLUGIN_PATH . 'includes/class-email-handler.php',
		HBE_PLUGIN_PATH . 'includes/class-rest-api.php',
		HBE_PLUGIN_PATH . 'includes/class-admin-page.php',
		HBE_PLUGIN_PATH . 'includes/class-bricks-form-action.php',
	);

	foreach ( $include_files as $file ) {
		if ( file_exists( $file ) ) {
			require_once $file;
		}
	}
}

hbe_load_plugin_files();

register_activation_hook( __FILE__, array( 'HBE_DB_Manager', 'activate' ) );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action(
	'plugins_loaded',
	function () {
		HBE_CPT_Manager::init();
		HBE_REST_API::init();
		HBE_Email_Handler::init();
		HBE_Admin_Page::init();
		HBE_Bricks_Form_Action::init();
	}
);

add_action(
	'init',
	function () {
		load_plugin_textdomain( 'h-bricks-elements', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	}
);

add_filter(
	'bricks/builder/i18n',
	function ( $i18n ) {
		$i18n['h-additional-blocks'] = 'H-Booking';
		return $i18n;
	}
);

add_action(
	'init',
	function () {
		if ( ! class_exists( '\\Bricks\\Elements' ) ) {
			return;
		}

		require_once HBE_PLUGIN_PATH . 'elements/booking/class-booking.php';
		\Bricks\Elements::register_element( HBE_PLUGIN_PATH . 'elements/booking/class-booking.php' );
	},
	11
);
