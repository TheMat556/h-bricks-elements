<?php
/**
 * Calendar settings storage and sanitization.
 *
 * @package H-Bricks-Elements
 */

declare(strict_types=1);

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
			'icon'                => '',
			'publicBooking'       => array(
				'displayName'         => '',
				'defaultServiceLabel' => '',
				'locationLabel'       => '',
			),
			'allowDoubleBookings' => false,
			'adminOnly'           => false,
			'slotSettings'        => array(
				'sessionDuration' => 60,
				'prepTime'        => 0,
				'cleanupTime'     => 0,
				'maxAdvanceDays'  => 0,
			),
			'mailSettings'        => array(
				'enabled'   => true,
				'fromName'  => '',
				'fromEmail' => '',
				'subject'   => 'Booking confirmation',
				'template'  => array(
					'primaryColor'       => '#2563eb',
					'backgroundColor'    => '#f0f4f8',
					'logoUrl'            => '',
					'logoAttachmentId'   => 0,
					'greeting'           => 'Hi {{customerName}},',
					'body'               => 'Your booking has been confirmed. We look forward to seeing you!',
					'footer'             => '© {{calendarName}} — Please do not reply to this email.',
					'showBookingDetails' => true,
					'compiledHtml'       => '',
					'compiledHash'       => '',
					'compiledVersion'    => HBE_Booking_Mail::TEMPLATE_VERSION,
					'compileStatus'      => 'stale',
					'compiledAt'         => '',
					'lastError'          => '',
				),
			),
			'workingHours'        => array(
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
			'services'            => array(),
			'exceptions'          => array(),
			'selectionMode'       => 'single',
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
	 * @param int                 $calendar_id Calendar post ID.
	 * @param array<string,mixed> $settings   Settings to persist.
	 * @return array<string,mixed>|WP_Error
	 */
	public static function update( int $calendar_id, array $settings ) {
		$validation = self::validate_for_update( $settings );
		if ( is_wp_error( $validation ) ) {
			return $validation;
		}

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
			'icon'                => self::sanitize_icon(
				isset( $settings['icon'] ) ? (string) $settings['icon'] : ''
			),
			'allowDoubleBookings' => ! empty( $settings['allowDoubleBookings'] ),
			'adminOnly'           => ! empty( $settings['adminOnly'] ),
			'publicBooking'       => self::sanitize_public_booking(
				isset( $settings['publicBooking'] ) && is_array( $settings['publicBooking'] )
					? $settings['publicBooking']
					: array()
			),
			'slotSettings'        => self::sanitize_slot_settings(
				isset( $settings['slotSettings'] ) && is_array( $settings['slotSettings'] )
					? $settings['slotSettings']
					: array()
			),
			'mailSettings'        => self::sanitize_mail_settings(
				isset( $settings['mailSettings'] ) && is_array( $settings['mailSettings'] )
					? $settings['mailSettings']
					: array()
			),
			'workingHours'        => self::sanitize_working_hours(
				isset( $settings['workingHours'] ) && is_array( $settings['workingHours'] )
					? $settings['workingHours']
					: $defaults['workingHours']
			),
			'services'            => self::sanitize_services(
				isset( $settings['services'] ) && is_array( $settings['services'] )
					? $settings['services']
					: array()
			),
			'exceptions'          => self::sanitize_exceptions(
				isset( $settings['exceptions'] ) && is_array( $settings['exceptions'] )
					? $settings['exceptions']
					: array()
			),
			'selectionMode'       => self::sanitize_selection_mode(
				isset( $settings['selectionMode'] ) ? (string) $settings['selectionMode'] : 'single'
			),
		);
	}

	/**
	 * Validates settings before they are persisted.
	 *
	 * @param array<string,mixed> $settings Raw settings.
	 * @return WP_Error|null
	 */
	private static function validate_for_update( array $settings ) {
		$mail_settings = isset( $settings['mailSettings'] ) && is_array( $settings['mailSettings'] )
			? $settings['mailSettings']
			: array();
		$template      = isset( $mail_settings['template'] ) && is_array( $mail_settings['template'] )
			? $mail_settings['template']
			: array();

		if ( ! empty( $mail_settings['subject'] ) ) {
			$subject_validation = HBE_Booking_Mail::validate_subject_placeholders( (string) $mail_settings['subject'] );
			if ( is_wp_error( $subject_validation ) ) {
				return $subject_validation;
			}
		}

		$mail_enabled = ! empty( $mail_settings['enabled'] );
		$compiled_html = isset( $template['compiledHtml'] ) ? trim( (string) $template['compiledHtml'] ) : '';

		if ( $mail_enabled && '' !== $compiled_html ) {
			return HBE_Booking_Mail::validate_template_payload( $template );
		}

		return null;
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
	 * Sanitizes public booking labels.
	 *
	 * @param array<string,mixed> $public_booking Raw public booking labels.
	 * @return array<string,string>
	 */
	private static function sanitize_public_booking( array $public_booking ): array {
		return array(
			'displayName'         => isset( $public_booking['displayName'] )
				? sanitize_text_field( (string) $public_booking['displayName'] )
				: '',
			'defaultServiceLabel' => isset( $public_booking['defaultServiceLabel'] )
				? sanitize_text_field( (string) $public_booking['defaultServiceLabel'] )
				: '',
			'locationLabel'       => isset( $public_booking['locationLabel'] )
				? sanitize_text_field( (string) $public_booking['locationLabel'] )
				: '',
		);
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
	 * Sanitizes mail settings.
	 *
	 * @param array<string,mixed> $mail_settings Raw mail settings.
	 * @return array<string,mixed>
	 */
	private static function sanitize_mail_settings( array $mail_settings ): array {
		$defaults = self::get_defaults()['mailSettings'];

		return array(
			'enabled'   => array_key_exists( 'enabled', $mail_settings )
				? ! empty( $mail_settings['enabled'] )
				: (bool) $defaults['enabled'],
			'fromName'  => isset( $mail_settings['fromName'] ) ? sanitize_text_field( (string) $mail_settings['fromName'] ) : '',
			'fromEmail' => isset( $mail_settings['fromEmail'] ) ? sanitize_email( (string) $mail_settings['fromEmail'] ) : '',
			'subject'   => isset( $mail_settings['subject'] ) ? sanitize_text_field( (string) $mail_settings['subject'] ) : (string) $defaults['subject'],
			'template'  => self::sanitize_mail_template(
				isset( $mail_settings['template'] ) && is_array( $mail_settings['template'] )
					? $mail_settings['template']
					: array()
			),
		);
	}

	/**
	 * Sanitizes the email template sub-object (public for use by REST handler and other classes).
	 *
	 * @param array<string,mixed> $template Raw template data.
	 * @return array<string,mixed>
	 */
	public static function sanitize_email_template( array $template ): array {
		return self::sanitize_mail_template( $template );
	}

	/**
	 * Sanitizes the mail template structure.
	 *
	 * @param array<string,mixed> $template Raw template data.
	 * @return array<string,mixed>
	 */
	private static function sanitize_mail_template( array $template ): array {
		$defaults  = self::get_defaults()['mailSettings']['template'];
		$primary_color    = isset( $template['primaryColor'] ) ? sanitize_hex_color( (string) $template['primaryColor'] ) : null;
		$background_color = isset( $template['backgroundColor'] ) ? sanitize_hex_color( (string) $template['backgroundColor'] ) : null;

		$sanitized = array(
			'primaryColor'       => ( null !== $primary_color && '' !== $primary_color ) ? $primary_color : $defaults['primaryColor'],
			'backgroundColor'    => ( null !== $background_color && '' !== $background_color ) ? $background_color : $defaults['backgroundColor'],
			'logoUrl'            => isset( $template['logoUrl'] )
				? esc_url_raw( (string) $template['logoUrl'] )
				: '',
			'logoAttachmentId'   => isset( $template['logoAttachmentId'] )
				? absint( $template['logoAttachmentId'] )
				: 0,
			'greeting'           => isset( $template['greeting'] )
				? sanitize_text_field( (string) $template['greeting'] )
				: $defaults['greeting'],
			'body'               => isset( $template['body'] )
				? sanitize_textarea_field( (string) $template['body'] )
				: $defaults['body'],
			'footer'             => isset( $template['footer'] )
				? sanitize_text_field( (string) $template['footer'] )
				: $defaults['footer'],
			'showBookingDetails' => isset( $template['showBookingDetails'] )
				? (bool) $template['showBookingDetails']
				: (bool) $defaults['showBookingDetails'],
			'compiledHtml'       => isset( $template['compiledHtml'] )
				? self::sanitize_compiled_html( (string) $template['compiledHtml'] )
				: '',
		);

		return array_merge( $sanitized, HBE_Booking_Mail::build_template_metadata( $template ) );
	}

	/**
	 * Strips dangerous content from compiled email HTML.
	 *
	 * Uses wp_kses with a curated whitelist of email-safe tags and attributes.
	 *
	 * @param string $html Raw compiled HTML.
	 * @return string
	 */
	private static function sanitize_compiled_html( string $html ): string {
		$allowed_html = array(
			'a'          => array(
				'href'   => true,
				'target' => true,
				'rel'    => true,
				'style'  => true,
			),
			'b'          => array(),
			'body'       => array( 'style' => true ),
			'br'         => array(),
			'center'     => array(),
			'code'       => array(),
			'div'        => array( 'style' => true, 'align' => true ),
			'em'         => array(),
			'font'       => array( 'color' => true, 'face' => true, 'size' => true ),
			'h1'         => array( 'style' => true ),
			'h2'         => array( 'style' => true ),
			'h3'         => array( 'style' => true ),
			'h4'         => array( 'style' => true ),
			'head'       => array(),
			'hr'         => array( 'style' => true ),
			'html'       => array(),
			'i'          => array(),
			'img'        => array(
				'src'    => true,
				'alt'    => true,
				'width'  => true,
				'height' => true,
				'style'  => true,
			),
			'li'         => array( 'style' => true ),
			'meta'       => array( 'charset' => true ),
			'ol'         => array( 'style' => true ),
			'p'          => array( 'style' => true ),
			'pre'        => array(),
			's'          => array(),
			'span'       => array( 'style' => true ),
			'strong'     => array(),
			'style'      => array(),
			'table'      => array(
				'style'       => true,
				'width'       => true,
				'border'      => true,
				'cellpadding' => true,
				'cellspacing' => true,
			),
			'tbody'      => array(),
			'td'         => array(
				'style'   => true,
				'colspan' => true,
				'rowspan' => true,
				'width'   => true,
				'align'   => true,
				'valign'  => true,
			),
			'tfoot'      => array(),
			'th'         => array(
				'style'   => true,
				'colspan' => true,
				'rowspan' => true,
				'width'   => true,
				'align'   => true,
				'valign'  => true,
			),
			'thead'      => array(),
			'title'      => array(),
			'tr'         => array( 'style' => true ),
			'u'          => array(),
			'ul'         => array( 'style' => true ),
		);

		return wp_kses( $html, $allowed_html );
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
				'publicLabel' => isset( $service['publicLabel'] ) ? sanitize_text_field( (string) $service['publicLabel'] ) : '',
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

		list( $year, $month, $day ) = explode( '-', $date_string );
		if ( ! checkdate( (int) $month, (int) $day, (int) $year ) ) {
			return null;
		}

		return $date_string;
	}
}
