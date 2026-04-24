<?php
/**
 * PHPUnit bootstrap for H-Bricks-Elements.
 *
 * Stubs WordPress globals and functions so unit tests can run without a full WP install.
 */

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'HBE_PLUGIN_FILE', ABSPATH . 'plugin.php' );
define( 'HBE_PLUGIN_DIR', ABSPATH );
define( 'HBE_PLUGIN_URL', 'http://example.com/wp-content/plugins/h-bricks-elements/' );
define( 'HBE_VERSION', '0.0.1' );

// ------------------------------------------------------------------
// Minimal WP_Error
// ------------------------------------------------------------------
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public $errors = array();
		public $error_data = array();

		public function __construct( $code = '', $message = '', $data = '' ) {
			if ( ! empty( $code ) ) {
				$this->errors[ $code ] = array( $message );
				$this->error_data[ $code ] = $data;
			}
		}

		public function get_error_message( $code = '' ) {
			if ( empty( $code ) ) {
				$code = $this->get_error_code();
			}
			if ( isset( $this->errors[ $code ] ) ) {
				return $this->errors[ $code ][0];
			}
			return '';
		}

		public function get_error_code() {
			return array_key_first( $this->errors ) ?: '';
		}
	}
}

// ------------------------------------------------------------------
// Common WordPress helpers
// ------------------------------------------------------------------
if ( ! function_exists( 'is_wp_error' ) ) {
function is_wp_error( $thing ) {
	return $thing instanceof WP_Error;
}
}

if ( ! function_exists( 'wp_parse_args' ) ) {
function wp_parse_args( $args, $defaults = array() ) {
	if ( is_object( $args ) ) {
		$args = get_object_vars( $args );
	}
	return array_merge( (array) $defaults, (array) $args );
}
}

if ( ! function_exists( 'wp_unslash' ) ) {
function wp_unslash( $value ) {
	return stripslashes( is_string( $value ) ? $value : ( is_array( $value ) ? array_map( 'wp_unslash', $value ) : $value ) );
}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
function sanitize_text_field( $str ) {
	return strip_tags( trim( (string) $str ) );
}
}

if ( ! function_exists( 'sanitize_email' ) ) {
function sanitize_email( $email ) {
	return filter_var( trim( (string) $email ), FILTER_SANITIZE_EMAIL );
}
}

if ( ! function_exists( 'sanitize_title' ) ) {
function sanitize_title( $title ) {
	return sanitize_text_field( $title );
}
}

if ( ! function_exists( 'sanitize_key' ) ) {
function sanitize_key( $key ) {
	return preg_replace( '/[^a-z0-9_-]/', '', strtolower( (string) $key ) );
}
}

if ( ! function_exists( '__' ) ) {
function __( $text, $domain = 'default' ) {
	return $text;
}
}

if ( ! function_exists( 'absint' ) ) {
function absint( $maybeint ) {
	return abs( (int) $maybeint );
}
}

if ( ! defined( 'ARRAY_A' ) ) {
	define( 'ARRAY_A', 'ARRAY_A' );
}
if ( ! defined( 'OBJECT' ) ) {
	define( 'OBJECT', 'OBJECT' );
}
if ( ! defined( 'ARRAY_N' ) ) {
	define( 'ARRAY_N', 'ARRAY_N' );
}

if ( ! function_exists( 'apply_filters' ) ) {
function apply_filters( $tag, $value ) {
	return $value;
}
}

if ( ! function_exists( 'do_action' ) ) {
function do_action( $tag, ...$args ) {
	// no-op
}
}

if ( ! function_exists( 'wp_salt' ) ) {
function wp_salt( $scheme = 'auth' ) {
	return 'test-salt-' . $scheme;
}
}

if ( ! function_exists( 'wp_create_nonce' ) ) {
function wp_create_nonce( $action = -1 ) {
	return hash_hmac( 'md5', $action . wp_salt( 'nonce' ), wp_salt( 'nonce' ) );
}
}

if ( ! function_exists( 'wp_verify_nonce' ) ) {
function wp_verify_nonce( $nonce, $action = -1 ) {
	return hash_equals( wp_create_nonce( $action ), $nonce );
}
}

if ( ! function_exists( 'wp_die' ) ) {
function wp_die( $message = '', $title = '', $args = array() ) {
	throw new \Exception( (string) $message );
}
}

if ( ! function_exists( 'home_url' ) ) {
function home_url( $path = '' ) {
	return 'http://example.com' . $path;
}
}

if ( ! function_exists( 'add_query_arg' ) ) {
function add_query_arg( $args, $url = '' ) {
	if ( func_num_args() === 3 ) {
		$key   = $args;
		$value = $url;
		$url   = func_get_arg( 2 );
		$args  = array( $key => $value );
	}
	if ( ! is_array( $args ) ) {
		$args = array( $args => $url );
		$url  = '';
	}
	$sep = strpos( $url, '?' ) === false ? '?' : '&';
	return $url . $sep . http_build_query( $args );
}
}

if ( ! function_exists( 'wp_nonce_field' ) ) {
function wp_nonce_field( $action = -1, $name = '_wpnonce', $referer = true, $echo = true ) {
	$nonce = wp_create_nonce( $action );
	$html  = '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . esc_attr( $nonce ) . '" />';
	if ( $referer ) {
		$html .= '<input type="hidden" name="_wp_http_referer" value="/" />';
	}
	if ( $echo ) {
		echo $html;
	}
	return $html;
}
}

if ( ! function_exists( 'esc_attr' ) ) {
function esc_attr( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}
}

if ( ! function_exists( 'esc_html' ) ) {
function esc_html( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}
}

if ( ! function_exists( 'esc_url' ) ) {
function esc_url( $url ) {
	return filter_var( (string) $url, FILTER_SANITIZE_URL );
}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
function esc_url_raw( $url ) {
	return esc_url( $url );
}
}

if ( ! function_exists( 'wp_kses_post' ) ) {
function wp_kses_post( $data ) {
	return strip_tags( (string) $data, '<p><br><a><strong><em><ul><ol><li><h1><h2><h3><h4><h5><h6>' );
}
}

if ( ! function_exists( 'wp_date' ) ) {
function wp_date( $format, $timestamp = null, $timezone = null ) {
	$ts = $timestamp ?: time();
	return gmdate( $format, $ts );
}
}

if ( ! function_exists( 'wp_timezone' ) ) {
function wp_timezone() {
	return new \DateTimeZone( 'UTC' );
}
}

if ( ! function_exists( 'get_option' ) ) {
function get_option( $option, $default = false ) {
	return $default;
}
}

if ( ! function_exists( 'update_option' ) ) {
function update_option( $option, $value, $autoload = null ) {
	return true;
}
}

if ( ! function_exists( 'get_custom_logo' ) ) {
function get_custom_logo( $blog_id = 0 ) {
	return '';
}
}

if ( ! function_exists( 'get_site_icon_url' ) ) {
function get_site_icon_url( $size = 32, $url = '', $blog_id = 0 ) {
	return $url;
}
}

if ( ! function_exists( 'wp_get_attachment_image_src' ) ) {
function wp_get_attachment_image_src( $attachment_id, $size = 'thumbnail', $icon = false ) {
	return false;
}
}

if ( ! function_exists( 'plugin_dir_path' ) ) {
function plugin_dir_path( $file ) {
	return dirname( $file ) . '/';
}
}

if ( ! function_exists( 'plugin_dir_url' ) ) {
function plugin_dir_url( $file ) {
	return 'http://example.com/wp-content/plugins/' . basename( dirname( $file ) ) . '/';
}
}

if ( ! function_exists( 'register_activation_hook' ) ) {
function register_activation_hook( $file, $callback ) {
	// no-op in tests
}
}

if ( ! function_exists( 'add_action' ) ) {
function add_action( $tag, $callback, $priority = 10, $accepted_args = 1 ) {
	// no-op
}
}

if ( ! function_exists( 'add_filter' ) ) {
function add_filter( $tag, $callback, $priority = 10, $accepted_args = 1 ) {
	// no-op
}
}

if ( ! function_exists( 'is_user_logged_in' ) ) {
function is_user_logged_in() {
	return false;
}
}

if ( ! function_exists( 'current_user_can' ) ) {
function current_user_can( $capability ) {
	return false;
}
}

if ( ! function_exists( 'get_current_user_id' ) ) {
function get_current_user_id() {
	return 0;
}
}

if ( ! function_exists( 'wp_enqueue_script' ) ) {
function wp_enqueue_script( $handle, $src = '', $deps = array(), $ver = false, $in_footer = false ) {
	// no-op
}
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
function wp_enqueue_style( $handle, $src = '', $deps = array(), $ver = false, $media = 'all' ) {
	// no-op
}
}

if ( ! function_exists( 'wp_localize_script' ) ) {
function wp_localize_script( $handle, $object_name, $l10n ) {
	// no-op
}
}

if ( ! function_exists( 'admin_url' ) ) {
function admin_url( $path = '', $scheme = 'admin' ) {
	return 'http://example.com/wp-admin/' . $path;
}
}

if ( ! function_exists( 'get_rest_url' ) ) {
function get_rest_url( $blog_id = null, $path = '/', $scheme = 'rest' ) {
	return 'http://example.com/wp-json' . $path;
}
}

if ( ! function_exists( 'get_post_type' ) ) {
function get_post_type( $post = null ) {
	return 'post';
}
}

if ( ! function_exists( 'get_post' ) ) {
function get_post( $post = null, $output = OBJECT, $filter = 'raw' ) {
	return null;
}
}

if ( ! function_exists( 'wp_insert_post' ) ) {
function wp_insert_post( $postarr, $wp_error = false, $fire_after_hooks = true ) {
	return 1;
}
}

if ( ! function_exists( 'wp_delete_post' ) ) {
function wp_delete_post( $postid, $force_delete = false ) {
	return true;
}
}

if ( ! function_exists( 'update_post_meta' ) ) {
function update_post_meta( $post_id, $meta_key, $meta_value ) {
	return true;
}
}

if ( ! function_exists( 'get_post_meta' ) ) {
function get_post_meta( $post_id, $key = '', $single = false ) {
	return $single ? '' : array();
}
}

if ( ! function_exists( 'delete_post_meta' ) ) {
function delete_post_meta( $post_id, $meta_key, $meta_value = '' ) {
	return true;
}
}

if ( ! function_exists( 'flush_rewrite_rules' ) ) {
function flush_rewrite_rules( $hard = true ) {
	// no-op
}
}

if ( ! function_exists( 'dbDelta' ) ) {
function dbDelta( $queries = '', $execute = true ) {
	// no-op
}
}

if ( ! function_exists( 'register_post_type' ) ) {
function register_post_type( $post_type, $args = array() ) {
	// no-op
}
}

if ( ! function_exists( 'add_menu_page' ) ) {
function add_menu_page( $page_title, $menu_title, $capability, $menu_slug, $callback = '', $icon_url = '', $position = null ) {
	return 'toplevel_page_' . $menu_slug;
}
}

if ( ! function_exists( 'add_submenu_page' ) ) {
function add_submenu_page( $parent_slug, $page_title, $menu_title, $capability, $menu_slug, $callback = '', $position = null ) {
	return $menu_slug;
}
}

if ( ! function_exists( 'wp_mail' ) ) {
function wp_mail( $to, $subject, $message, $headers = '', $attachments = array() ) {
	return true;
}

}

if ( ! function_exists( 'is_email' ) ) {
function is_email( $email ) {
	return filter_var( trim( (string) $email ), FILTER_VALIDATE_EMAIL ) !== false;
}
}

if ( ! function_exists( 'get_bloginfo' ) ) {
function get_bloginfo( $show = "" ) {
	return "name" === $show ? "Test Site" : "en-US";
}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
function wp_json_encode( $data ) {
	return json_encode( $data );
}
}

if ( ! function_exists( 'status_header' ) ) {
function status_header( $code ) {
	// no-op in tests
}
}

if ( ! function_exists( 'get_theme_mod' ) ) {
function get_theme_mod( $name ) {
	return 0;
}
}

if ( ! function_exists( 'wp_get_attachment_image_url' ) ) {
function wp_get_attachment_image_url( $attachment_id, $size = "thumbnail", $icon = false ) {
	return false;
}
}

// ------------------------------------------------------------------
// Mock $wpdb
// ------------------------------------------------------------------
if ( ! isset( $GLOBALS['wpdb'] ) && ! class_exists( 'MockWpdb', false ) ) {
	class MockWpdb {
		public $prefix = 'wp_';
		public $last_error = '';
		public $insert_id = 1;
		public $rows_affected = 1;
		public $tables = array();

		public function get_results( $query = null, $output = OBJECT ) {
			return array();
		}

		public function get_var( $query = null, $x = 0, $y = 0 ) {
			return null;
		}

		public function get_col( $query = null, $x = 0 ) {
			return array();
		}

		public function prepare( $query, ...$args ) {
			$count = substr_count( $query, '%s' ) + substr_count( $query, '%d' ) + substr_count( $query, '%f' );
			if ( $count === count( $args ) ) {
				// Naive sprintf replacement for tests
				$query = str_replace( "'%s'", '%s', $query );
				$query = str_replace( '%s', "'%s'", $query );
				return vsprintf( $query, $args );
			}
			return $query;
		}

		public function insert( $table, $data, $format = null ) {
			++$this->insert_id;
			$this->rows_affected = 1;
			return 1;
		}

		public function update( $table, $data, $where, $format = null, $where_format = null ) {
			$this->rows_affected = 1;
			return 1;
		}

		public function delete( $table, $where, $where_format = null ) {
			$this->rows_affected = 1;
			return 1;
		}

		public function query( $query ) {
			return 0;
		}
	}

	$GLOBALS['wpdb'] = new MockWpdb();
}

// ------------------------------------------------------------------
// Load plugin classes in dependency order
// ------------------------------------------------------------------
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-calendar-post-type.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-booking-mail.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-calendar-settings.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-bookings-table.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-bookings.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-admin.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-rest.php';
require_once HBE_PLUGIN_DIR . 'includes/class-hbe-plugin.php';
