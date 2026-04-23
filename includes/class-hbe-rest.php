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
							'type'              => 'string',
							'required'          => false,
							'validate_callback' => array( __CLASS__, 'validate_date_param' ),
						),
						'end'   => array(
							'type'              => 'string',
							'required'          => false,
							'validate_callback' => array( __CLASS__, 'validate_date_param' ),
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
							'type'              => 'string',
							'required'          => false,
							'validate_callback' => array( __CLASS__, 'validate_date_param' ),
						),
						'end'   => array(
							'type'              => 'string',
							'required'          => false,
							'validate_callback' => array( __CLASS__, 'validate_date_param' ),
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
					'to' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_email',
						'validate_callback' => function ( $value ) {
							return empty( $value ) || is_email( $value );
						},
					),
				),
			)
		);

		/**
		 * Global email template endpoint (GET/PUT).
		 *
		 * Template precedence:
		 * - Per-calendar templates (stored in post meta under _hbe_calendar_settings)
		 *   take precedence over the global template when they exist.
		 * - The global template (this endpoint) serves as the site-wide fallback
		 *   and is used by any calendar that has not defined its own template.
		 *
		 * @deprecated Per-calendar templates are the primary UX; this global
		 *             endpoint exists only as a fallback for calendars without
		 *             a custom template.
		 */
		register_rest_route(
			self::NAMESPACE,
			'/admin/email-template',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_email_template' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_email_template' ),
					'permission_callback' => array( __CLASS__, 'can_manage_admin' ),
					'args'                => array(
						'template' => array(
							'type'              => 'object',
							'required'          => false,
							'sanitize_callback' => function ( $value ) {
								return is_array( $value ) ? $value : array();
							},
							'validate_callback' => function ( $value ) {
								if ( ! is_array( $value ) ) {
									return new WP_Error( 'invalid_template', 'template must be an object.', array( 'status' => 400 ) );
								}
								return true;
							},
						),
					),
				),
			)
		);
	}

	/**
	 * Returns the global email template.
	 *
	 * Acts as the site-wide fallback when a calendar has no per-calendar template.
	 *
	 * @deprecated The per-calendar template (post meta) is the primary UX.
	 *             This global endpoint exists as a site-wide fallback only.
	 * @return WP_REST_Response
	 */
	public static function get_email_template(): WP_REST_Response {
		$stored = get_option( 'hbe_email_template', array() );
		$template = is_array( $stored ) && ! empty( $stored )
			? $stored
			: HBE_Calendar_Settings::get_defaults()['mailSettings']['template'];

		return new WP_REST_Response( array( 'template' => $template ) );
	}

	/**
	 * Saves the global email template.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_email_template( WP_REST_Request $request ) {
		$payload        = $request->get_json_params();
		$template_input = isset( $payload['template'] ) && is_array( $payload['template'] )
			? $payload['template']
			: array();

		if ( ! empty( $template_input['compiledHtml'] ) ) {
			$validation = HBE_Booking_Mail::validate_template_payload( $template_input );
			if ( is_wp_error( $validation ) ) {
				return $validation;
			}
		}

		$sanitized = HBE_Calendar_Settings::sanitize_email_template( $template_input );
		update_option( 'hbe_email_template', $sanitized, false );

		return new WP_REST_Response( array( 'template' => $sanitized ) );
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

		$updated_settings = HBE_Calendar_Settings::update( (int) $calendar->ID, $settings );
		if ( is_wp_error( $updated_settings ) ) {
			return $updated_settings;
		}

		return new WP_REST_Response(
			array(
				'item'     => self::format_calendar_item( $calendar ),
				'settings' => $updated_settings,
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

		HBE_Plugin::send_booking_confirmation( (int) $calendar->ID, $booking );

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
		$rate_key = 'hbe_rl_' . wp_hash( $ip . '_' . (int) $calendar->ID );
		$attempts = (int) get_transient( $rate_key );

		if ( $attempts >= 5 ) {
			header( 'Retry-After: 600' );
			return new WP_Error(
				'hbe_rate_limit',
				__( 'Too many booking requests. Please try again later.', 'h-bricks-elements' ),
				array( 'status' => 429 )
			);
		}

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

		// Increment rate counter only after a successful booking.
		set_transient( $rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS );

		HBE_Plugin::send_booking_confirmation( (int) $calendar->ID, $booking );

		return new WP_REST_Response(
			array(
				'item' => $booking,
			),
			201
		);
	}

	/**
	 * Validates a date/datetime query parameter.
	 * Accepts Y-m-d dates and ISO 8601 datetime strings (e.g. 2026-04-12T22:00:00.000Z).
	 *
	 * @param mixed $value Parameter value.
	 * @return true|WP_Error
	 */
	public static function validate_date_param( $value ) {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return new WP_Error( 'invalid_date', 'Date parameter must be a non-empty string.', array( 'status' => 400 ) );
		}

		if ( DateTime::createFromFormat( 'Y-m-d', $value ) ) {
			return true;
		}

		try {
			new DateTime( $value );
			return true;
		} catch ( Exception $e ) {
			return new WP_Error( 'invalid_date', 'Date must be in Y-m-d or ISO 8601 format.', array( 'status' => 400 ) );
		}
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
	 * Sends to the provided address, or falls back to the logged-in user's email.
	 *
	 * @param WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function send_test_mail( WP_REST_Request $request ) {
		$calendar = self::get_calendar_or_error( absint( $request['id'] ) );

		if ( is_wp_error( $calendar ) ) {
			return $calendar;
		}

		$to_param = ! empty( $request['to'] ) ? sanitize_email( (string) $request['to'] ) : '';

		if ( $to_param && is_email( $to_param ) ) {
			$to = $to_param;
		} else {
			$current_user = wp_get_current_user();
			$to           = $current_user->user_email;
		}

		if ( ! is_email( $to ) ) {
			return new WP_Error(
				'hbe_invalid_recipient',
				__( 'No valid recipient email address. Enter one in the test field or ensure your WordPress user has a valid email.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$booking = HBE_Booking_Mail::build_test_booking_payload( (int) $calendar->ID, $to );
		$sent    = HBE_Booking_Mail::send_booking_email(
			(int) $calendar->ID,
			$booking,
			array(
				'is_test'       => true,
				'to'            => $to,
				'force_enabled' => true,
			)
		);

		if ( is_wp_error( $sent ) ) {
			$error_data = $sent->get_error_data();
			if ( ! is_array( $error_data ) ) {
				$error_data = array();
			}
			$status = isset( $error_data['status'] ) ? (int) $error_data['status'] : 400;

			return new WP_Error(
				$sent->get_error_code(),
				$sent->get_error_message(),
				array_merge( $error_data, array( 'status' => $status ) )
			);
		}

		return new WP_REST_Response( array( 'success' => true, 'to' => $to ), 200 );
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
	 * Returns the client IP address.
	 *
	 * Proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP) are only
	 * trusted when the direct peer (REMOTE_ADDR) is a private/local address,
	 * indicating the request passed through a reverse proxy. Otherwise
	 * REMOTE_ADDR is used directly to prevent header spoofing.
	 *
	 * @return string
	 */
	private static function get_client_ip(): string {
		$remote_addr = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) wp_unslash( $_SERVER['REMOTE_ADDR'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- validated below with FILTER_VALIDATE_IP.

		if ( ! filter_var( $remote_addr, FILTER_VALIDATE_IP ) ) {
			return 'unknown';
		}

		// If the direct peer is NOT a private/local address, trust only REMOTE_ADDR.
		if ( ! self::is_private_ip( $remote_addr ) ) {
			return $remote_addr;
		}

		// Peer is a known proxy → inspect forwarded headers in order of trust.
		$proxy_headers = array(
			'HTTP_CF_CONNECTING_IP', // Cloudflare – most trustworthy when present.
			'HTTP_X_REAL_IP',
			'HTTP_X_FORWARDED_FOR',
		);

		foreach ( $proxy_headers as $header ) {
			if ( ! empty( $_SERVER[ $header ] ) ) {
				$raw = (string) wp_unslash( $_SERVER[ $header ] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- validated below with FILTER_VALIDATE_IP.
				$ip  = trim( strtok( $raw, ',' ) );

				if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}

		return $remote_addr;
	}

	/**
	 * Checks whether an IP address belongs to a private/local range.
	 *
	 * @param string $ip Validated IP address.
	 * @return bool
	 */
	private static function is_private_ip( string $ip ): bool {
		return (bool) filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) === false;
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
