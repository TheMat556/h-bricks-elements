<?php
/**
 * Booking repository and validation helpers.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles CRUD operations for persisted bookings.
 */
class HBE_Bookings {

	/**
	 * Returns bookings for one calendar, optionally filtered by overlapping range.
	 *
	 * @param int         $calendar_id Calendar ID.
	 * @param string|null $start_iso   Optional start ISO timestamp.
	 * @param string|null $end_iso     Optional end ISO timestamp.
	 * @return array<int,array<string,mixed>>|WP_Error
	 */
	public static function list_for_calendar( int $calendar_id, ?string $start_iso = null, ?string $end_iso = null ) {
		global $wpdb;

		$table_name = HBE_Bookings_Table::get_name();
		$query      = "SELECT * FROM {$table_name} WHERE calendar_id = %d";
		$params     = array( $calendar_id );

		if ( null !== $start_iso && null !== $end_iso ) {
			$start_datetime = self::parse_request_datetime( $start_iso );
			$end_datetime   = self::parse_request_datetime( $end_iso );

			if ( ! $start_datetime || ! $end_datetime ) {
				return new WP_Error(
					'hbe_booking_invalid_range',
					__( 'Booking range is invalid.', 'h-bricks-elements' ),
					array( 'status' => 400 )
				);
			}

			$query   .= ' AND start_datetime < %s AND end_datetime > %s';
			$params[] = $end_datetime;
			$params[] = $start_datetime;
		}

		$query .= ' ORDER BY start_datetime ASC';

		$results = $wpdb->get_results( $wpdb->prepare( $query, $params ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( ! is_array( $results ) ) {
			return array();
		}

		return array_map( array( __CLASS__, 'format_row' ), $results );
	}

	/**
	 * Creates a booking.
	 *
	 * @param int                $calendar_id Calendar ID.
	 * @param array<string,mixed> $payload    Raw booking payload.
	 * @return array<string,mixed>|WP_Error
	 */
	public static function create( int $calendar_id, array $payload ) {
		global $wpdb;

		$prepared = self::prepare_payload( $payload );
		$settings = HBE_Calendar_Settings::get( $calendar_id );

		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}

		if (
			empty( $settings['allowDoubleBookings'] ) &&
			self::has_conflict( $calendar_id, $prepared['start_datetime'], $prepared['end_datetime'] )
		) {
			return new WP_Error(
				'hbe_booking_conflict',
				__( 'This timeslot is already booked.', 'h-bricks-elements' ),
				array( 'status' => 409 )
			);
		}

		$inserted = $wpdb->insert(
			HBE_Bookings_Table::get_name(),
			array(
				'calendar_id'     => $calendar_id,
				'service_id'      => $prepared['service_id'],
				'status'          => $prepared['status'],
				'customer_name'   => $prepared['customer_name'],
				'customer_email'  => $prepared['customer_email'],
				'customer_phone'  => $prepared['customer_phone'],
				'customer_notes'  => $prepared['customer_notes'],
				'start_datetime'  => $prepared['start_datetime'],
				'end_datetime'    => $prepared['end_datetime'],
				'timezone'        => $prepared['timezone'],
				'meta'            => $prepared['meta'],
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		if ( false === $inserted ) {
			return new WP_Error(
				'hbe_booking_create_failed',
				__( 'Booking could not be created.', 'h-bricks-elements' ),
				array( 'status' => 500 )
			);
		}

		$booking = self::get_raw( (int) $wpdb->insert_id, $calendar_id );

		if ( ! $booking ) {
			return new WP_Error(
				'hbe_booking_not_found',
				__( 'Booking not found.', 'h-bricks-elements' ),
				array( 'status' => 404 )
			);
		}

		return self::format_row( $booking );
	}

	/**
	 * Updates a booking.
	 *
	 * @param int                $calendar_id Calendar ID.
	 * @param int                $booking_id  Booking ID.
	 * @param array<string,mixed> $payload    Raw booking payload.
	 * @return array<string,mixed>|WP_Error
	 */
	public static function update( int $calendar_id, int $booking_id, array $payload ) {
		global $wpdb;

		$existing = self::get_raw( $booking_id, $calendar_id );
		$settings = HBE_Calendar_Settings::get( $calendar_id );

		if ( ! $existing ) {
			return new WP_Error(
				'hbe_booking_not_found',
				__( 'Booking not found.', 'h-bricks-elements' ),
				array( 'status' => 404 )
			);
		}

		$prepared = self::prepare_payload( $payload, $existing );

		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}

		if (
			empty( $settings['allowDoubleBookings'] ) &&
			self::has_conflict( $calendar_id, $prepared['start_datetime'], $prepared['end_datetime'], $booking_id )
		) {
			return new WP_Error(
				'hbe_booking_conflict',
				__( 'This timeslot is already booked.', 'h-bricks-elements' ),
				array( 'status' => 409 )
			);
		}

		$updated = $wpdb->update(
			HBE_Bookings_Table::get_name(),
			array(
				'service_id'      => $prepared['service_id'],
				'status'          => $prepared['status'],
				'customer_name'   => $prepared['customer_name'],
				'customer_email'  => $prepared['customer_email'],
				'customer_phone'  => $prepared['customer_phone'],
				'customer_notes'  => $prepared['customer_notes'],
				'start_datetime'  => $prepared['start_datetime'],
				'end_datetime'    => $prepared['end_datetime'],
				'timezone'        => $prepared['timezone'],
				'meta'            => $prepared['meta'],
			),
			array(
				'id'          => $booking_id,
				'calendar_id' => $calendar_id,
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ),
			array( '%d', '%d' )
		);

		if ( false === $updated ) {
			return new WP_Error(
				'hbe_booking_update_failed',
				__( 'Booking could not be updated.', 'h-bricks-elements' ),
				array( 'status' => 500 )
			);
		}

		$booking = self::get_raw( $booking_id, $calendar_id );

		if ( ! $booking ) {
			return new WP_Error(
				'hbe_booking_not_found',
				__( 'Booking not found.', 'h-bricks-elements' ),
				array( 'status' => 404 )
			);
		}

		return self::format_row( $booking );
	}

	/**
	 * Deletes a booking.
	 *
	 * @param int $calendar_id Calendar ID.
	 * @param int $booking_id  Booking ID.
	 * @return bool|WP_Error
	 */
	public static function delete( int $calendar_id, int $booking_id ) {
		global $wpdb;

		$existing = self::get_raw( $booking_id, $calendar_id );

		if ( ! $existing ) {
			return new WP_Error(
				'hbe_booking_not_found',
				__( 'Booking not found.', 'h-bricks-elements' ),
				array( 'status' => 404 )
			);
		}

		$deleted = $wpdb->delete(
			HBE_Bookings_Table::get_name(),
			array(
				'id'          => $booking_id,
				'calendar_id' => $calendar_id,
			),
			array( '%d', '%d' )
		);

		if ( false === $deleted ) {
			return new WP_Error(
				'hbe_booking_delete_failed',
				__( 'Booking could not be deleted.', 'h-bricks-elements' ),
				array( 'status' => 500 )
			);
		}

		return true;
	}

	/**
	 * Returns one raw booking row.
	 *
	 * @param int $booking_id  Booking ID.
	 * @param int $calendar_id Optional calendar filter.
	 * @return array<string,mixed>|null
	 */
	private static function get_raw( int $booking_id, int $calendar_id = 0 ): ?array {
		global $wpdb;

		$table_name = HBE_Bookings_Table::get_name();

		if ( $calendar_id > 0 ) {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$table_name} WHERE id = %d AND calendar_id = %d LIMIT 1",
					$booking_id,
					$calendar_id
				),
				ARRAY_A
			); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		} else {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$table_name} WHERE id = %d LIMIT 1",
					$booking_id
				),
				ARRAY_A
			); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Prepares and validates booking payload data.
	 *
	 * @param array<string,mixed>      $payload  Raw request payload.
	 * @param array<string,mixed>|null $existing Existing row for updates.
	 * @return array<string,string>|WP_Error
	 */
	private static function prepare_payload( array $payload, ?array $existing = null ) {
		$title = isset( $payload['title'] )
			? sanitize_text_field( (string) $payload['title'] )
			: (string) ( $existing['customer_name'] ?? '' );

		if ( '' === trim( $title ) ) {
			return new WP_Error(
				'hbe_booking_title_required',
				__( 'Booking name is required.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$start_datetime = isset( $payload['start'] )
			? self::parse_request_datetime( (string) $payload['start'] )
			: (string) ( $existing['start_datetime'] ?? '' );
		$end_datetime   = isset( $payload['end'] )
			? self::parse_request_datetime( (string) $payload['end'] )
			: (string) ( $existing['end_datetime'] ?? '' );

		if ( ! $start_datetime || ! $end_datetime ) {
			return new WP_Error(
				'hbe_booking_datetime_invalid',
				__( 'Booking start and end are required.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		if ( $start_datetime >= $end_datetime ) {
			return new WP_Error(
				'hbe_booking_datetime_order',
				__( 'Booking end must be after booking start.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$status = isset( $payload['status'] )
			? sanitize_key( (string) $payload['status'] )
			: (string) ( $existing['status'] ?? 'confirmed' );

		if ( ! in_array( $status, array( 'confirmed', 'pending', 'cancelled' ), true ) ) {
			$status = 'confirmed';
		}

		$timezone = isset( $payload['timezone'] )
			? sanitize_text_field( (string) $payload['timezone'] )
			: (string) ( $existing['timezone'] ?? 'UTC' );

		if ( '' === $timezone ) {
			$timezone = 'UTC';
		}

		return array(
			'service_id'     => isset( $payload['serviceId'] )
				? sanitize_key( (string) $payload['serviceId'] )
				: (string) ( $existing['service_id'] ?? '' ),
			'status'         => $status,
			'customer_name'  => $title,
			'customer_email' => isset( $payload['customerEmail'] )
				? sanitize_email( (string) $payload['customerEmail'] )
				: (string) ( $existing['customer_email'] ?? '' ),
			'customer_phone' => isset( $payload['customerPhone'] )
				? sanitize_text_field( (string) $payload['customerPhone'] )
				: (string) ( $existing['customer_phone'] ?? '' ),
			'customer_notes' => isset( $payload['description'] )
				? sanitize_textarea_field( (string) $payload['description'] )
				: (string) ( $existing['customer_notes'] ?? '' ),
			'start_datetime' => $start_datetime,
			'end_datetime'   => $end_datetime,
			'timezone'       => $timezone,
			'meta'           => isset( $payload['meta'] )
				? wp_json_encode( $payload['meta'] )
				: (string) ( $existing['meta'] ?? '' ),
		);
	}

	/**
	 * Checks whether a booking overlaps an existing booking.
	 *
	 * @param int    $calendar_id     Calendar ID.
	 * @param string $start_datetime  New booking start in UTC mysql format.
	 * @param string $end_datetime    New booking end in UTC mysql format.
	 * @param int    $exclude_booking Booking ID to exclude.
	 * @return bool
	 */
	private static function has_conflict(
		int $calendar_id,
		string $start_datetime,
		string $end_datetime,
		int $exclude_booking = 0
	): bool {
		global $wpdb;

		$table_name = HBE_Bookings_Table::get_name();

		if ( $exclude_booking > 0 ) {
			$count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$table_name}
					WHERE calendar_id = %d
					AND status != %s
					AND id != %d
					AND start_datetime < %s
					AND end_datetime > %s",
					$calendar_id,
					'cancelled',
					$exclude_booking,
					$end_datetime,
					$start_datetime
				)
			); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		} else {
			$count = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$table_name}
					WHERE calendar_id = %d
					AND status != %s
					AND start_datetime < %s
					AND end_datetime > %s",
					$calendar_id,
					'cancelled',
					$end_datetime,
					$start_datetime
				)
			); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}

		return (int) $count > 0;
	}

	/**
	 * Parses a request datetime into UTC mysql format.
	 *
	 * @param string $value Raw datetime string.
	 * @return string|null
	 */
	private static function parse_request_datetime( string $value ): ?string {
		$value = trim( $value );

		if ( '' === $value ) {
			return null;
		}

		$timestamp = strtotime( $value );

		if ( false === $timestamp ) {
			return null;
		}

		return gmdate( 'Y-m-d H:i:s', $timestamp );
	}

	/**
	 * Formats a raw booking row for REST responses.
	 *
	 * @param array<string,mixed> $row Raw DB row.
	 * @return array<string,mixed>
	 */
	private static function format_row( array $row ): array {
		return array(
			'id'            => (int) $row['id'],
			'calendarId'    => (int) $row['calendar_id'],
			'serviceId'     => (string) $row['service_id'],
			'status'        => (string) $row['status'],
			'title'         => (string) $row['customer_name'],
			'description'   => (string) ( $row['customer_notes'] ?? '' ),
			'customerName'  => (string) $row['customer_name'],
			'customerEmail' => (string) $row['customer_email'],
			'customerPhone' => (string) $row['customer_phone'],
			'start'         => self::mysql_to_iso( (string) $row['start_datetime'] ),
			'end'           => self::mysql_to_iso( (string) $row['end_datetime'] ),
			'timezone'      => (string) $row['timezone'],
			'createdAt'     => self::mysql_to_iso( (string) $row['created_at'] ),
			'updatedAt'     => self::mysql_to_iso( (string) $row['updated_at'] ),
		);
	}

	/**
	 * Converts a UTC mysql datetime string to ISO 8601.
	 *
	 * @param string $datetime Mysql datetime.
	 * @return string
	 */
	private static function mysql_to_iso( string $datetime ): string {
		$timestamp = strtotime( $datetime . ' UTC' );

		if ( false === $timestamp ) {
			return '';
		}

		return gmdate( 'c', $timestamp );
	}
}
