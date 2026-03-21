<?php
/**
 * Database setup for H-Bricks Booking.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles plugin table creation and upgrades.
 */
class HBE_DB_Manager {

	/**
	 * Schema version.
	 *
	 * @var string
	 */
	const DB_VERSION = '1.0.0';

	/**
	 * Runs activation tasks.
	 *
	 * @return void
	 */
	public static function activate() {
		self::create_table();
		flush_rewrite_rules();
	}

	/**
	 * Creates or upgrades the bookings table.
	 *
	 * @return void
	 */
	public static function create_table() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table_name      = $wpdb->prefix . 'hbe_bookings';
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			calendar_id BIGINT UNSIGNED NOT NULL,
			service_id BIGINT UNSIGNED DEFAULT NULL,
			date DATE NOT NULL,
			time_start TIME NOT NULL,
			time_end TIME NOT NULL,
			customer_name VARCHAR(255) NOT NULL,
			customer_email VARCHAR(255) NOT NULL,
			customer_phone VARCHAR(50) DEFAULT '',
			customer_notes TEXT DEFAULT '',
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			source VARCHAR(20) NOT NULL DEFAULT 'frontend',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY idx_calendar_date (calendar_id, date),
			KEY idx_calendar_date_time (calendar_id, date, time_start, time_end),
			KEY idx_status (status),
			UNIQUE KEY idx_no_overlap (calendar_id, date, time_start)
		) {$charset_collate};";

		dbDelta( $sql );
		update_option( 'hbe_db_version', self::DB_VERSION );
	}
}
