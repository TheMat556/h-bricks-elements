<?php
/**
 * Registers plugin post types and meta.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * CPT registration.
 */
class HBE_CPT_Manager {

	/**
	 * Default weekday configuration.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private static $default_weekdays = array(
		'monday'    => array(
			'enabled' => true,
			'from'    => '09:00',
			'to'      => '17:00',
		),
		'tuesday'   => array(
			'enabled' => true,
			'from'    => '09:00',
			'to'      => '17:00',
		),
		'wednesday' => array(
			'enabled' => true,
			'from'    => '09:00',
			'to'      => '17:00',
		),
		'thursday'  => array(
			'enabled' => true,
			'from'    => '09:00',
			'to'      => '17:00',
		),
		'friday'    => array(
			'enabled' => true,
			'from'    => '09:00',
			'to'      => '17:00',
		),
		'saturday'  => array(
			'enabled' => false,
			'from'    => '09:00',
			'to'      => '17:00',
		),
		'sunday'    => array(
			'enabled' => false,
			'from'    => '09:00',
			'to'      => '17:00',
		),
	);

	/**
	 * Boots hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_types' ) );
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
	}

	/**
	 * Registers plugin post types.
	 *
	 * @return void
	 */
	public static function register_post_types() {
		register_post_type(
			'hbe_calendar',
			array(
				'label'           => __( 'Calendars', 'h-bricks-elements' ),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => false,
				'supports'        => array( 'title' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
			)
		);

		register_post_type(
			'hbe_service',
			array(
				'label'           => __( 'Services', 'h-bricks-elements' ),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => false,
				'supports'        => array( 'title' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
			)
		);
	}

	/**
	 * Registers commonly used post meta fields.
	 *
	 * @return void
	 */
	public static function register_meta() {
		$calendar_meta = array(
			'_hbe_weekdays',
			'_hbe_slot_duration',
			'_hbe_slot_buffer',
			'_hbe_lead_time_hours',
			'_hbe_booking_window_days',
			'_hbe_exception_days',
			'_hbe_auto_confirm',
			'_hbe_timezone',
			'_hbe_config_version',
		);

		foreach ( $calendar_meta as $meta_key ) {
			register_post_meta(
				'hbe_calendar',
				$meta_key,
				array(
					'show_in_rest'      => false,
					'single'            => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				)
			);
		}

		$service_meta = array(
			'_hbe_calendar_id',
			'_hbe_service_color',
			'_hbe_service_description',
			'_hbe_service_public',
			'_hbe_service_sort_order',
		);

		foreach ( $service_meta as $meta_key ) {
			register_post_meta(
				'hbe_service',
				$meta_key,
				array(
					'show_in_rest'      => false,
					'single'            => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				)
			);
		}
	}

	/**
	 * Returns default calendar settings.
	 *
	 * @return array<string, mixed>
	 */
	public static function get_calendar_defaults() {
		return array(
			'weekdays'          => self::$default_weekdays,
			'slotDuration'      => 30,
			'slotBuffer'        => 0,
			'leadTimeHours'     => 24,
			'bookingWindowDays' => 60,
			'exceptionDays'     => array(),
			'autoConfirm'       => false,
			'timezone'          => wp_timezone_string() ? wp_timezone_string() : 'UTC',
			'configVersion'     => (string) time(),
		);
	}

	/**
	 * Returns normalized calendar settings.
	 *
	 * @param int $calendar_id Calendar ID.
	 * @return array<string, mixed>
	 */
	public static function get_calendar_settings( $calendar_id ) {
		$defaults       = self::get_calendar_defaults();
		$weekdays       = get_post_meta( $calendar_id, '_hbe_weekdays', true );
		$exception_days = get_post_meta( $calendar_id, '_hbe_exception_days', true );

		if ( is_string( $weekdays ) && '' !== $weekdays ) {
			$decoded = json_decode( $weekdays, true );
			if ( is_array( $decoded ) ) {
				$weekdays = $decoded;
			}
		}

		if ( is_string( $exception_days ) && '' !== $exception_days ) {
			$decoded = json_decode( $exception_days, true );
			if ( is_array( $decoded ) ) {
				$exception_days = $decoded;
			}
		}

		$settings = array(
			'weekdays'          => is_array( $weekdays ) ? array_replace_recursive( $defaults['weekdays'], $weekdays ) : $defaults['weekdays'],
			'slotDuration'      => max( 5, (int) get_post_meta( $calendar_id, '_hbe_slot_duration', true ) ),
			'slotBuffer'        => max( 0, (int) get_post_meta( $calendar_id, '_hbe_slot_buffer', true ) ),
			'leadTimeHours'     => max( 0, (int) get_post_meta( $calendar_id, '_hbe_lead_time_hours', true ) ),
			'bookingWindowDays' => max( 1, (int) get_post_meta( $calendar_id, '_hbe_booking_window_days', true ) ),
			'exceptionDays'     => is_array( $exception_days ) ? array_values( array_filter( $exception_days, 'is_string' ) ) : $defaults['exceptionDays'],
			'autoConfirm'       => '1' === (string) get_post_meta( $calendar_id, '_hbe_auto_confirm', true ),
			'timezone'          => (string) get_post_meta( $calendar_id, '_hbe_timezone', true ),
			'configVersion'     => (string) get_post_meta( $calendar_id, '_hbe_config_version', true ),
		);

		if ( '' === $settings['timezone'] ) {
			$settings['timezone'] = $defaults['timezone'];
		}

		if ( '' === $settings['configVersion'] ) {
			$settings['configVersion'] = $defaults['configVersion'];
		}

		return $settings;
	}
}
