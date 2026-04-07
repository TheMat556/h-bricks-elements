<?php
/**
 * REST API bootstrap.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers admin and public REST routes.
 */
class HBE_REST {

	/**
	 * Namespace for plugin routes.
	 *
	 * @var string
	 */
	const NAMESPACE = 'hbe/v1';

	/**
	 * Registers hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Registers REST routes.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/admin/calendars',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_admin_calendars' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'create_admin_calendar' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'title' => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/admin/calendars/(?P<id>\d+)/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_admin_calendar_settings' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_admin_calendar_settings' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/admin/calendars/(?P<id>\d+)/bookings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_admin_calendar_bookings' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'id'    => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
						'start' => array(
							'type'     => 'string',
							'required' => false,
						),
						'end'   => array(
							'type'     => 'string',
							'required' => false,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'create_admin_calendar_booking' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/admin/calendars/(?P<id>\d+)/bookings/(?P<booking_id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_admin_calendar_booking' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'id'         => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
						'booking_id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'delete_admin_calendar_booking' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'id'         => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
						'booking_id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/public/calendars/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_public_calendar' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/public/calendars/(?P<id>\d+)/bookings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_public_calendar_bookings' ),
					'permission_callback' => '__return_true',
					'args'                => array(
						'id'    => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
						'start' => array(
							'type'     => 'string',
							'required' => false,
						),
						'end'   => array(
							'type'     => 'string',
							'required' => false,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'create_public_calendar_booking' ),
					'permission_callback' => '__return_true',
					'args'                => array(
						'id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);
	}

	/**
	 * Returns calendars for the admin app.
	 *
	 * @return WP_REST_Response
	 */
	public static function get_admin_calendars(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'items' => HBE_Calendar_Post_Type::get_admin_items(),
			)
		);
	}

	/**
	 * Creates a calendar for the admin app.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_admin_calendar( WP_REST_Request $request ) {
		$title = trim( (string) $request->get_param( 'title' ) );

		if ( '' === $title ) {
			return new WP_Error(
				'hbe_calendar_title_required',
				__( 'Calendar title is required.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => HBE_Calendar_Post_Type::POST_TYPE,
				'post_status' => 'publish',
				'post_title'  => $title,
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		$calendar = get_post( $post_id );

		return new WP_REST_Response(
			array(
				'item'     => self::format_calendar_item( $calendar ),
				'settings' => HBE_Calendar_Settings::get( (int) $calendar->ID ),
			),
			201
		);
	}

	/**
	 * Returns settings for one admin calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_admin_calendar_settings( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		return new WP_REST_Response(
			array(
				'item'     => self::format_calendar_item( $calendar ),
				'settings' => HBE_Calendar_Settings::get( (int) $calendar->ID ),
			)
		);
	}

	/**
	 * Updates settings for one admin calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_admin_calendar_settings( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$payload   = self::get_request_payload( $request );
		$settings  = isset( $payload['settings'] ) && is_array( $payload['settings'] )
			? $payload['settings']
			: array();
		$new_title = isset( $payload['title'] ) ? trim( sanitize_text_field( (string) $payload['title'] ) ) : '';

		if ( '' !== $new_title && $new_title !== $calendar->post_title ) {
			$updated_post = wp_update_post(
				array(
					'ID'         => (int) $calendar->ID,
					'post_title' => $new_title,
				),
				true
			);

			if ( is_wp_error( $updated_post ) ) {
				return $updated_post;
			}

			$calendar = get_post( (int) $calendar->ID );
		}

		return new WP_REST_Response(
			array(
				'item'     => self::format_calendar_item( $calendar ),
				'settings' => HBE_Calendar_Settings::update( (int) $calendar->ID, $settings ),
			)
		);
	}

	/**
	 * Returns bookings for one calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_admin_calendar_bookings( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$start    = $request->get_param( 'start' );
		$end      = $request->get_param( 'end' );
		$bookings = HBE_Bookings::list_for_calendar(
			(int) $calendar->ID,
			is_string( $start ) && '' !== $start ? $start : null,
			is_string( $end ) && '' !== $end ? $end : null
		);

		if ( is_wp_error( $bookings ) ) {
			return $bookings;
		}

		return new WP_REST_Response(
			array(
				'items' => $bookings,
			)
		);
	}

	/**
	 * Creates a booking for one calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_admin_calendar_booking( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$booking = HBE_Bookings::create(
			(int) $calendar->ID,
			self::get_request_payload( $request )
		);

		if ( is_wp_error( $booking ) ) {
			return $booking;
		}

		return new WP_REST_Response(
			array(
				'item' => $booking,
			),
			201
		);
	}

	/**
	 * Updates a booking for one calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_admin_calendar_booking( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$booking = HBE_Bookings::update(
			(int) $calendar->ID,
			absint( $request['booking_id'] ),
			self::get_request_payload( $request )
		);

		if ( is_wp_error( $booking ) ) {
			return $booking;
		}

		return new WP_REST_Response(
			array(
				'item' => $booking,
			)
		);
	}

	/**
	 * Deletes a booking for one calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_admin_calendar_booking( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$deleted = HBE_Bookings::delete(
			(int) $calendar->ID,
			absint( $request['booking_id'] )
		);

		if ( is_wp_error( $deleted ) ) {
			return $deleted;
		}

		return new WP_REST_Response(
			array(
				'deleted'   => true,
				'bookingId' => absint( $request['booking_id'] ),
			)
		);
	}

	/**
	 * Returns public calendar config basics.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_public_calendar( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		return new WP_REST_Response(
			array(
				'id'       => $calendar->ID,
				'title'    => $calendar->post_title,
				'slug'     => $calendar->post_name,
				'settings' => HBE_Calendar_Settings::get( (int) $calendar->ID ),
			)
		);
	}

	/**
	 * Returns public bookings for one calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_public_calendar_bookings( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$start    = $request->get_param( 'start' );
		$end      = $request->get_param( 'end' );
		$bookings = HBE_Bookings::list_for_calendar(
			(int) $calendar->ID,
			is_string( $start ) && '' !== $start ? $start : null,
			is_string( $end ) && '' !== $end ? $end : null
		);

		if ( is_wp_error( $bookings ) ) {
			return $bookings;
		}

		$visible_bookings = array_values(
			array_filter(
				$bookings,
				static function ( $booking ) {
					return is_array( $booking )
						&& isset( $booking['status'] )
						&& 'cancelled' !== $booking['status'];
				}
			)
		);

		return new WP_REST_Response(
			array(
				'items' => array_map(
					static function ( $booking ) {
						return array(
							'id'        => isset( $booking['id'] ) ? (int) $booking['id'] : 0,
							'start'     => isset( $booking['start'] ) ? (string) $booking['start'] : '',
							'end'       => isset( $booking['end'] ) ? (string) $booking['end'] : '',
							'status'    => isset( $booking['status'] ) ? (string) $booking['status'] : '',
							'serviceId' => isset( $booking['serviceId'] ) ? (string) $booking['serviceId'] : '',
						);
					},
					$visible_bookings
				),
			)
		);
	}

	/**
	 * Creates a public booking for one calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_public_calendar_booking( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$settings = HBE_Calendar_Settings::get( (int) $calendar->ID );

		if ( ! empty( $settings['adminOnly'] ) ) {
			return new WP_Error(
				'hbe_booking_admin_only',
				__( 'This calendar is not accepting public bookings.', 'h-bricks-elements' ),
				array( 'status' => 403 )
			);
		}

		$payload           = self::get_request_payload( $request );
		$payload['status'] = 'pending';
		$booking           = HBE_Bookings::create(
			(int) $calendar->ID,
			$payload
		);

		if ( is_wp_error( $booking ) ) {
			return $booking;
		}

		return new WP_REST_Response(
			array(
				'item' => $booking,
			),
			201
		);
	}

	/**
	 * Checks if the current user may access admin routes.
	 *
	 * @return bool
	 */
	public static function can_manage_admin(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Returns a calendar post or a REST error.
	 *
	 * @param int $calendar_id Calendar ID.
	 * @return WP_Post|WP_Error
	 */
	private static function get_calendar_or_error( int $calendar_id ) {
		$calendar = get_post( $calendar_id );

		if ( ! $calendar || HBE_Calendar_Post_Type::POST_TYPE !== $calendar->post_type ) {
			return new WP_Error(
				'hbe_calendar_not_found',
				__( 'Calendar not found.', 'h-bricks-elements' ),
				array( 'status' => 404 )
			);
		}

		return $calendar;
	}

	/**
	 * Formats a calendar for REST responses.
	 *
	 * @param WP_Post $calendar Calendar post.
	 * @return array<string,mixed>
	 */
	private static function format_calendar_item( WP_Post $calendar ): array {
		$settings = HBE_Calendar_Settings::get( (int) $calendar->ID );

		return array(
			'id'    => $calendar->ID,
			'title' => $calendar->post_title,
			'slug'  => $calendar->post_name,
			'icon'  => isset( $settings['icon'] ) ? (string) $settings['icon'] : '',
		);
	}

	/**
	 * Normalizes request payload access for JSON requests.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return array<string,mixed>
	 */
	private static function get_request_payload( WP_REST_Request $request ): array {
		$json_params = $request->get_json_params();

		if ( is_array( $json_params ) ) {
			return $json_params;
		}

		$params = $request->get_params();

		return is_array( $params ) ? $params : array();
	}
}
