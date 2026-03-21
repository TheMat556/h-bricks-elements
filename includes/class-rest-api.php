<?php
/**
 * REST API registration.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers plugin REST routes.
 */
class HBE_REST_API {

	/**
	 * API namespace.
	 *
	 * @var string
	 */
	const NAMESPACE = 'hbe/v1';

	/**
	 * Boots REST hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Registers plugin routes.
	 *
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/health',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( __CLASS__, 'get_health' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/calendars',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'get_calendars' ),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'create_calendar' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/calendars/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'get_calendar' ),
				),
				array(
					'methods'             => 'PUT,PATCH',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'update_calendar' ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'delete_calendar' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/calendars/(?P<id>\d+)/services',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( __CLASS__, 'can_manage_or_view_public' ),
					'callback'            => array( __CLASS__, 'get_services' ),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'create_service' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/services/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'PUT,PATCH',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'update_service' ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'delete_service' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/bookings',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'get_bookings' ),
				),
				array(
					'methods'             => 'POST',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'create_admin_booking' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/bookings/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'get_booking' ),
				),
				array(
					'methods'             => 'PUT,PATCH',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'update_booking' ),
				),
				array(
					'methods'             => 'DELETE',
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'callback'            => array( __CLASS__, 'delete_booking' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/calendars/(?P<id>\d+)/slots',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( __CLASS__, 'can_view_public' ),
				'callback'            => array( __CLASS__, 'get_slots' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/calendars/(?P<id>\d+)/available-dates',
			array(
				'methods'             => 'GET',
				'permission_callback' => array( __CLASS__, 'can_view_public' ),
				'callback'            => array( __CLASS__, 'get_available_dates' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/calendars/(?P<id>\d+)/bookings',
			array(
				'methods'             => 'POST',
				'permission_callback' => array( __CLASS__, 'can_view_public' ),
				'callback'            => array( __CLASS__, 'create_public_booking' ),
			)
		);
	}

	/**
	 * Checks admin permissions.
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Checks public read permissions.
	 *
	 * @param \WP_REST_Request $request Request instance.
	 * @return bool
	 */
	public static function can_view_public( $request ) {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}

		$nonce = $request->get_header( 'X-WP-Nonce' );
		return is_string( $nonce ) && wp_verify_nonce( $nonce, 'wp_rest' );
	}

	/**
	 * Allows either public view or admin view.
	 *
	 * @param \WP_REST_Request $request Request instance.
	 * @return bool
	 */
	public static function can_manage_or_view_public( $request ) {
		return self::can_manage() || self::can_view_public( $request );
	}

	/**
	 * Prepares a calendar response.
	 *
	 * @param \WP_Post $calendar Calendar post.
	 * @return array<string, mixed>
	 */
	private static function prepare_calendar_response( $calendar ) {
		$settings = HBE_CPT_Manager::get_calendar_settings( $calendar->ID );

		return array(
			'id'                => (int) $calendar->ID,
			'name'              => $calendar->post_title,
			'weekdays'          => $settings['weekdays'],
			'slotDuration'      => (int) $settings['slotDuration'],
			'slotBuffer'        => (int) $settings['slotBuffer'],
			'leadTimeHours'     => (int) $settings['leadTimeHours'],
			'bookingWindowDays' => (int) $settings['bookingWindowDays'],
			'exceptionDays'     => array_values( $settings['exceptionDays'] ),
			'autoConfirm'       => (bool) $settings['autoConfirm'],
			'timezone'          => (string) $settings['timezone'],
		);
	}

	/**
	 * Prepares a service response.
	 *
	 * @param \WP_Post $service Service post.
	 * @return array<string, mixed>
	 */
	private static function prepare_service_response( $service ) {
		return array(
			'id'          => (int) $service->ID,
			'calendarId'  => (int) get_post_meta( $service->ID, '_hbe_calendar_id', true ),
			'name'        => $service->post_title,
			'description' => (string) get_post_meta( $service->ID, '_hbe_service_description', true ),
			'color'       => (string) get_post_meta( $service->ID, '_hbe_service_color', true ),
			'isPublic'    => '1' === (string) get_post_meta( $service->ID, '_hbe_service_public', true ),
			'sortOrder'   => (int) get_post_meta( $service->ID, '_hbe_service_sort_order', true ),
		);
	}

	/**
	 * Saves calendar meta from a request.
	 *
	 * @param int              $calendar_id Calendar ID.
	 * @param \WP_REST_Request $request Request.
	 * @return void
	 */
	private static function save_calendar_meta( $calendar_id, $request ) {
		$params   = $request->get_json_params();
		$defaults = HBE_CPT_Manager::get_calendar_defaults();
		$weekdays = $params['weekdays'] ?? $defaults['weekdays'];

		if ( ! is_array( $weekdays ) ) {
			$weekdays = $defaults['weekdays'];
		}

		update_post_meta( $calendar_id, '_hbe_weekdays', wp_json_encode( $weekdays ) );
		update_post_meta( $calendar_id, '_hbe_slot_duration', absint( $params['slotDuration'] ?? $defaults['slotDuration'] ) );
		update_post_meta( $calendar_id, '_hbe_slot_buffer', absint( $params['slotBuffer'] ?? $defaults['slotBuffer'] ) );
		update_post_meta( $calendar_id, '_hbe_lead_time_hours', absint( $params['leadTimeHours'] ?? $defaults['leadTimeHours'] ) );
		update_post_meta( $calendar_id, '_hbe_booking_window_days', absint( $params['bookingWindowDays'] ?? $defaults['bookingWindowDays'] ) );
		update_post_meta( $calendar_id, '_hbe_exception_days', wp_json_encode( is_array( $params['exceptionDays'] ?? null ) ? $params['exceptionDays'] : array() ) );
		update_post_meta( $calendar_id, '_hbe_auto_confirm', ! empty( $params['autoConfirm'] ) ? '1' : '0' );
		update_post_meta( $calendar_id, '_hbe_timezone', sanitize_text_field( (string) ( $params['timezone'] ?? $defaults['timezone'] ) ) );
		update_post_meta( $calendar_id, '_hbe_config_version', (string) time() );
		do_action( 'hbe_calendar_saved', (int) $calendar_id );
	}

	/**
	 * Basic health route for initial wiring checks.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_health() {
		return rest_ensure_response(
			array(
				'plugin'  => 'h-bricks-elements',
				'version' => HBE_PLUGIN_VERSION,
				'status'  => 'ok',
			)
		);
	}

	/**
	 * Returns all calendars.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_calendars() {
		$calendars = get_posts(
			array(
				'post_type'   => 'hbe_calendar',
				'post_status' => 'publish',
				'numberposts' => -1,
				'orderby'     => 'title',
				'order'       => 'ASC',
			)
		);

		return rest_ensure_response( array_map( array( __CLASS__, 'prepare_calendar_response' ), $calendars ) );
	}

	/**
	 * Creates a calendar.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_calendar( $request ) {
		$params      = $request->get_json_params();
		$calendar_id = wp_insert_post(
			array(
				'post_type'   => 'hbe_calendar',
				'post_status' => 'publish',
				'post_title'  => sanitize_text_field( (string) ( $params['name'] ?? '' ) ),
			),
			true
		);

		if ( is_wp_error( $calendar_id ) ) {
			return $calendar_id;
		}

		self::save_calendar_meta( (int) $calendar_id, $request );
		return rest_ensure_response( self::prepare_calendar_response( get_post( $calendar_id ) ) );
	}

	/**
	 * Returns a calendar.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_calendar( $request ) {
		$calendar = get_post( (int) $request['id'] );
		if ( ! $calendar || 'hbe_calendar' !== $calendar->post_type ) {
			return new WP_Error( 'calendar_not_found', __( 'Calendar not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response( self::prepare_calendar_response( $calendar ) );
	}

	/**
	 * Updates a calendar.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function update_calendar( $request ) {
		$calendar_id = (int) $request['id'];
		$calendar    = get_post( $calendar_id );

		if ( ! $calendar || 'hbe_calendar' !== $calendar->post_type ) {
			return new WP_Error( 'calendar_not_found', __( 'Calendar not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
		}

		$params = $request->get_json_params();

		wp_update_post(
			array(
				'ID'         => $calendar_id,
				'post_title' => sanitize_text_field( (string) ( $params['name'] ?? $calendar->post_title ) ),
			)
		);

		self::save_calendar_meta( $calendar_id, $request );
		return rest_ensure_response( self::prepare_calendar_response( get_post( $calendar_id ) ) );
	}

	/**
	 * Deletes a calendar.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function delete_calendar( $request ) {
		$deleted = wp_delete_post( (int) $request['id'], true );
		if ( ! $deleted ) {
			return new WP_Error( 'calendar_delete_failed', __( 'Failed to delete calendar.', 'h-bricks-elements' ), array( 'status' => 500 ) );
		}

		return rest_ensure_response( array( 'deleted' => true ) );
	}

	/**
	 * Returns services for a calendar.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function get_services( $request ) {
		$calendar_id = (int) $request['id'];
		$services    = get_posts(
			array(
				'post_type'   => 'hbe_service',
				'post_status' => 'publish',
				'numberposts' => -1,
				'meta_key'    => '_hbe_calendar_id',
				'meta_value'  => $calendar_id,
				'orderby'     => 'title',
				'order'       => 'ASC',
			)
		);

		$items = array_map( array( __CLASS__, 'prepare_service_response' ), $services );

		if ( ! self::can_manage() ) {
			$items = array_values(
				array_filter(
					$items,
					function ( $item ) {
						return ! empty( $item['isPublic'] );
					}
				)
			);
		}

		return rest_ensure_response( $items );
	}

	/**
	 * Creates a service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_service( $request ) {
		$calendar_id = (int) $request['id'];
		$params      = $request->get_json_params();
		$service_id  = wp_insert_post(
			array(
				'post_type'   => 'hbe_service',
				'post_status' => 'publish',
				'post_title'  => sanitize_text_field( (string) ( $params['name'] ?? '' ) ),
			),
			true
		);

		if ( is_wp_error( $service_id ) ) {
			return $service_id;
		}

		update_post_meta( $service_id, '_hbe_calendar_id', $calendar_id );
		update_post_meta( $service_id, '_hbe_service_description', sanitize_textarea_field( (string) ( $params['description'] ?? '' ) ) );
		update_post_meta( $service_id, '_hbe_service_color', sanitize_hex_color( (string) ( $params['color'] ?? '' ) ) ?: '' );
		update_post_meta( $service_id, '_hbe_service_public', ! empty( $params['isPublic'] ) ? '1' : '0' );
		update_post_meta( $service_id, '_hbe_service_sort_order', absint( $params['sortOrder'] ?? 0 ) );

		return rest_ensure_response( self::prepare_service_response( get_post( $service_id ) ) );
	}

	/**
	 * Updates a service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function update_service( $request ) {
		$service_id = (int) $request['id'];
		$service    = get_post( $service_id );

		if ( ! $service || 'hbe_service' !== $service->post_type ) {
			return new WP_Error( 'service_not_found', __( 'Service not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
		}

		$params = $request->get_json_params();

		wp_update_post(
			array(
				'ID'         => $service_id,
				'post_title' => sanitize_text_field( (string) ( $params['name'] ?? $service->post_title ) ),
			)
		);

		if ( array_key_exists( 'description', $params ) ) {
			update_post_meta( $service_id, '_hbe_service_description', sanitize_textarea_field( (string) $params['description'] ) );
		}

		if ( array_key_exists( 'color', $params ) ) {
			update_post_meta( $service_id, '_hbe_service_color', sanitize_hex_color( (string) $params['color'] ) ?: '' );
		}

		if ( array_key_exists( 'isPublic', $params ) ) {
			update_post_meta( $service_id, '_hbe_service_public', ! empty( $params['isPublic'] ) ? '1' : '0' );
		}

		if ( array_key_exists( 'sortOrder', $params ) ) {
			update_post_meta( $service_id, '_hbe_service_sort_order', absint( $params['sortOrder'] ) );
		}

		return rest_ensure_response( self::prepare_service_response( get_post( $service_id ) ) );
	}

	/**
	 * Deletes a service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function delete_service( $request ) {
		$deleted = wp_delete_post( (int) $request['id'], true );
		if ( ! $deleted ) {
			return new WP_Error( 'service_delete_failed', __( 'Failed to delete service.', 'h-bricks-elements' ), array( 'status' => 500 ) );
		}

		return rest_ensure_response( array( 'deleted' => true ) );
	}

	/**
	 * Returns slots for a date.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function get_slots( $request ) {
		$date = sanitize_text_field( (string) $request->get_param( 'date' ) );
		return rest_ensure_response( HBE_Booking_Logic::get_available_slots_cached( (int) $request['id'], $date ) );
	}

	/**
	 * Returns available dates for a month.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function get_available_dates( $request ) {
		$month = sanitize_text_field( (string) $request->get_param( 'month' ) );
		return rest_ensure_response( HBE_Booking_Logic::get_available_dates( (int) $request['id'], $month ) );
	}

	/**
	 * Creates a public booking.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_public_booking( $request ) {
		$params                = $request->get_json_params();
		$params['calendar_id'] = (int) $request['id'];
		$params['source']      = 'frontend';

		$booking = HBE_Booking_Logic::create_booking( $params );
		if ( is_wp_error( $booking ) ) {
			return $booking;
		}

		return rest_ensure_response( $booking );
	}

	/**
	 * Returns bookings list for admin.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function get_bookings( $request ) {
		$result   = HBE_Booking_Logic::get_bookings( $request->get_params() );
		$response = rest_ensure_response( $result['items'] );
		$response->header( 'X-WP-Total', (string) $result['total'] );
		$response->header( 'X-WP-TotalPages', (string) $result['totalPages'] );
		return $response;
	}

	/**
	 * Returns a single booking.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_booking( $request ) {
		$booking = HBE_Booking_Logic::get_booking( (int) $request['id'] );
		if ( ! $booking ) {
			return new WP_Error( 'booking_not_found', __( 'Booking not found.', 'h-bricks-elements' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response( $booking );
	}

	/**
	 * Creates an admin booking.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_admin_booking( $request ) {
		$params           = $request->get_json_params();
		$params['source'] = 'admin';

		$booking = HBE_Booking_Logic::create_booking( $params );
		if ( is_wp_error( $booking ) ) {
			return $booking;
		}

		return rest_ensure_response( $booking );
	}

	/**
	 * Updates a booking.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function update_booking( $request ) {
		$params = $request->get_json_params();
		$result = HBE_Booking_Logic::update_status( (int) $request['id'], sanitize_key( (string) ( $params['status'] ?? '' ) ) );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( HBE_Booking_Logic::get_booking( (int) $request['id'] ) );
	}

	/**
	 * Deletes a booking.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function delete_booking( $request ) {
		if ( ! HBE_Booking_Logic::delete_booking( (int) $request['id'] ) ) {
			return new WP_Error( 'booking_delete_failed', __( 'Failed to delete booking.', 'h-bricks-elements' ), array( 'status' => 500 ) );
		}

		return rest_ensure_response( array( 'deleted' => true ) );
	}
}
