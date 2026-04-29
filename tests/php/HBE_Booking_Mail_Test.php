<?php
/**
 * PHPUnit tests for HBE_Booking_Mail.
 *
 * Verifies that wp_mail receives correctly prepared subject, body, recipient,
 * and headers for booking confirmation, test mail, and fallback paths.
 *
 * @package H-Bricks-Elements
 */

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

class HBE_Booking_Mail_Test extends TestCase {

	protected function setUp(): void {
		parent::setUp();
		hbe_test_reset_wp_mail();
		hbe_test_reset_post_meta();
		hbe_test_set_wp_mail_return( true );

		$post              = new WP_Post();
		$post->ID          = 1;
		$post->post_title  = 'Studio Booking';
		$post->post_status = 'publish';
		$post->post_type   = 'hbe_calendar';
		hbe_test_set_post( 1, $post );
	}

	protected function tearDown(): void {
		hbe_test_reset_wp_mail();
		hbe_test_reset_post_meta();
		parent::tearDown();
	}

	/**
	 * Sets calendar settings + mail config for tests via post meta stub.
	 *
	 * @param array<string,mixed> $template_overrides Template subfield overrides.
	 * @param array<string,mixed> $mail_overrides     Mail-level overrides.
	 */
	private function set_mail_config( array $template_overrides = array(), array $mail_overrides = array() ): void {
		$settings = array(
			'mailSettings' => array_merge(
				array(
					'enabled'   => true,
					'subject'   => 'Booking confirmation for {{customerName}}',
					'fromName'  => 'Studio',
					'fromEmail' => 'studio@example.com',
					'template'  => array_merge(
						array(
							'compiledHtml' => '',
							'greeting'     => 'Hi {{customerName}},',
							'body'         => 'Your booking on {{date}} at {{time}} is confirmed.',
						),
						$template_overrides
					),
				),
				$mail_overrides
			),
			'services'     => array(
				array( 'id' => 'svc1', 'name' => 'Haircut' ),
			),
		);

		hbe_test_set_post_meta( 1, '_hbe_calendar_settings', $settings );
	}

	private function get_valid_booking(): array {
		return array(
			'id'            => 42,
			'customerName'  => 'Jane Doe',
			'customerEmail' => 'jane@example.com',
			'serviceId'     => 'svc1',
			'start'         => '2026-05-01 10:00:00',
			'end'           => '2026-05-01 11:00:00',
		);
	}

	public function test_send_booking_email_invokes_wp_mail_with_recipient(): void {
		$this->set_mail_config();

		$result = HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$this->assertTrue( $result );
		$log = hbe_test_get_wp_mail_log();
		$this->assertCount( 1, $log );
		$this->assertSame( 'jane@example.com', $log[0]['to'] );
	}

	public function test_send_booking_email_substitutes_subject_placeholders(): void {
		$this->set_mail_config();

		HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$log = hbe_test_get_wp_mail_log();
		$this->assertSame( 'Booking confirmation for Jane Doe', $log[0]['subject'] );
	}

	public function test_send_booking_email_renders_fallback_body_with_substitutions(): void {
		$this->set_mail_config();

		HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$log = hbe_test_get_wp_mail_log();
		$body = $log[0]['message'];
		$this->assertStringContainsString( 'Hi Jane Doe,', $body );
		$this->assertStringContainsString( 'Your booking on', $body );
		$this->assertStringContainsString( '<html>', $body );
		$this->assertStringNotContainsString( '{{customerName}}', $body );
		$this->assertStringNotContainsString( '{{date}}', $body );
	}

	public function test_send_booking_email_sets_html_content_type_and_from_header(): void {
		$this->set_mail_config();

		HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$log     = hbe_test_get_wp_mail_log();
		$headers = $log[0]['headers'];
		$this->assertContains( 'Content-Type: text/html; charset=UTF-8', $headers );

		$has_from = false;
		foreach ( $headers as $header ) {
			if ( str_starts_with( $header, 'From: Studio <studio@example.com>' ) ) {
				$has_from = true;
			}
		}
		$this->assertTrue( $has_from, 'Expected From header with name and email' );
	}

	public function test_send_booking_email_strips_header_injection_in_from_name(): void {
		$this->set_mail_config(
			array(),
			array( 'fromName' => "Attacker\r\nBcc: leak@evil.com" )
		);

		HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$log = hbe_test_get_wp_mail_log();
		foreach ( $log[0]['headers'] as $header ) {
			$this->assertStringNotContainsString( "\r", $header );
			$this->assertStringNotContainsString( "\n", $header );
		}
	}

	public function test_send_booking_email_returns_wp_error_when_disabled(): void {
		$this->set_mail_config( array(), array( 'enabled' => false ) );

		$result = HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_mail_disabled', $result->get_error_code() );
		$this->assertSame( array(), hbe_test_get_wp_mail_log() );
	}

	public function test_send_booking_email_returns_wp_error_for_invalid_recipient(): void {
		$this->set_mail_config();
		$booking                    = $this->get_valid_booking();
		$booking['customerEmail']   = 'not-an-email';

		$result = HBE_Booking_Mail::send_booking_email( 1, $booking );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_invalid_recipient', $result->get_error_code() );
		$this->assertSame( array(), hbe_test_get_wp_mail_log() );
	}

	public function test_send_booking_email_returns_wp_error_when_calendar_missing(): void {
		$this->set_mail_config();

		$result = HBE_Booking_Mail::send_booking_email( 999, $this->get_valid_booking() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_calendar_not_found', $result->get_error_code() );
	}

	public function test_send_booking_email_propagates_wp_mail_failure(): void {
		$this->set_mail_config();
		hbe_test_set_wp_mail_return( false );

		$result = HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_mail_failed', $result->get_error_code() );
		$this->assertCount( 1, hbe_test_get_wp_mail_log() );
	}

	public function test_send_booking_email_uses_compiled_html_when_present(): void {
		$compiled = '<html><body><p>Hello {{customerName}}</p><p>{{date}} {{time}}</p></body></html>';
		$this->set_mail_config(
			array(
				'compiledHtml'    => $compiled,
				'compiledHash'    => 'abc',
				'compiledVersion' => HBE_Booking_Mail::TEMPLATE_VERSION,
				'compileStatus'   => 'compiled',
			)
		);

		HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$log  = hbe_test_get_wp_mail_log();
		$body = $log[0]['message'];
		$this->assertStringContainsString( 'Hello Jane Doe', $body );
		$this->assertStringNotContainsString( '{{customerName}}', $body );
		$this->assertStringNotContainsString( '{{date}}', $body );
	}

	public function test_send_booking_email_test_mode_requires_compiled_html(): void {
		$this->set_mail_config();

		$result = HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking(), array( 'is_test' => true ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_template_not_compiled', $result->get_error_code() );
		$this->assertSame( array(), hbe_test_get_wp_mail_log() );
	}

	public function test_send_booking_email_test_mode_uses_test_subject(): void {
		$compiled = '<html><body>{{customerName}}</body></html>';
		$this->set_mail_config(
			array(
				'compiledHtml'    => $compiled,
				'compiledHash'    => 'abc',
				'compiledVersion' => HBE_Booking_Mail::TEMPLATE_VERSION,
				'compileStatus'   => 'compiled',
			)
		);

		HBE_Booking_Mail::send_booking_email(
			1,
			$this->get_valid_booking(),
			array( 'is_test' => true, 'to' => 'tester@example.com' )
		);

		$log = hbe_test_get_wp_mail_log();
		$this->assertSame( 'tester@example.com', $log[0]['to'] );
		$this->assertSame( 'H-Bricks Mail Test', $log[0]['subject'] );
	}

	public function test_send_booking_email_rejects_unknown_subject_placeholders(): void {
		$this->set_mail_config(
			array(),
			array( 'subject' => 'Hello {{unknownPlaceholder}}' )
		);

		$result = HBE_Booking_Mail::send_booking_email( 1, $this->get_valid_booking() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( array(), hbe_test_get_wp_mail_log() );
	}
}
