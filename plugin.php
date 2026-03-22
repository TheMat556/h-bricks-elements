<?php
/**
 * Plugin Name: H-Bricks-Elements
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
			__DIR__ . '/elements/booking/class.booking.php',
		);

		foreach ( $element_files as $file ) {
			\Bricks\Elements::register_element( $file );
		}
	},
	11
);

add_action(
	'admin_menu',
	function () {
		add_menu_page(
			'H-Bricks Elements',
			'H-Bricks Elements',
			'manage_options',
			'h-bricks-elements',
			'h_bricks_render_admin',
			'dashicons-layout',
			80
		);
	}
);

/**
 * Renders the admin page root element for the React app.
 *
 * @return void
 */
function h_bricks_render_admin() {
	echo '<div id="h-bricks-admin-root"></div>';
}

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( 'toplevel_page_h-bricks-elements' !== $hook ) {
			return;
		}

		$plugin_root_url  = plugin_dir_url( __FILE__ );
		$plugin_root_path = plugin_dir_path( __FILE__ );
		$theme            = get_user_meta( get_current_user_id(), 'wp_react_ui_theme', true );
		if ( ! $theme ) {
			$theme = 'light';
		}

		$css_path = $plugin_root_path . 'dist/settings.css';
		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'h-bricks-settings',
				$plugin_root_url . 'dist/settings.css',
				array(),
				filemtime( $css_path )
			);
		}

		wp_enqueue_script(
			'h-bricks-settings',
			$plugin_root_url . 'dist/settings.js',
			array(),
			filemtime( $plugin_root_path . 'dist/settings.js' ),
			true
		);

		wp_add_inline_script(
			'h-bricks-settings',
			'(function(){var t=' . wp_json_encode( $theme ) . ';try{var st=localStorage.getItem("wp-react-ui-theme");if(st==="dark"||st==="light"){t=st;}}catch(e){}window.hBricksAdmin={theme:t};document.body.setAttribute("data-theme",t);document.body.classList.toggle("wp-react-dark",t==="dark");var root=document.getElementById("h-bricks-admin-root");if(root){root.setAttribute("data-theme",t);}})();',
			'before'
		);

		// phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- inline style has no version.
		wp_register_style( 'h-bricks-admin-page', false );
		wp_enqueue_style( 'h-bricks-admin-page' );
		wp_add_inline_style(
			'h-bricks-admin-page',
			'#wpbody { height: 100% }
			#wpcontent { padding: 0 !important; }
			#wpbody-content { padding-bottom: 0 !important; height: 100%; }'
		);
	}
);

add_filter(
	'script_loader_tag',
	function ( $tag, $handle, $src ) {
		if ( 'h-bricks-settings' !== $handle ) {
			return $tag;
		}
		// Enqueued via wp_enqueue_script() above — type="module" added here via filter.
		// phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript
		return '<script type="module" src="' . esc_url( $src ) . '"></script>';
	},
	10,
	3
);
