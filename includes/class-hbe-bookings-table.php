<?php
/**
 * Booking table management.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Creates and references the bookings table.
 */
class HBE_Bookings_Table {

	/**
	 * Returns the table name.
	 *
	 * @return string
	 */
	public static function get_name(): string {
		global $wpdb;

		return $wpdb->prefix . 'hbe_bookings';
	}

	/**
	 * Creates or updates the bookings table.
	 *
	 * @return void
	 */
	public static function maybe_create(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table_name      = self::get_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			calendar_id bigint(20) unsigned NOT NULL,
			service_id varchar(100) NOT NULL DEFAULT '',
			status varchar(20) NOT NULL DEFAULT 'confirmed',
			customer_name varchar(190) NOT NULL DEFAULT '',
			customer_email varchar(190) NOT NULL DEFAULT '',
			customer_phone varchar(50) NOT NULL DEFAULT '',
			customer_notes longtext NULL,
			start_datetime datetime NOT NULL,
			end_datetime datetime NOT NULL,
			timezone varchar(100) NOT NULL DEFAULT 'UTC',
			meta longtext NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY calendar_id (calendar_id),
			KEY start_datetime (start_datetime),
			KEY end_datetime (end_datetime),
			KEY status (status),
			UNIQUE KEY unique_booking_slot (calendar_id, start_datetime, end_datetime)
		) {$charset_collate};";

		dbDelta( $sql );
	}
}
