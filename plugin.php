<?php
/**
 * Plugin Name: H-Bricks-Elements
 * Description: Module that adds some custom Bricks Builder Elements
 * Version: 0.0.1
 * Author: Matthias Hader
 * Text Domain: h-bricks-elements
 *
 * @package H-Bricks-Elements
 * Requires at least: 6.2
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'HBE_PLUGIN_FILE', __FILE__ );
define( 'HBE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HBE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'HBE_VERSION', '0.0.1' );

require_once HBE_PLUGIN_DIR . 'includes/class-hbe-calendar-post-type.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-booking-mail.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-calendar-settings.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-bookings-table.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-bookings.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-admin.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-rest.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-plugin.php';

register_activation_hook( HBE_PLUGIN_FILE, array( 'HBE_Plugin', 'activate' ) );

HBE_Plugin::boot();
