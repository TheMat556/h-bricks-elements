<?php
/**
 * Calendar settings storage and sanitization.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles per-calendar settings persistence.
 */
class HBE_Calendar_Settings {

	/**
	 * Meta key for calendar settings.
	 *
	 * @var string
	 */
	const META_KEY = '_hbe_calendar_settings';

	/**
	 * Returns default settings for a calendar.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_defaults(): array {
		return array(
			'icon'          => '',
			'allowDoubleBookings' => false,
			'adminOnly'     => false,
			'slotSettings'  => array(
				'sessionDuration' => 60,
				'prepTime'        => 0,
				'cleanupTime'     => 0,
				'maxAdvanceDays'  => 0,
			),
			'mailSettings'  => array(
				'enabled'    => false,
				'host'       => '',
				'port'       => 587,
				'encryption' => 'tls',
				'username'   => '',
				'password'   => '',
				'fromName'   => '',
				'fromEmail'  => '',
				'subject'    => 'Booking confirmation',
			),
			'workingHours'  => array(
				'monday'    => array(
					'enabled'   => true,
					'intervals' => array(
						array(
							'start' => '09:00',
							'end'   => '17:00',
						),
					),
				),
				'tuesday'   => array(
					'enabled'   => true,
					'intervals' => array(
						array(
							'start' => '09:00',
							'end'   => '17:00',
						),
					),
				),
				'wednesday' => array(
					'enabled'   => true,
					'intervals' => array(
						array(
							'start' => '09:00',
							'end'   => '17:00',
						),
					),
				),
				'thursday'  => array(
					'enabled'   => true,
					'intervals' => array(
						array(
							'start' => '09:00',
							'end'   => '17:00',
						),
					),
				),
				'friday'    => array(
					'enabled'   => true,
					'intervals' => array(
						array(
							'start' => '09:00',
							'end'   => '17:00',
						),
					),
				),
				'saturday'  => array(
					'enabled'   => false,
					'intervals' => array(),
				),
				'sunday'    => array(
					'enabled'   => false,
					'intervals' => array(),
				),
			),
			'services'      => array(),
			'exceptions'    => array(),
			'selectionMode' => 'single',
		);
	}

	/**
	 * Returns weekday keys in display order.
	 *
	 * @return string[]
	 */
	public static function get_weekday_keys(): array {
		return array(
			'monday',
			'tuesday',
			'wednesday',
			'thursday',
			'friday',
			'saturday',
			'sunday',
		);
	}

	/**
	 * Returns sanitized settings for a calendar.
	 *
	 * @param int $calendar_id Calendar post ID.
	 * @return array<string,mixed>
	 */
	public static function get( int $calendar_id ): array {
		$stored_settings = get_post_meta( $calendar_id, self::META_KEY, true );

		return self::sanitize( is_array( $stored_settings ) ? $stored_settings : array() );
	}

	/**
	 * Stores sanitized settings for a calendar.
	 *
	 * @param int                $calendar_id Calendar post ID.
	 * @param array<string,mixed> $settings   Settings to persist.
	 * @return array<string,mixed>
	 */
	public static function update( int $calendar_id, array $settings ): array {
		$sanitized_settings = self::sanitize( $settings );

		update_post_meta( $calendar_id, self::META_KEY, $sanitized_settings );

		return $sanitized_settings;
	}

	/**
	 * Sanitizes a settings payload.
	 *
	 * @param array<string,mixed> $settings Raw settings.
	 * @return array<string,mixed>
	 */
	public static function sanitize( array $settings ): array {
		$defaults = self::get_defaults();

		return array(
			'icon'          => self::sanitize_icon(
				isset( $settings['icon'] ) ? (string) $settings['icon'] : ''
			),
			'allowDoubleBookings' => ! empty( $settings['allowDoubleBookings'] ),
			'adminOnly'     => ! empty( $settings['adminOnly'] ),
			'slotSettings'  => self::sanitize_slot_settings(
				isset( $settings['slotSettings'] ) && is_array( $settings['slotSettings'] )
					? $settings['slotSettings']
					: array()
			),
			'mailSettings'  => self::sanitize_mail_settings(
				isset( $settings['mailSettings'] ) && is_array( $settings['mailSettings'] )
					? $settings['mailSettings']
					: array()
			),
			'workingHours'  => self::sanitize_working_hours(
				isset( $settings['workingHours'] ) && is_array( $settings['workingHours'] )
					? $settings['workingHours']
					: $defaults['workingHours']
			),
			'services'      => self::sanitize_services(
				isset( $settings['services'] ) && is_array( $settings['services'] )
					? $settings['services']
					: array()
			),
			'exceptions'    => self::sanitize_exceptions(
				isset( $settings['exceptions'] ) && is_array( $settings['exceptions'] )
					? $settings['exceptions']
					: array()
			),
			'selectionMode' => self::sanitize_selection_mode(
				isset( $settings['selectionMode'] ) ? (string) $settings['selectionMode'] : 'single'
			),
		);
	}

	/**
	 * Sanitizes the calendar icon field.
	 *
	 * @param string $icon Raw icon value.
	 * @return string
	 */
	private static function sanitize_icon( string $icon ): string {
		$sanitized = trim( sanitize_text_field( $icon ) );

		if ( '' === $sanitized ) {
			return '';
		}

		if ( function_exists( 'mb_substr' ) ) {
			return mb_substr( $sanitized, 0, 12 );
		}

		return substr( $sanitized, 0, 12 );
	}

	/**
	 * Sanitizes selection mode.
	 *
	 * @param string $selection_mode Raw mode.
	 * @return string
	 */
	private static function sanitize_selection_mode( string $selection_mode ): string {
		return in_array( $selection_mode, array( 'single', 'multi' ), true )
			? $selection_mode
			: 'single';
	}

	/**
	 * Sanitizes default slot timing settings.
	 *
	 * @param array<string,mixed> $slot_settings Raw slot settings.
	 * @return array<string,int>
	 */
	private static function sanitize_slot_settings( array $slot_settings ): array {
		$defaults = self::get_defaults()['slotSettings'];

		return array(
			'sessionDuration' => max(
				1,
				isset( $slot_settings['sessionDuration'] )
					? absint( $slot_settings['sessionDuration'] )
					: (int) $defaults['sessionDuration']
			),
			'prepTime'        => isset( $slot_settings['prepTime'] )
				? absint( $slot_settings['prepTime'] )
				: (int) $defaults['prepTime'],
			'cleanupTime'     => isset( $slot_settings['cleanupTime'] )
				? absint( $slot_settings['cleanupTime'] )
				: (int) $defaults['cleanupTime'],
			'maxAdvanceDays'  => isset( $slot_settings['maxAdvanceDays'] )
				? absint( $slot_settings['maxAdvanceDays'] )
				: (int) $defaults['maxAdvanceDays'],
		);
	}

	/**
	 * Sanitizes dummy mail settings.
	 *
	 * @param array<string,mixed> $mail_settings Raw mail settings.
	 * @return array<string,mixed>
	 */
	private static function sanitize_mail_settings( array $mail_settings ): array {
		$defaults = self::get_defaults()['mailSettings'];

		$encryption = isset( $mail_settings['encryption'] )
			? sanitize_key( (string) $mail_settings['encryption'] )
			: (string) $defaults['encryption'];

		if ( ! in_array( $encryption, array( 'none', 'ssl', 'tls' ), true ) ) {
			$encryption = (string) $defaults['encryption'];
		}

		return array(
			'enabled'    => ! empty( $mail_settings['enabled'] ),
			'host'       => isset( $mail_settings['host'] ) ? sanitize_text_field( (string) $mail_settings['host'] ) : (string) $defaults['host'],
			'port'       => isset( $mail_settings['port'] ) ? absint( $mail_settings['port'] ) : (int) $defaults['port'],
			'encryption' => $encryption,
			'username'   => isset( $mail_settings['username'] ) ? sanitize_text_field( (string) $mail_settings['username'] ) : (string) $defaults['username'],
			'password'   => isset( $mail_settings['password'] ) ? sanitize_text_field( (string) $mail_settings['password'] ) : (string) $defaults['password'],
			'fromName'   => isset( $mail_settings['fromName'] ) ? sanitize_text_field( (string) $mail_settings['fromName'] ) : (string) $defaults['fromName'],
			'fromEmail'  => isset( $mail_settings['fromEmail'] ) ? sanitize_email( (string) $mail_settings['fromEmail'] ) : (string) $defaults['fromEmail'],
			'subject'    => isset( $mail_settings['subject'] ) ? sanitize_text_field( (string) $mail_settings['subject'] ) : (string) $defaults['subject'],
		);
	}

	/**
	 * Sanitizes working hours for all weekdays.
	 *
	 * @param array<string,mixed> $working_hours Raw working hours.
	 * @return array<string,array<string,mixed>>
	 */
	private static function sanitize_working_hours( array $working_hours ): array {
		$default_working_hours = self::get_defaults()['workingHours'];
		$sanitized             = array();

		foreach ( self::get_weekday_keys() as $weekday ) {
			$day_data  = isset( $working_hours[ $weekday ] ) && is_array( $working_hours[ $weekday ] )
				? $working_hours[ $weekday ]
				: $default_working_hours[ $weekday ];
			$intervals = array();

			if ( isset( $day_data['intervals'] ) && is_array( $day_data['intervals'] ) ) {
				foreach ( $day_data['intervals'] as $interval ) {
					if ( ! is_array( $interval ) ) {
						continue;
					}

					$start = isset( $interval['start'] ) ? self::sanitize_time_string( (string) $interval['start'] ) : null;
					$end   = isset( $interval['end'] ) ? self::sanitize_time_string( (string) $interval['end'] ) : null;

					if ( ! $start || ! $end || $start >= $end ) {
						continue;
					}

					$intervals[] = array(
						'start' => $start,
						'end'   => $end,
					);
				}
			}

			$sanitized[ $weekday ] = array(
				'enabled'   => ! empty( $day_data['enabled'] ),
				'intervals' => $intervals,
			);
		}

		return $sanitized;
	}

	/**
	 * Sanitizes services.
	 *
	 * @param array<int,mixed> $services Raw services.
	 * @return array<int,array<string,mixed>>
	 */
	private static function sanitize_services( array $services ): array {
		$sanitized = array();

		foreach ( $services as $service ) {
			if ( ! is_array( $service ) ) {
				continue;
			}

			$name = isset( $service['name'] ) ? sanitize_text_field( (string) $service['name'] ) : '';

			if ( '' === $name ) {
				continue;
			}

			$sanitized[] = array(
				'id'          => isset( $service['id'] ) && '' !== (string) $service['id']
					? sanitize_key( (string) $service['id'] )
					: sanitize_key( 'service_' . wp_generate_uuid4() ),
				'name'        => $name,
				'duration'    => max( 1, isset( $service['duration'] ) ? absint( $service['duration'] ) : 30 ),
				'prepTime'    => isset( $service['prepTime'] ) ? absint( $service['prepTime'] ) : 0,
				'cleanupTime' => isset( $service['cleanupTime'] ) ? absint( $service['cleanupTime'] ) : 0,
				'price'       => isset( $service['price'] ) ? sanitize_text_field( (string) $service['price'] ) : '',
				'description' => isset( $service['description'] ) ? sanitize_textarea_field( (string) $service['description'] ) : '',
			);
		}

		return $sanitized;
	}

	/**
	 * Sanitizes exception days.
	 *
	 * @param array<int,mixed> $exceptions Raw exceptions.
	 * @return array<int,array<string,string>>
	 */
	private static function sanitize_exceptions( array $exceptions ): array {
		$sanitized = array();

		foreach ( $exceptions as $exception ) {
			if ( ! is_array( $exception ) ) {
				continue;
			}

			$date = isset( $exception['date'] ) ? self::sanitize_date_string( (string) $exception['date'] ) : null;

			if ( ! $date ) {
				continue;
			}

			$sanitized[] = array(
				'id'     => isset( $exception['id'] ) && '' !== (string) $exception['id']
					? sanitize_key( (string) $exception['id'] )
					: sanitize_key( 'exception_' . wp_generate_uuid4() ),
				'date'   => $date,
				'reason' => isset( $exception['reason'] ) ? sanitize_text_field( (string) $exception['reason'] ) : '',
			);
		}

		return $sanitized;
	}

	/**
	 * Sanitizes a time string.
	 *
	 * @param string $time_string Raw time.
	 * @return string|null
	 */
	private static function sanitize_time_string( string $time_string ): ?string {
		$time_string = trim( $time_string );

		if ( ! preg_match( '/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time_string ) ) {
			return null;
		}

		return $time_string;
	}

	/**
	 * Sanitizes a date string.
	 *
	 * @param string $date_string Raw date.
	 * @return string|null
	 */
	private static function sanitize_date_string( string $date_string ): ?string {
		$date_string = trim( $date_string );

		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date_string ) ) {
			return null;
		}

		return $date_string;
	}
}
