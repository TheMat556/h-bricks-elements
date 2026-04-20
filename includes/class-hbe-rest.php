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
			'/admin/calendars/(?P<id>\d+)',
			array(
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'delete_admin_calendar' ),
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

		register_rest_route(
			self::NAMESPACE,
			'/admin/calendars/(?P<id>\d+)/test-mail',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'send_test_mail' ),
				'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
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
	 * Deletes one admin calendar.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_admin_calendar( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$deleted_bookings = HBE_Bookings::delete_for_calendar( (int) $calendar->ID );

		if ( is_wp_error( $deleted_bookings ) ) {
			return $deleted_bookings;
		}

		$deleted = wp_delete_post( (int) $calendar->ID, true );

		if ( ! $deleted ) {
			return new WP_Error(
				'hbe_calendar_delete_failed',
				__( 'Calendar could not be deleted.', 'h-bricks-elements' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response(
			array(
				'deleted' => true,
				'id'      => (int) $request['id'],
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
				'settings' => self::public_calendar_dto( HBE_Calendar_Settings::get( (int) $calendar->ID ) ),
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

		$payload = self::get_request_payload( $request );

		// Honeypot: bots fill hidden fields; legitimate users leave them empty.
		if ( ! empty( $payload['website'] ) ) {
			return new WP_Error(
				'hbe_booking_rejected',
				__( 'Booking request was rejected.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		// Rate limit: 5 requests per IP per calendar per 10 minutes.
		$ip       = self::get_client_ip();
		$rate_key = 'hbe_rl_' . md5( $ip . '_' . (int) $calendar->ID );
		$attempts = (int) get_transient( $rate_key );

		if ( $attempts >= 5 ) {
			return new WP_Error(
				'hbe_rate_limit',
				__( 'Too many booking requests. Please try again later.', 'h-bricks-elements' ),
				array( 'status' => 429 )
			);
		}

		set_transient( $rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS );

		$settings = HBE_Calendar_Settings::get( (int) $calendar->ID );

		if ( ! empty( $settings['adminOnly'] ) ) {
			return new WP_Error(
				'hbe_booking_admin_only',
				__( 'This calendar is not accepting public bookings.', 'h-bricks-elements' ),
				array( 'status' => 403 )
			);
		}

		$payload['status'] = 'pending';
		$booking           = HBE_Bookings::create(
			(int) $calendar->ID,
			$payload
		);

		if ( is_wp_error( $booking ) ) {
			return $booking;
		}

		HBE_Plugin::send_booking_confirmation( (int) $calendar->ID, $booking );

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
	 * Sends a test email via wp_mail() using per-calendar From/subject settings.
	 * SMTP delivery is handled by whatever mail plugin is active on the site.
	 * The recipient is always the currently logged-in user's email address.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function send_test_mail( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$current_user = wp_get_current_user();
		$to           = $current_user->user_email;

		if ( ! is_email( $to ) ) {
			return new WP_Error(
				'hbe_invalid_recipient',
				__( 'Current user does not have a valid email address.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$settings = HBE_Calendar_Settings::get( (int) $calendar->ID );
		$mail     = $settings['mailSettings'] ?? array();

		if ( empty( $mail['enabled'] ) ) {
			return new WP_Error(
				'hbe_mail_disabled',
				__( 'Mail is not enabled for this calendar.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$headers = array( 'Content-Type: text/plain; charset=UTF-8' );

		if ( ! empty( $mail['fromEmail'] ) && is_email( $mail['fromEmail'] ) ) {
			$from_name = ! empty( $mail['fromName'] ) ? $mail['fromName'] : $mail['fromEmail'];
			$headers[] = 'From: ' . $from_name . ' <' . $mail['fromEmail'] . '>';
		}

		$sent = wp_mail(
			$to,
			'H-Bricks Mail Test',
			"This is a test email sent from the H-Bricks booking plugin.\n\nIf you received this, your mail settings are working correctly.",
			$headers
		);

		if ( ! $sent ) {
			return new WP_Error(
				'hbe_mail_failed',
				__( 'Email could not be sent. Check your site mail configuration.', 'h-bricks-elements' ),
				array( 'status' => 502 )
			);
		}

		return new WP_REST_Response( array( 'success' => true ), 200 );
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
	 * Builds a public-safe settings DTO, stripping sensitive fields like mailSettings.
	 *
	 * @param array<string,mixed> $settings Full calendar settings.
	 * @return array<string,mixed>
	 */
	private static function public_calendar_dto( array $settings ): array {
		return array(
			'icon'                => $settings['icon'] ?? '',
			'publicBooking'       => $settings['publicBooking'] ?? array(),
			'allowDoubleBookings' => $settings['allowDoubleBookings'] ?? false,
			'adminOnly'           => $settings['adminOnly'] ?? false,
			'slotSettings'        => $settings['slotSettings'] ?? array(),
			'workingHours'        => $settings['workingHours'] ?? array(),
			'services'            => $settings['services'] ?? array(),
			'exceptions'          => $settings['exceptions'] ?? array(),
			'selectionMode'       => $settings['selectionMode'] ?? 'single',
		);
	}

	/**
	 * Returns the client IP address from the TCP connection.
	 *
	 * @return string
	 */
	private static function get_client_ip(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';

		if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
			return $ip;
		}

		return 'unknown';
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
