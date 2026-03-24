<?php
/**
 * Calendar post type registration.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the booking calendar post type.
 */
class HBE_Calendar_Post_Type {

	/**
	 * Post type slug.
	 *
	 * @var string
	 */
	const POST_TYPE = 'hbe_calendar';

	/**
	 * Registers hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
	}

	/**
	 * Registers the calendar post type.
	 *
	 * @return void
	 */
	public static function register_post_type(): void {
		$labels = array(
			'name'               => __( 'Calendars', 'h-bricks-elements' ),
			'singular_name'      => __( 'Calendar', 'h-bricks-elements' ),
			'add_new'            => __( 'Add Calendar', 'h-bricks-elements' ),
			'add_new_item'       => __( 'Add New Calendar', 'h-bricks-elements' ),
			'edit_item'          => __( 'Edit Calendar', 'h-bricks-elements' ),
			'new_item'           => __( 'New Calendar', 'h-bricks-elements' ),
			'view_item'          => __( 'View Calendar', 'h-bricks-elements' ),
			'search_items'       => __( 'Search Calendars', 'h-bricks-elements' ),
			'not_found'          => __( 'No calendars found.', 'h-bricks-elements' ),
			'not_found_in_trash' => __( 'No calendars found in Trash.', 'h-bricks-elements' ),
			'menu_name'          => __( 'Calendars', 'h-bricks-elements' ),
		);

		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => $labels,
				'public'              => false,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'supports'            => array( 'title' ),
				'capability_type'     => 'post',
				'map_meta_cap'        => true,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_in_rest'        => false,
			)
		);
	}

	/**
	 * Returns a normalized list of calendars for the admin app.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public static function get_admin_items(): array {
		$posts = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);

		return array_map(
			static function ( WP_Post $post ): array {
				$settings = HBE_Calendar_Settings::get( (int) $post->ID );

				return array(
					'id'    => $post->ID,
					'title' => $post->post_title,
					'slug'  => $post->post_name,
					'icon'  => isset( $settings['icon'] ) ? (string) $settings['icon'] : '',
				);
			},
			$posts
		);
	}
}
