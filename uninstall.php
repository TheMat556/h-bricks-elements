<?php
/**
 * Uninstall routine for H-Bricks Booking.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

$calendar_ids = get_posts(
	array(
		'post_type'      => 'hbe_calendar',
		'post_status'    => 'any',
		'numberposts'    => -1,
		'fields'         => 'ids',
		'suppress_filters' => false,
	)
);

foreach ( $calendar_ids as $calendar_id ) {
	wp_delete_post( $calendar_id, true );
}

$service_ids = get_posts(
	array(
		'post_type'      => 'hbe_service',
		'post_status'    => 'any',
		'numberposts'    => -1,
		'fields'         => 'ids',
		'suppress_filters' => false,
	)
);

foreach ( $service_ids as $service_id ) {
	wp_delete_post( $service_id, true );
}

$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}hbe_bookings" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

delete_option( 'hbe_db_version' );
wp_cache_flush();
