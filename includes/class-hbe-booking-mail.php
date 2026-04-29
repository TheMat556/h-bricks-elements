<?php
/**
 * Shared booking email preparation, validation, and delivery.
 *
 * @package H-Bricks-Elements
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles booking email validation, rendering, and sending.
 */
class HBE_Booking_Mail {

	/**
	 * Stored template artifact version.
	 *
	 * @var int
	 */
	const TEMPLATE_VERSION = 1;

	/**
	 * Supported template placeholders.
	 *
	 * @var string[]
	 */
	const PLACEHOLDERS = array(
		'{{logoUrl}}',
		'{{customerName}}',
		'{{calendarName}}',
		'{{date}}',
		'{{time}}',
		'{{service}}',
		'{{cancelUrl}}',
	);

	/**
	 * Context for the wp_mail_failed hook.
	 *
	 * @var array<string,mixed>|null
	 */
	private static $active_mail_context = null;

	/**
	 * Returns the active mail context.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_active_mail_context(): array {
		return is_array( self::$active_mail_context ) ? self::$active_mail_context : array();
	}

	/**
	 * Returns supported template placeholders.
	 *
	 * @return string[]
	 */
	public static function get_supported_placeholders(): array {
		return self::PLACEHOLDERS;
	}

	/**
	 * Builds template metadata persisted with the compiled HTML artifact.
	 *
	 * @param array<string,mixed> $template Raw or sanitized template settings.
	 * @return array<string,mixed>
	 */
	public static function build_template_metadata( array $template ): array {
		$compiled_html = isset( $template['compiledHtml'] ) ? trim( (string) $template['compiledHtml'] ) : '';
		$compiled_hash = '' !== $compiled_html ? self::build_template_hash( $compiled_html ) : '';
		$compiled_at   = isset( $template['compiledAt'] ) ? sanitize_text_field( (string) $template['compiledAt'] ) : '';

		if ( '' !== $compiled_hash && '' === $compiled_at ) {
			$compiled_at = gmdate( 'c' );
		}

		return array(
			'compiledHash'    => $compiled_hash,
			'compiledVersion' => self::TEMPLATE_VERSION,
			'compileStatus'   => '' !== $compiled_hash ? 'compiled' : 'stale',
			'compiledAt'      => $compiled_at,
			'lastError'       => '',
		);
	}

	/**
	 * Validates a template payload before it is persisted or sent.
	 *
	 * @param array<string,mixed> $template Template settings.
	 * @return WP_Error|null
	 */
	public static function validate_template_payload( array $template ) {
		$compiled_html = isset( $template['compiledHtml'] ) ? trim( (string) $template['compiledHtml'] ) : '';

		if ( '' === $compiled_html ) {
			return new WP_Error(
				'hbe_template_not_compiled',
				__( 'The email template must be compiled before it can be saved or sent.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		if ( false === stripos( $compiled_html, '<html' ) || false === stripos( $compiled_html, '<body' ) ) {
			return new WP_Error(
				'hbe_template_invalid_html',
				__( 'The compiled email template is invalid.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$editable_fields = array(
			(string) ( $template['greeting'] ?? '' ),
			(string) ( $template['body'] ?? '' ),
			(string) ( $template['footer'] ?? '' ),
		);

		foreach ( $editable_fields as $field_value ) {
			$placeholder_error = self::validate_placeholder_usage( $field_value );
			if ( is_wp_error( $placeholder_error ) ) {
				return $placeholder_error;
			}
		}

		$compiled_placeholder_error = self::validate_placeholder_usage( $compiled_html );
		if ( is_wp_error( $compiled_placeholder_error ) ) {
			return $compiled_placeholder_error;
		}

		return null;
	}

	/**
	 * Validates subject placeholder usage.
	 *
	 * @param string $subject Mail subject.
	 * @return WP_Error|null
	 */
	public static function validate_subject_placeholders( string $subject ) {
		return self::validate_placeholder_usage( $subject );
	}

	/**
	 * Prepares a booking email without sending it.
	 *
	 * @param int                 $calendar_id Calendar post ID.
	 * @param array<string,mixed> $booking    Booking payload.
	 * @param array<string,mixed> $options    Preparation options.
	 * @return array<string,mixed>|WP_Error
	 */
	public static function prepare_booking_email( int $calendar_id, array $booking, array $options = array() ) {
		$is_test       = ! empty( $options['is_test'] );
		$force_enabled = ! empty( $options['force_enabled'] );
		$settings      = HBE_Calendar_Settings::get( $calendar_id );
		$mail          = isset( $settings['mailSettings'] ) && is_array( $settings['mailSettings'] )
			? $settings['mailSettings']
			: array();

		if ( ! $is_test && ! $force_enabled && empty( $mail['enabled'] ) ) {
			return new WP_Error(
				'hbe_mail_disabled',
				__( 'Booking confirmation emails are disabled for this calendar.', 'h-bricks-elements' ),
				array( 'status' => 409 )
			);
		}

		$to = isset( $options['to'] ) ? sanitize_email( (string) $options['to'] ) : sanitize_email( (string) ( $booking['customerEmail'] ?? '' ) );
		if ( ! is_email( $to ) ) {
			return new WP_Error(
				'hbe_invalid_recipient',
				__( 'A valid recipient email address is required.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$per_calendar_template = isset( $mail['template'] ) && is_array( $mail['template'] ) ? $mail['template'] : array();
		$global_template       = get_option( 'hbe_email_template', array() );
		$template              = ! empty( $per_calendar_template ) ? $per_calendar_template : $global_template;
		$compiled_html = isset( $template['compiledHtml'] ) ? trim( (string) $template['compiledHtml'] ) : '';

		$calendar_post = get_post( $calendar_id );
		if ( ! $calendar_post ) {
			return new WP_Error(
				'hbe_calendar_not_found',
				__( 'Calendar not found.', 'h-bricks-elements' ),
				array( 'status' => 404 )
			);
		}

		$vars = self::build_template_vars( $calendar_id, $calendar_post, $settings, $booking, $options );

		if ( '' !== $compiled_html ) {
			// Validate only when compiled HTML exists (test emails always require it).
			if ( $is_test ) {
				$template_validation = self::validate_template_payload( $template );
				if ( is_wp_error( $template_validation ) ) {
					return $template_validation;
				}
			}

			$body = str_replace( array_keys( $vars ), array_values( $vars ), $compiled_html );
			$body = (string) preg_replace( '/<img\b[^>]*src=["\']\s*["\'][^>]*>/i', '', $body );
		} else {
			if ( $is_test ) {
				return new WP_Error(
					'hbe_template_not_compiled',
					__( 'The email template must be compiled before it can be sent. Save the calendar settings first.', 'h-bricks-elements' ),
					array( 'status' => 400 )
				);
			}

			// Fallback plain HTML email when template has not been compiled yet.
			$customer_name  = esc_html( $vars['{{customerName}}'] ?? $to );
			$date           = esc_html( $vars['{{date}}'] ?? '' );
			$time_str       = esc_html( $vars['{{time}}'] ?? '' );
			$cancel_url     = esc_url( $vars['{{cancelUrl}}'] ?? '' );
			$greeting_text  = isset( $template['greeting'] ) ? str_replace( array_keys( $vars ), array_values( $vars ), esc_html( (string) $template['greeting'] ) ) : 'Hi ' . $customer_name . ',';
			$body_text      = isset( $template['body'] ) ? str_replace( array_keys( $vars ), array_values( $vars ), esc_html( (string) $template['body'] ) ) : 'Your booking has been confirmed.';

			$body = '<html><body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:32px 16px">'
				. '<p>' . nl2br( $greeting_text ) . '</p>'
				. '<p>' . nl2br( $body_text ) . '</p>'
				. ( $date ? '<p><strong>Date:</strong> ' . $date . '</p>' : '' )
				. ( $time_str ? '<p><strong>Time:</strong> ' . $time_str . '</p>' : '' )
				. ( $cancel_url ? '<p><a href="' . $cancel_url . '">Cancel booking</a></p>' : '' )
				. '</body></html>';

			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( '[HBE] send_booking_confirmation: compiledHtml is empty for calendar ' . $calendar_id . '. Using fallback email. Open admin settings and save to compile the template.' );
			}
		}

		if ( '' === trim( $body ) ) {
			return new WP_Error(
				'hbe_empty_mail_body',
				__( 'The rendered email body is empty.', 'h-bricks-elements' ),
				array( 'status' => 400 )
			);
		}

		$subject_template = $is_test ? __( 'H-Bricks Mail Test', 'h-bricks-elements' ) : (string) ( $mail['subject'] ?? __( 'Booking confirmation', 'h-bricks-elements' ) );
		$subject_validation = self::validate_subject_placeholders( $subject_template );
		if ( is_wp_error( $subject_validation ) ) {
			return $subject_validation;
		}

		$subject = str_replace( array_keys( $vars ), array_values( $vars ), $subject_template );
		$headers = array( 'Content-Type: text/html; charset=UTF-8' );

		$from_header = self::build_from_header(
			isset( $mail['fromName'] ) ? (string) $mail['fromName'] : '',
			isset( $mail['fromEmail'] ) ? (string) $mail['fromEmail'] : ''
		);
		if ( '' !== $from_header ) {
			$headers[] = $from_header;
		}

		return array(
			'to'               => $to,
			'subject'          => $subject,
			'body'             => $body,
			'headers'          => $headers,
			'templateHash'     => '' !== $compiled_html ? (string) ( $template['compiledHash'] ?? self::build_template_hash( $compiled_html ) ) : '',
			'templateVersion'  => (int) ( $template['compiledVersion'] ?? self::TEMPLATE_VERSION ),
			'calendarId'       => $calendar_id,
			'bookingId'        => isset( $booking['id'] ) ? (int) $booking['id'] : 0,
			'isTest'           => $is_test,
			'compileStatus'    => '' !== $compiled_html ? (string) ( $template['compileStatus'] ?? 'compiled' ) : 'stale',
			'compiledAt'       => (string) ( $template['compiledAt'] ?? '' ),
		);
	}

	/**
	 * Sends a booking email.
	 *
	 * @param int                 $calendar_id Calendar post ID.
	 * @param array<string,mixed> $booking    Booking payload.
	 * @param array<string,mixed> $options    Send options.
	 * @return bool|WP_Error
	 */
	public static function send_booking_email( int $calendar_id, array $booking, array $options = array() ) {
		$prepared = self::prepare_booking_email( $calendar_id, $booking, $options );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}

		self::$active_mail_context = array(
			'calendarId'      => $prepared['calendarId'],
			'bookingId'       => $prepared['bookingId'],
			'templateHash'    => $prepared['templateHash'],
			'templateVersion' => $prepared['templateVersion'],
			'isTest'          => $prepared['isTest'],
		);

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log(
				sprintf(
					'[HBE] booking_mail sending calendar=%d booking=%d templateHash=%s version=%d test=%s',
					(int) $prepared['calendarId'],
					(int) $prepared['bookingId'],
					(string) $prepared['templateHash'],
					(int) $prepared['templateVersion'],
					! empty( $prepared['isTest'] ) ? 'yes' : 'no'
				)
			);
		}

		try {
			$sent = wp_mail(
				(string) $prepared['to'],
				(string) $prepared['subject'],
				(string) $prepared['body'],
				(array) $prepared['headers']
			);
		} finally {
			self::$active_mail_context = null;
		}

		if ( ! $sent ) {
			return new WP_Error(
				'hbe_mail_failed',
				__( 'Email could not be sent. Check your site mail configuration.', 'h-bricks-elements' ),
				array(
					'calendarId'   => $prepared['calendarId'],
					'bookingId'    => $prepared['bookingId'],
					'templateHash' => $prepared['templateHash'],
				)
			);
		}

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log(
				sprintf(
					'[HBE] booking_mail sent calendar=%d booking=%d templateHash=%s',
					(int) $prepared['calendarId'],
					(int) $prepared['bookingId'],
					(string) $prepared['templateHash']
				)
			);
		}

		return true;
	}

	/**
	 * Returns a sample booking payload for test emails.
	 *
	 * @param int    $calendar_id Calendar post ID.
	 * @param string $recipient Recipient address.
	 * @return array<string,mixed>
	 */
	public static function build_test_booking_payload( int $calendar_id, string $recipient ): array {
		$start = gmdate( 'c', strtotime( '2026-01-12 10:00:00 UTC' ) );
		$end   = gmdate( 'c', strtotime( '2026-01-12 11:00:00 UTC' ) );

		return array(
			'id'            => 0,
			'customerName'  => 'Jane Smith',
			'customerEmail' => $recipient,
			'start'         => $start,
			'end'           => $end,
			'serviceId'     => self::get_first_service_id( $calendar_id ),
		);
	}

	/**
	 * Builds a stable hash for a compiled template.
	 *
	 * @param string $compiled_html Compiled template HTML.
	 * @return string
	 */
	public static function build_template_hash( string $compiled_html ): string {
		return hash( 'sha256', self::TEMPLATE_VERSION . '|' . $compiled_html );
	}

	/**
	 * Validates placeholder usage within a string.
	 *
	 * @param string $content String to inspect.
	 * @return WP_Error|null
	 */
	private static function validate_placeholder_usage( string $content ) {
		if ( ! preg_match_all( '/{{[^}]+}}/', $content, $matches ) ) {
			return null;
		}

		$placeholders = isset( $matches[0] ) && is_array( $matches[0] ) ? array_unique( $matches[0] ) : array();
		$unknown      = array_values( array_diff( $placeholders, self::PLACEHOLDERS ) );

		if ( empty( $unknown ) ) {
			return null;
		}

		return new WP_Error(
			'hbe_unknown_template_placeholder',
			sprintf(
				/* translators: %s: comma-separated placeholder list */
				__( 'Unknown email template placeholder(s): %s', 'h-bricks-elements' ),
				implode( ', ', $unknown )
			),
			array( 'status' => 400 )
		);
	}

	/**
	 * Builds runtime template variables for a booking email.
	 *
	 * @param int                 $calendar_id Calendar post ID.
	 * @param WP_Post             $calendar_post Calendar post.
	 * @param array<string,mixed> $settings   Calendar settings.
	 * @param array<string,mixed> $booking    Booking payload.
	 * @param array<string,mixed> $options    Render options.
	 * @return array<string,string>
	 */
	private static function build_template_vars( int $calendar_id, WP_Post $calendar_post, array $settings, array $booking, array $options ): array {
		$start_ts = ! empty( $booking['start'] ) ? strtotime( (string) $booking['start'] ) : 0;
		$end_ts   = ! empty( $booking['end'] ) ? strtotime( (string) $booking['end'] ) : 0;
		$date     = $start_ts ? wp_date( 'l, j F Y', $start_ts ) : '';
		$time     = $start_ts ? wp_date( 'H:i', $start_ts ) . ( $end_ts ? ' – ' . wp_date( 'H:i', $end_ts ) : '' ) : '';
		$service  = self::resolve_service_name( $settings, isset( $booking['serviceId'] ) ? (string) $booking['serviceId'] : '' );
		$global_template  = get_option( 'hbe_email_template', array() );
		$per_calendar_logo_source = isset( $settings['mailSettings']['template'] ) && is_array( $settings['mailSettings']['template'] ) ? $settings['mailSettings']['template'] : array();
		$logo_source      = ! empty( $per_calendar_logo_source ) ? $per_calendar_logo_source : $global_template;
		$logo_url = self::resolve_email_logo_url( $logo_source );

		if ( ! empty( $options['cancelUrl'] ) ) {
			$cancel_url = esc_url( (string) $options['cancelUrl'] );
		} elseif ( ! empty( $booking['id'] ) ) {
			$cancel_url = esc_url( HBE_Plugin::generate_cancel_url( (int) $booking['id'], $calendar_id ) );
		} else {
			$cancel_url = esc_url( add_query_arg( 'hbe_cancel', 'example', home_url( '/' ) ) );
		}

		$customer_name = ! empty( $booking['customerName'] ) ? (string) $booking['customerName'] : (string) ( $booking['customerEmail'] ?? '' );

		return array(
			'{{logoUrl}}'      => $logo_url,
			'{{customerName}}' => esc_html( $customer_name ),
			'{{calendarName}}' => esc_html( $calendar_post->post_title ),
			'{{date}}'         => esc_html( $date ),
			'{{time}}'         => esc_html( $time ),
			'{{service}}'      => esc_html( $service ),
			'{{cancelUrl}}'    => $cancel_url,
		);
	}

	/**
	 * Builds a From header if one is configured.
	 *
	 * @param string $from_name  Mail From name.
	 * @param string $from_email Mail From email.
	 * @return string
	 */
	private static function build_from_header( string $from_name, string $from_email ): string {
		$from_email = sanitize_email( $from_email );
		if ( ! is_email( $from_email ) ) {
			return '';
		}

		$from_name = trim( preg_replace( '/[\r\n\0\x{2028}\x{2029}]+/u', ' ', sanitize_text_field( $from_name ) ) );
		if ( '' === $from_name ) {
			return 'From: <' . $from_email . '>';
		}

		return 'From: ' . $from_name . ' <' . $from_email . '>';
	}

	/**
	 * Resolves a service name for the booking service ID.
	 *
	 * @param array<string,mixed> $settings Calendar settings.
	 * @param string              $service_id Service ID.
	 * @return string
	 */
	private static function resolve_service_name( array $settings, string $service_id ): string {
		if ( '' === $service_id || empty( $settings['services'] ) || ! is_array( $settings['services'] ) ) {
			return '';
		}

		foreach ( $settings['services'] as $service ) {
			if ( (string) ( $service['id'] ?? '' ) === $service_id ) {
				return (string) ( $service['name'] ?? '' );
			}
		}

		return '';
	}

	/**
	 * Resolves an email-safe logo URL.
	 *
	 * @param array<string,mixed> $template Template settings.
	 * @return string
	 */
	private static function resolve_email_logo_url( array $template ): string {
		$logo_attachment_id = isset( $template['logoAttachmentId'] ) ? absint( $template['logoAttachmentId'] ) : 0;
		if ( $logo_attachment_id > 0 ) {
			$sizes = array( 'medium_large', 'large', 'medium', 'thumbnail', 'full' );
			foreach ( $sizes as $size ) {
				$size_url = wp_get_attachment_image_url( $logo_attachment_id, $size );
				if ( ! $size_url ) {
					continue;
				}

				$normalized_size_url = HBE_Plugin::normalize_email_logo_url( $size_url );
				if ( '' !== $normalized_size_url ) {
					return $normalized_size_url;
				}
			}
		}

		$logo_url = HBE_Plugin::normalize_email_logo_url( (string) ( $template['logoUrl'] ?? '' ) );
		if ( '' !== $logo_url ) {
			return $logo_url;
		}

		return HBE_Plugin::normalize_email_logo_url( HBE_Plugin::get_site_logo_url( 128 ) );
	}

	/**
	 * Returns the first configured service ID for a calendar.
	 *
	 * @param int $calendar_id Calendar post ID.
	 * @return string
	 */
	private static function get_first_service_id( int $calendar_id ): string {
		$settings = HBE_Calendar_Settings::get( $calendar_id );
		if ( empty( $settings['services'] ) || ! is_array( $settings['services'] ) ) {
			return '';
		}

		$first_service = $settings['services'][0] ?? array();
		return is_array( $first_service ) ? (string) ( $first_service['id'] ?? '' ) : '';
	}
}
