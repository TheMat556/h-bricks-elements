<?php
/**
 * Plugin Name: H-Bricks-Blocks
 * Description: Module that adds some custom Bricks Builder Elements
 * Version: 0.0.0
 * Author: Matthias Hader
 * Text Domain: h-bricks-elements
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'bricks/builder/i18n',
	function ( $i18n ) {
		$i18n['h-additional-blocks'] = 'H-Additional-Blocks';
		return $i18n;
	}
);

add_action(
	'init',
	function () {
		$element_files = array(
			__DIR__ . '/elements/booking/booking.php',
		);

		foreach ( $element_files as $file ) {
			\Bricks\Elements::register_element( $file );
		}
	},
	11
);
