<?php
/**
 * PHPUnit tests for the cancel flow HMAC verification.
 *
 * @package H-Bricks-Elements
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * Tests HBE_Plugin cancel token generation, URL building, and handle_cancel_page.
 */
final class HBE_Rest_Cancel_Test extends TestCase {

	private int $booking_id = 42;
	private int $calendar_id = 7;

	protected function tearDown(): void {
		$_GET  = array();
		$_POST = array();
		unset( $_SERVER['REQUEST_METHOD'] );
		parent::tearDown();
	}

	/**
	 * generate_cancel_token must produce a SHA-256 HMAC that matches a manual hash_hmac call.
	 */
	public function test_generate_cancel_token_produces_verifiable_hmac(): void {
		$token = HBE_Plugin::generate_cancel_token( $this->booking_id, $this->calendar_id );

		$expected = hash_hmac( 'sha256', $this->booking_id . ':' . $this->calendar_id, wp_salt( 'auth' ) );

		self::assertSame( $expected, $token );
		self::assertSame( 64, strlen( $token ) );
	}

	/**
	 * generate_cancel_url must build a home URL containing the booking params and token.
	 */
	public function test_generate_cancel_url_builds_url_with_token(): void {
		$url = HBE_Plugin::generate_cancel_url( $this->booking_id, $this->calendar_id );

		self::assertStringContainsString( 'hbe_cancel_booking=1', $url );
		self::assertStringContainsString( 'id=' . $this->booking_id, $url );
		self::assertStringContainsString( 'cal=' . $this->calendar_id, $url );
		self::assertStringContainsString( 'token=', $url );

		$expected_token = HBE_Plugin::generate_cancel_token( $this->booking_id, $this->calendar_id );
		self::assertStringContainsString( 'token=' . urlencode( $expected_token ), $url );
	}

	/**
	 * Valid token + valid POST nonce should delete the booking and render the success state.
	 */
	public function test_handle_cancel_page_with_valid_token_and_nonce_deletes_booking(): void {
		$token = HBE_Plugin::generate_cancel_token( $this->booking_id, $this->calendar_id );
		$nonce = wp_create_nonce( 'hbe_cancel_' . $this->booking_id . '_' . $this->calendar_id );

		$get  = array(
			'hbe_cancel_booking' => '1',
			'id'                 => (string) $this->booking_id,
			'cal'                => (string) $this->calendar_id,
			'token'              => $token,
		);
		$post = array(
			'hbe_confirm_cancel' => '1',
			'_wpnonce'           => $nonce,
		);

		$output = $this->run_cancel_page_in_subprocess( $get, $post, 'POST', true );

		self::assertStringContainsString( '"state":"success"', $output );
	}

	/**
	 * A single-character modification of the token must fail hash_equals and render an error.
	 */
	public function test_handle_cancel_page_rejects_tampered_token(): void {
		$token    = HBE_Plugin::generate_cancel_token( $this->booking_id, $this->calendar_id );
		$tampered = substr( $token, 0, -1 ) . ( substr( $token, -1 ) === 'a' ? 'b' : 'a' );

		$get = array(
			'hbe_cancel_booking' => '1',
			'id'                 => (string) $this->booking_id,
			'cal'                => (string) $this->calendar_id,
			'token'              => $tampered,
		);

		$output = $this->run_cancel_page_in_subprocess( $get, array(), 'GET', true );

		self::assertStringContainsString( '"state":"error"', $output );
		self::assertStringContainsString( 'This cancellation link is invalid or has expired.', $output );
	}

	/**
	 * After a successful cancellation the booking no longer exists. Replaying the same
	 * request should fail because HBE_Bookings::delete returns a WP_Error.
	 */
	public function test_handle_cancel_page_rejects_replayed_request_after_successful_cancel(): void {
		$token = HBE_Plugin::generate_cancel_token( $this->booking_id, $this->calendar_id );
		$nonce = wp_create_nonce( 'hbe_cancel_' . $this->booking_id . '_' . $this->calendar_id );

		$get  = array(
			'hbe_cancel_booking' => '1',
			'id'                 => (string) $this->booking_id,
			'cal'                => (string) $this->calendar_id,
			'token'              => $token,
		);
		$post = array(
			'hbe_confirm_cancel' => '1',
			'_wpnonce'           => $nonce,
		);

		// First request: booking still exists -> success page.
		$first_output = $this->run_cancel_page_in_subprocess( $get, $post, 'POST', true );
		self::assertStringContainsString( '"state":"success"', $first_output );

		// Second request: booking already deleted -> error page.
		$second_output = $this->run_cancel_page_in_subprocess( $get, $post, 'POST', false );
		self::assertStringContainsString( '"state":"error"', $second_output );
		self::assertStringContainsString( 'Booking not found.', $second_output );
	}

	/**
	 * Runs handle_cancel_page in a separate PHP process so that exit() does not kill the test runner.
	 *
	 * @param array<string,mixed> $get           GET parameters.
	 * @param array<string,mixed> $post          POST parameters.
	 * @param string              $method        HTTP method.
	 * @param bool                $booking_exists Whether the mock DB should return a row for the booking.
	 * @return string Process stdout (HTML output or error messages).
	 */
	private function run_cancel_page_in_subprocess( array $get, array $post, string $method = 'POST', bool $booking_exists = true ): string {
		$bootstrap = __DIR__ . '/bootstrap.php';

		// Stubs for WordPress helpers not defined in bootstrap but required by render_cancel_page.
		// A wpdb mock that supplies get_row so HBE_Bookings::delete can locate the row.
		$mock_wpdb = <<<'MOCK'
class MockWpdb {
	public $prefix = 'wp_';
	public $last_error = '';
	public $insert_id = 1;
	public $rows_affected = 1;
	private $booking_exists;

	public function __construct( bool $booking_exists = true ) {
		$this->booking_exists = $booking_exists;
	}

	public function get_row( $query = null, $output = OBJECT ) {
		if ( ! $this->booking_exists ) {
			return null;
		}
		return array(
			'id'               => 42,
			'calendar_id'      => 7,
			'service_id'       => 'svc1',
			'status'           => 'confirmed',
			'customer_name'    => 'Test User',
			'customer_email'   => 'test@example.com',
			'customer_phone'   => '',
			'customer_notes'   => '',
			'start_datetime'   => '2026-04-24 10:00:00',
			'end_datetime'     => '2026-04-24 11:00:00',
			'timezone'         => 'UTC',
			'meta'             => '',
			'created_at'       => '2026-04-24 09:00:00',
			'updated_at'       => '2026-04-24 09:00:00',
		);
	}

	public function delete( $table, $where, $where_format = null ) {
		$this->rows_affected = 1;
		return 1;
	}

	public function prepare( $query, ...$args ) {
		$count = substr_count( $query, '%s' ) + substr_count( $query, '%d' ) + substr_count( $query, '%f' );
		if ( $count === count( $args ) ) {
			$query = str_replace( "'%s'", '%s', $query );
			$query = str_replace( '%s', "'%s'", $query );
			return vsprintf( $query, $args );
		}
		return $query;
	}
}
MOCK;

		$get_export  = var_export( $get, true );
		$post_export = var_export( $post, true );
		$method_export = var_export( $method, true );
		$exists_export = $booking_exists ? 'true' : 'false';

		$script = <<<PHP
<?php
require '{$bootstrap}';
{$mock_wpdb}
\$GLOBALS['wpdb'] = new MockWpdb( {$exists_export} );
\$_GET  = {$get_export};
\$_POST = {$post_export};
\$_SERVER['REQUEST_METHOD'] = {$method_export};
HBE_Plugin::handle_cancel_page();
PHP;

		$temp_file = tempnam( sys_get_temp_dir(), 'hbe_test_' ) . '.php';
		file_put_contents( $temp_file, $script );
		$output = (string) shell_exec( 'php ' . escapeshellarg( $temp_file ) . ' 2>&1' );
		unlink( $temp_file );

		return $output;
	}
}
