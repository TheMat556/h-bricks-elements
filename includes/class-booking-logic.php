<?php
/**
 * Core booking domain logic.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Booking logic implementation.
 */
class HBE_Booking_Logic {

	/**
	 * Valid statuses.
	 *
	 * @var string[]
	 */
	private const VALID_STATUSES = array( 'pending', 'confirmed', 'cancelled', 'completed' );

	/**
	 * Valid sources.
	 *
	 * @var string[]
	 */
	private const VALID_SOURCES = array( 'frontend', 'admin' );

	/**
	 * Returns the bookings table name.
	 *
	 * @return string
	 */
	private static function get_table_name() {
		global $wpdb;

		return $wpdb->prefix . 'hbe_bookings';
	}

	/**
	 * Returns a valid calendar post or null.
	 *
	 * @param int $calendar_id Calendar ID.
	 * @return \WP_Post|null
	 */
	private static function get_calendar_post( $calendar_id ) {
		$calendar = get_post( $calendar_id );
		if ( ! $calendar || 'hbe_calendar' !== $calendar->post_type ) {
			return null;
		}

		return $calendar;
	}

	/**
	 * Returns a valid service post or null.
	 *
	 * @param int $service_id Service ID.
	 * @return \WP_Post|null
	 */
	private static function get_service_post( $service_id ) {
		$service = get_post( $service_id );
		if ( ! $service || 'hbe_service' !== $service->post_type ) {
			return null;
		}

		return $service;
	}

	/**
	 * Returns a timezone object from settings.
	 *
	 * @param array<string, mixed> $settings Calendar settings.
	 * @return \DateTimeZone
	 */
	private static function get_timezone( array $settings ) {
		try {
			return new DateTimeZone( (string) $settings['timezone'] );
		} catch ( Exception $exception ) {
			return new DateTimeZone( 'UTC' );
		}
	}

	/**
	 * Validates a Y-m-d date string.
	 *
	 * @param string $date Date string.
	 * @return bool
	 */
	private static function is_valid_date( $date ) {
		$date_time = DateTime::createFromFormat( 'Y-m-d', $date );
		return $date_time && $date_time->format( 'Y-m-d' ) === $date;
	}

	/**
	 * Parses HH:MM to minutes after midnight.
	 *
	 * @param string $time Time string.
	 * @return int|null
	 */
	private static function parse_time_to_minutes( $time ) {
		if ( ! preg_match( '/^\d{2}:\d{2}$/', $time ) ) {
			return null;
		}

		list( $hours, $minutes ) = array_map( 'intval', explode( ':', $time ) );

		if ( $hours < 0 || $hours > 23 || $minutes < 0 || $minutes > 59 ) {
			return null;
		}

		return ( $hours * 60 ) + $minutes;
	}

	/**
	 * Formats minutes as HH:MM.
	 *
	 * @param int $minutes Minutes after midnight.
	 * @return string
	 */
	private static function minutes_to_display_time( $minutes ) {
		$hours   = (int) floor( $minutes / 60 );
		$minutes = $minutes % 60;
		return sprintf( '%02d:%02d', $hours, $minutes );
	}

	/**
	 * Formats minutes as HH:MM:SS.
	 *
	 * @param int $minutes Minutes after midnight.
	 * @return string
	 */
	private static function minutes_to_db_time( $minutes ) {
		$hours   = (int) floor( $minutes / 60 );
		$minutes = $minutes % 60;
		return sprintf( '%02d:%02d:00', $hours, $minutes );
	}

	/**
	 * Normalizes a booking row for responses.
	 *
	 * @param object|array<string, mixed> $row DB row.
	 * @return array<string, mixed>
	 */
	private static function normalize_booking_row( $row ) {
		$booking = (array) $row;

		return array(
			'id'            => (int) $booking['id'],
			'calendarId'    => (int) $booking['calendar_id'],
			'serviceId'     => null !== $booking['service_id'] ? (int) $booking['service_id'] : null,
			'date'          => (string) $booking['date'],
			'timeStart'     => substr( (string) $booking['time_start'], 0, 5 ),
			'timeEnd'       => substr( (string) $booking['time_end'], 0, 5 ),
			'customerName'  => (string) $booking['customer_name'],
			'customerEmail' => (string) $booking['customer_email'],
			'customerPhone' => (string) $booking['customer_phone'],
			'customerNotes' => (string) $booking['customer_notes'],
			'status'        => (string) $booking['status'],
			'source'        => (string) $booking['source'],
			'createdAt'     => (string) $booking['created_at'],
			'updatedAt'     => (string) $booking['updated_at'],
		);
	}

	/**
	 * Returns available slots for a calendar/date pair.
	 *
	 * @param int    $calendar_id Calendar ID.
	 * @param string $date        Booking date.
	 * @return array<int, array<string, string>>
	 */
	public static function get_available_slots( $calendar_id, $date ) {
		$calendar_id = (int) $calendar_id;
		$date        = (string) $date;

		if ( ! self::is_valid_date( $date ) || ! self::get_calendar_post( $calendar_id ) ) {
			return array();
		}

		$settings = HBE_CPT_Manager::get_calendar_settings( $calendar_id );
		$timezone = self::get_timezone( $settings );
		$day_name = strtolower( wp_date( 'l', strtotime( $date ), $timezone ) );

		if ( ! isset( $settings['weekdays'][ $day_name ] ) ) {
			return array();
		}

		$day_config = $settings['weekdays'][ $day_name ];
		if ( empty( $day_config['enabled'] ) || in_array( $date, $settings['exceptionDays'], true ) ) {
			return array();
		}

		$start_minutes = self::parse_time_to_minutes( (string) $day_config['from'] );
		$end_minutes   = self::parse_time_to_minutes( (string) $day_config['to'] );

		if ( null === $start_minutes || null === $end_minutes || $end_minutes <= $start_minutes ) {
			return array();
		}

		$duration = max( 5, (int) $settings['slotDuration'] );
		$buffer   = max( 0, (int) $settings['slotBuffer'] );
		$step     = $duration + $buffer;
		$cursor   = $start_minutes;
		$slots    = array();

		while ( ( $cursor + $duration ) <= $end_minutes ) {
			$slots[] = array(
				'time_start' => self::minutes_to_display_time( $cursor ),
				'time_end'   => self::minutes_to_display_time( $cursor + $duration ),
			);

			$cursor += $step;
		}

		global $wpdb;

		$booked_times = $wpdb->get_col(
			$wpdb->prepare(
				'SELECT time_start FROM ' . self::get_table_name() . ' WHERE calendar_id = %d AND date = %s AND status IN ("pending", "confirmed")',
				$calendar_id,
				$date
			)
		);

		$booked_lookup = array();
		foreach ( $booked_times as $booked_time ) {
			$booked_lookup[ substr( (string) $booked_time, 0, 5 ) ] = true;
		}

		$now       = new DateTimeImmutable( 'now', $timezone );
		$lead_time = $now->modify( '+' . (int) $settings['leadTimeHours'] . ' hours' );

		$slots = array_values(
			array_filter(
				$slots,
				function ( $slot ) use ( $booked_lookup, $date, $lead_time, $timezone ) {
					if ( isset( $booked_lookup[ $slot['time_start'] ] ) ) {
						return false;
					}

					$slot_start = DateTimeImmutable::createFromFormat( 'Y-m-d H:i', $date . ' ' . $slot['time_start'], $timezone );
					return $slot_start && $slot_start >= $lead_time;
				}
			)
		);

		return apply_filters( 'hbe_available_slots', $slots, $calendar_id, $date );
	}

	/**
	 * Cached slot wrapper.
	 *
	 * @param int    $calendar_id Calendar ID.
	 * @param string $date        Date.
	 * @return array<int, array<string, string>>
	 */
	public static function get_available_slots_cached( $calendar_id, $date ) {
		$settings  = HBE_CPT_Manager::get_calendar_settings( (int) $calendar_id );
		$cache_key = 'hbe_slots_' . (int) $calendar_id . '_' . (string) $date . '_' . (string) $settings['configVersion'];
		$cached    = wp_cache_get( $cache_key, 'hbe' );

		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$slots = self::get_available_slots( $calendar_id, $date );
		wp_cache_set( $cache_key, $slots, 'hbe', 300 );
		return $slots;
	}

	/**
	 * Returns available dates for a month.
	 *
	 * @param int    $calendar_id Calendar ID.
	 * @param string $month       YYYY-MM string.
	 * @return array<int, string>
	 */
	public static function get_available_dates( $calendar_id, $month ) {
		$calendar_id = (int) $calendar_id;
		$month       = (string) $month;

		if ( ! preg_match( '/^\d{4}-\d{2}$/', $month ) ) {
			return array();
		}

		$settings  = HBE_CPT_Manager::get_calendar_settings( $calendar_id );
		$cache_key = 'hbe_available_dates_' . $calendar_id . '_' . $month . '_' . $settings['configVersion'];
		$cached    = get_transient( $cache_key );

		if ( is_array( $cached ) ) {
			return $cached;
		}

		$timezone   = self::get_timezone( $settings );
		$start_date = DateTimeImmutable::createFromFormat( 'Y-m-d', $month . '-01', $timezone );
		if ( ! $start_date ) {
			return array();
		}

		$end_date  = $start_date->modify( 'last day of this month' );
		$cursor    = $start_date;
		$available = array();

		while ( $cursor <= $end_date ) {
			$date_string = $cursor->format( 'Y-m-d' );
			if ( ! empty( self::get_available_slots_cached( $calendar_id, $date_string ) ) ) {
				$available[] = $date_string;
			}

			$cursor = $cursor->modify( '+1 day' );
		}

		set_transient( $cache_key, $available, 15 * MINUTE_IN_SECONDS );
		return $available;
	}

	/**
	 * Validates booking payloads.
	 *
	 * @param array<string, mixed> $data Raw booking data.
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function validate_booking_data( array $data ) {
		$required_fields = array( 'calendar_id', 'date', 'time_start', 'customer_name', 'customer_email' );

		foreach ( $required_fields as $field ) {
			if ( empty( $data[ $field ] ) ) {
				return new WP_Error( 'missing_field', sprintf( 'Missing required field: %s', $field ), array( 'status' => 400 ) );
			}
		}

		$data['calendar_id']    = absint( $data['calendar_id'] );
		$data['service_id']     = isset( $data['service_id'] ) ? absint( $data['service_id'] ) : 0;
		$data['date']           = sanitize_text_field( (string) $data['date'] );
		$data['time_start']     = sanitize_text_field( (string) $data['time_start'] );
		$data['customer_name']  = sanitize_text_field( (string) $data['customer_name'] );
		$data['customer_email'] = sanitize_email( (string) $data['customer_email'] );
		$data['customer_phone'] = isset( $data['customer_phone'] ) ? sanitize_text_field( (string) $data['customer_phone'] ) : '';
		$data['customer_notes'] = isset( $data['customer_notes'] ) ? sanitize_textarea_field( (string) $data['customer_notes'] ) : '';
		$data['source']         = ! empty( $data['source'] ) ? sanitize_key( (string) $data['source'] ) : 'frontend';
		$data['status']         = ! empty( $data['status'] ) ? sanitize_key( (string) $data['status'] ) : '';

		if ( ! is_email( (string) $data['customer_email'] ) ) {
			return new WP_Error( 'invalid_email', __( 'Invalid booking email address.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		if ( ! in_array( $data['source'], self::VALID_SOURCES, true ) ) {
			return new WP_Error( 'invalid_source', __( 'Invalid booking source.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		if ( $data['status'] && ! in_array( $data['status'], self::VALID_STATUSES, true ) ) {
			return new WP_Error( 'invalid_status', __( 'Invalid booking status.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		if ( ! self::is_valid_date( $data['date'] ) ) {
			return new WP_Error( 'invalid_date', __( 'Invalid booking date.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		if ( ! self::get_calendar_post( $data['calendar_id'] ) ) {
			return new WP_Error( 'invalid_calendar', __( 'Calendar not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
		}

		if ( $data['service_id'] ) {
			$service = self::get_service_post( $data['service_id'] );
			if ( ! $service ) {
				return new WP_Error( 'invalid_service', __( 'Service not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
			}

			if ( (int) get_post_meta( $data['service_id'], '_hbe_calendar_id', true ) !== $data['calendar_id'] ) {
				return new WP_Error( 'service_mismatch', __( 'Service does not belong to the selected calendar.', 'h-bricks-elements' ), array( 'status' => 400 ) );
			}
		}

		$settings      = HBE_CPT_Manager::get_calendar_settings( $data['calendar_id'] );
		$timezone      = self::get_timezone( $settings );
		$now           = new DateTimeImmutable( 'now', $timezone );
		$date_object   = DateTimeImmutable::createFromFormat( 'Y-m-d', $data['date'], $timezone );
		$latest_allowed = $now->setTime( 0, 0 )->modify( '+' . (int) $settings['bookingWindowDays'] . ' days' );

		if ( ! $date_object ) {
			return new WP_Error( 'invalid_date', __( 'Invalid booking date.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		if ( $date_object->setTime( 0, 0 ) > $latest_allowed ) {
			return new WP_Error( 'outside_booking_window', __( 'Selected date is outside the booking window.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		$available_slots = self::get_available_slots( $data['calendar_id'], $data['date'] );
		$selected_slot   = null;

		foreach ( $available_slots as $slot ) {
			if ( $slot['time_start'] === $data['time_start'] ) {
				$selected_slot = $slot;
				break;
			}
		}

		if ( ! $selected_slot ) {
			return new WP_Error( 'slot_taken', __( 'Selected slot is not available.', 'h-bricks-elements' ), array( 'status' => 409 ) );
		}

		$data['time_end'] = $selected_slot['time_end'];
		$data['status']   = $data['status'] ? $data['status'] : ( $settings['autoConfirm'] ? 'confirmed' : 'pending' );

		return $data;
	}

	/**
	 * Creates a booking record.
	 *
	 * @param array<string, mixed> $data Booking data.
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function create_booking( array $data ) {
		$validated = self::validate_booking_data( $data );
		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		$validated = apply_filters( 'hbe_booking_data_before_save', $validated );

		$start_minutes = self::parse_time_to_minutes( $validated['time_start'] );
		$end_minutes   = self::parse_time_to_minutes( $validated['time_end'] );

		global $wpdb;

		$inserted = $wpdb->insert(
			self::get_table_name(),
			array(
				'calendar_id'    => (int) $validated['calendar_id'],
				'service_id'     => $validated['service_id'] ? (int) $validated['service_id'] : null,
				'date'           => $validated['date'],
				'time_start'     => self::minutes_to_db_time( $start_minutes ),
				'time_end'       => self::minutes_to_db_time( $end_minutes ),
				'customer_name'  => $validated['customer_name'],
				'customer_email' => $validated['customer_email'],
				'customer_phone' => $validated['customer_phone'],
				'customer_notes' => $validated['customer_notes'],
				'status'         => $validated['status'],
				'source'         => $validated['source'],
			),
			array( '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);

		if ( false === $inserted ) {
			if ( false !== strpos( strtolower( (string) $wpdb->last_error ), 'duplicate' ) ) {
				return new WP_Error( 'slot_taken', __( 'Selected slot has already been booked.', 'h-bricks-elements' ), array( 'status' => 409 ) );
			}

			return new WP_Error( 'booking_insert_failed', __( 'Failed to create booking.', 'h-bricks-elements' ), array( 'status' => 500 ) );
		}

		$booking_id = (int) $wpdb->insert_id;
		do_action( 'hbe_booking_created', $booking_id, $validated );
		return self::get_booking( $booking_id );
	}

	/**
	 * Updates booking status.
	 *
	 * @param int    $booking_id Booking ID.
	 * @param string $new_status New status.
	 * @return true|\WP_Error
	 */
	public static function update_status( $booking_id, $new_status ) {
		if ( ! in_array( $new_status, self::VALID_STATUSES, true ) ) {
			return new WP_Error( 'invalid_status', __( 'Invalid booking status.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		$booking = self::get_booking( $booking_id );
		if ( ! $booking ) {
			return new WP_Error( 'booking_not_found', __( 'Booking not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
		}

		$transitions = array(
			'pending'   => array( 'confirmed', 'cancelled' ),
			'confirmed' => array( 'completed', 'cancelled' ),
			'cancelled' => array(),
			'completed' => array(),
		);

		if ( $new_status !== $booking['status'] && ! in_array( $new_status, $transitions[ $booking['status'] ], true ) ) {
			return new WP_Error( 'invalid_transition', __( 'Invalid booking status transition.', 'h-bricks-elements' ), array( 'status' => 400 ) );
		}

		global $wpdb;

		$updated = $wpdb->update(
			self::get_table_name(),
			array( 'status' => $new_status ),
			array( 'id' => (int) $booking_id ),
			array( '%s' ),
			array( '%d' )
		);

		if ( false === $updated ) {
			return new WP_Error( 'booking_update_failed', __( 'Failed to update booking status.', 'h-bricks-elements' ), array( 'status' => 500 ) );
		}

		if ( $new_status !== $booking['status'] ) {
			do_action( 'hbe_booking_status_changed', (int) $booking_id, $booking['status'], $new_status );
		}

		return true;
	}

	/**
	 * Returns a single booking.
	 *
	 * @param int $booking_id Booking ID.
	 * @return array<string, mixed>|null
	 */
	public static function get_booking( $booking_id ) {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . self::get_table_name() . ' WHERE id = %d',
				(int) $booking_id
			)
		);

		return $row ? self::normalize_booking_row( $row ) : null;
	}

	/**
	 * Returns a paginated booking list.
	 *
	 * @param array<string, mixed> $args Query args.
	 * @return array<string, mixed>
	 */
	public static function get_bookings( array $args ) {
		global $wpdb;

		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$per_page = min( 100, max( 1, (int) ( $args['per_page'] ?? 20 ) ) );
		$offset   = ( $page - 1 ) * $per_page;
		$where    = array( '1=1' );
		$params   = array();

		if ( ! empty( $args['calendar_id'] ) ) {
			$where[]  = 'calendar_id = %d';
			$params[] = (int) $args['calendar_id'];
		}

		if ( ! empty( $args['service_id'] ) ) {
			$where[]  = 'service_id = %d';
			$params[] = (int) $args['service_id'];
		}

		if ( ! empty( $args['status'] ) && in_array( $args['status'], self::VALID_STATUSES, true ) ) {
			$where[]  = 'status = %s';
			$params[] = $args['status'];
		}

		if ( ! empty( $args['date_from'] ) ) {
			$where[]  = 'date >= %s';
			$params[] = $args['date_from'];
		}

		if ( ! empty( $args['date_to'] ) ) {
			$where[]  = 'date <= %s';
			$params[] = $args['date_to'];
		}

		if ( ! empty( $args['search'] ) ) {
			$where[]  = '(customer_name LIKE %s OR customer_email LIKE %s)';
			$params[] = '%' . $wpdb->esc_like( (string) $args['search'] ) . '%';
			$params[] = '%' . $wpdb->esc_like( (string) $args['search'] ) . '%';
		}

		$where_sql = implode( ' AND ', $where );
		$order_by  = in_array( $args['orderby'] ?? 'date', array( 'date', 'created_at' ), true ) ? $args['orderby'] : 'date';
		$order     = 'desc' === strtolower( (string) ( $args['order'] ?? 'asc' ) ) ? 'DESC' : 'ASC';

		$count_sql = 'SELECT COUNT(*) FROM ' . self::get_table_name() . ' WHERE ' . $where_sql;
		$list_sql  = 'SELECT * FROM ' . self::get_table_name() . ' WHERE ' . $where_sql . ' ORDER BY ' . $order_by . ' ' . $order . ' LIMIT %d OFFSET %d';

		$total = (int) $wpdb->get_var( $wpdb->prepare( $count_sql, ...$params ) );

		$list_params   = $params;
		$list_params[] = $per_page;
		$list_params[] = $offset;
		$results       = $wpdb->get_results( $wpdb->prepare( $list_sql, ...$list_params ) );

		return array(
			'items'      => array_map( array( __CLASS__, 'normalize_booking_row' ), $results ),
			'total'      => $total,
			'totalPages' => (int) ceil( $total / $per_page ),
		);
	}

	/**
	 * Deletes a booking.
	 *
	 * @param int $booking_id Booking ID.
	 * @return bool
	 */
	public static function delete_booking( $booking_id ) {
		global $wpdb;
		return false !== $wpdb->delete( self::get_table_name(), array( 'id' => (int) $booking_id ), array( '%d' ) );
	}
}
