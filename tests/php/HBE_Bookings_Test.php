<?php
/**
 * PHPUnit tests for HBE_Bookings.
 *
 * @package H-Bricks-Elements
 */

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

// ------------------------------------------------------------------
// Enhanced mock with get_row() and query-capturing abilities
// ------------------------------------------------------------------
class HBE_Bookings_Test_MockWpdb {
	public $prefix = 'wp_';
	public $last_error = '';
	public $insert_id = 1;
	public $rows_affected = 1;

	/** @var array<int,array<string,mixed>> */
	public $captured = array();

	/** @var array<int,array<string,mixed>|null> */
	public $mock_get_row = array();

	/** @var array<string,mixed> */
	public $mock_get_var = array();

	/** @var int|false */
	public $mock_insert = 1;

	/** @var int|false */
	public $mock_update = 1;

	/** @var array<int,array<string,mixed>> */
	public $mock_get_results = array();

	/** @var int */
	public $mock_delete = 1;

	public function get_results( $query = null, $output = OBJECT ) {
		$this->captured[] = array( 'method' => 'get_results', 'query' => $query );
		return $this->mock_get_results;
	}

	public function get_var( $query = null, $x = 0, $y = 0 ) {
		$this->captured[] = array( 'method' => 'get_var', 'query' => $query );
		if ( ! empty( $this->mock_get_var ) ) {
			foreach ( $this->mock_get_var as $pattern => $value ) {
				if ( '*' === $pattern || strpos( $query, $pattern ) !== false ) {
					return $value;
				}
			}
		}
		return null;
	}

	public function get_row( $query = null, $output = OBJECT, $y = 0 ) {
		$this->captured[] = array( 'method' => 'get_row', 'query' => $query );
		if ( ! empty( $this->mock_get_row ) ) {
			return array_shift( $this->mock_get_row );
		}
		return null;
	}

	public function get_col( $query = null, $x = 0 ) {
		return array();
	}

	public function prepare( $query, ...$args ) {
		$count = substr_count( $query, '%s' ) + substr_count( $query, '%d' ) + substr_count( $query, '%f' ) + substr_count( $query, '%i' );
		if ( $count === count( $args ) ) {
			// Replace %i (identifier) with backtick-quoted string
			$formatted = $query;
			$idx = 0;
			$formatted = preg_replace_callback( '/%i/', function () use ( &$idx, $args ) {
				return '`' . str_replace( '`', '``', (string) $args[ $idx++ ] ) . '`';
			}, $formatted );
			$formatted = preg_replace_callback( '/%d/', function () use ( &$idx, $args ) {
				return (int) $args[ $idx++ ];
			}, $formatted );
			$formatted = preg_replace_callback( '/%f/', function () use ( &$idx, $args ) {
				return (float) $args[ $idx++ ];
			}, $formatted );
			$formatted = preg_replace_callback( '/%s/', function () use ( &$idx, $args ) {
				return "'" . addslashes( (string) $args[ $idx++ ] ) . "'";
			}, $formatted );
			return $formatted;
		}
		return $query;
	}

	public function insert( $table, $data, $format = null ) {
		$this->captured[] = array( 'method' => 'insert', 'table' => $table, 'data' => $data );
		if ( false !== $this->mock_insert ) {
			++$this->insert_id;
		}
		return $this->mock_insert;
	}

	public function update( $table, $data, $where, $format = null, $where_format = null ) {
		$this->captured[] = array( 'method' => 'update', 'table' => $table, 'data' => $data, 'where' => $where );
		return $this->mock_update;
	}

	public function delete( $table, $where, $where_format = null ) {
		return $this->mock_delete;
	}

	public function query( $query ) {
		return 0;
	}
}

// ------------------------------------------------------------------
// Test class
// ------------------------------------------------------------------
class HBE_Bookings_Test extends TestCase {

	private $original_wpdb;

	/** @var HBE_Bookings_Test_MockWpdb */
	private $wpdb;

	protected function setUp(): void {
		parent::setUp();
		$this->original_wpdb = $GLOBALS['wpdb'];
		$GLOBALS['wpdb']     = new HBE_Bookings_Test_MockWpdb();
		$this->wpdb          = $GLOBALS['wpdb'];
	}

	protected function tearDown(): void {
		$GLOBALS['wpdb'] = $this->original_wpdb;
		parent::tearDown();
	}

	/**
	 * Returns a valid create/update payload.
	 *
	 * @return array<string,mixed>
	 */
	private function get_valid_payload(): array {
		return array(
			'title'         => 'John Doe',
			'start'         => '2026-04-25 10:00:00',
			'end'           => '2026-04-25 11:00:00',
			'customerEmail' => 'john@example.com',
			'serviceId'     => 'svc1',
			'status'        => 'confirmed',
			'timezone'      => 'UTC',
		);
	}

	/**
	 * Returns a raw booking row for get_row mock responses.
	 *
	 * @param int                   $id       Booking ID.
	 * @param array<string,mixed> $overrides Key/value overrides.
	 * @return array<string,mixed>
	 */
	private function get_booking_row( int $id, array $overrides = array() ): array {
		return array_merge(
			array(
				'id'             => $id,
				'calendar_id'    => 1,
				'service_id'     => 'svc1',
				'status'         => 'confirmed',
				'customer_name'  => 'John Doe',
				'customer_email' => 'john@example.com',
				'customer_phone' => '',
				'customer_notes' => '',
				'start_datetime' => '2026-04-25 10:00:00',
				'end_datetime'   => '2026-04-25 11:00:00',
				'timezone'       => 'UTC',
				'meta'           => '',
				'created_at'     => '2026-04-24 12:00:00',
				'updated_at'     => '2026-04-24 12:00:00',
			),
			$overrides
		);
	}

	// ================================================================
	// CREATE
	// ================================================================

	public function test_create_success(): void {
		$this->wpdb->mock_insert   = 1;
		$this->wpdb->insert_id     = 123;
		$this->wpdb->mock_get_row  = array( $this->get_booking_row( 123 ) );

		$result = HBE_Bookings::create( 1, $this->get_valid_payload() );

		$this->assertIsArray( $result );
		$this->assertSame( 123, $result['id'] );
		$this->assertSame( 'John Doe', $result['customerName'] );
		$this->assertSame( 'john@example.com', $result['customerEmail'] );
		$this->assertSame( 'confirmed', $result['status'] );
		$this->assertSame( '2026-04-25T10:00:00+00:00', $result['start'] );
		$this->assertSame( '2026-04-25T11:00:00+00:00', $result['end'] );
	}

	public function test_create_missing_title_returns_error(): void {
		$payload = $this->get_valid_payload();
		unset( $payload['title'] );

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_title_required', $result->get_error_code() );
	}

	public function test_create_empty_title_returns_error(): void {
		$payload          = $this->get_valid_payload();
		$payload['title'] = '   ';

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_title_required', $result->get_error_code() );
	}

	public function test_create_invalid_email_returns_error(): void {
		$payload                   = $this->get_valid_payload();
		$payload['customerEmail'] = 'not-an-email';

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'invalid_email', $result->get_error_code() );
	}

	public function test_create_invalid_start_datetime_returns_error(): void {
		$payload          = $this->get_valid_payload();
		$payload['start'] = 'not-a-date';

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_datetime_invalid', $result->get_error_code() );
	}

	public function test_create_invalid_end_datetime_returns_error(): void {
		$payload        = $this->get_valid_payload();
		$payload['end'] = 'not-a-date';

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_datetime_invalid', $result->get_error_code() );
	}

	public function test_create_start_after_end_returns_error(): void {
		$payload          = $this->get_valid_payload();
		$payload['start'] = '2026-04-25 12:00:00';
		$payload['end']   = '2026-04-25 10:00:00';

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_datetime_order', $result->get_error_code() );
	}

	public function test_create_start_equals_end_returns_error(): void {
		$payload          = $this->get_valid_payload();
		$payload['start'] = '2026-04-25 10:00:00';
		$payload['end']   = '2026-04-25 10:00:00';

		$result = HBE_Bookings::create( 1, $payload );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_datetime_order', $result->get_error_code() );
	}

	public function test_create_conflict_detected_returns_error(): void {
		$this->wpdb->mock_get_var = array( '*' => 1 );

		$result = HBE_Bookings::create( 1, $this->get_valid_payload() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_conflict', $result->get_error_code() );
	}

	public function test_create_race_condition_duplicate_entry(): void {
		// Simulate concurrent request: has_conflict sees no overlap.
		$this->wpdb->mock_get_var = array( '*' => 0 );
		// …but the DB unique key fails on insert.
		$this->wpdb->mock_insert  = false;
		$this->wpdb->last_error   = "Duplicate entry '1-2026-04-25 10:00:00-2026-04-25 11:00:00' for key 'unique_booking_slot'";

		$result = HBE_Bookings::create( 1, $this->get_valid_payload() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'booking_conflict', $result->get_error_code() );
	}

	public function test_create_generic_insert_failure(): void {
		$this->wpdb->mock_get_var = array( '*' => 0 );
		$this->wpdb->mock_insert  = false;
		$this->wpdb->last_error   = 'Generic database failure';

		$result = HBE_Bookings::create( 1, $this->get_valid_payload() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_create_failed', $result->get_error_code() );
	}

	public function test_create_insert_succeeds_but_fetch_fails(): void {
		$this->wpdb->mock_insert  = 1;
		$this->wpdb->insert_id    = 123;
		$this->wpdb->mock_get_row = array( null );

		$result = HBE_Bookings::create( 1, $this->get_valid_payload() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_not_found', $result->get_error_code() );
	}

	// ================================================================
	// UPDATE
	// ================================================================

	public function test_update_success(): void {
		$this->wpdb->mock_get_row = array(
			$this->get_booking_row(
				456,
				array(
					'customer_name'  => 'Old Name',
					'customer_email' => 'old@example.com',
					'start_datetime' => '2026-04-25 09:00:00',
					'end_datetime'   => '2026-04-25 10:00:00',
				)
			),
			$this->get_booking_row(
				456,
				array(
					'customer_name'  => 'New Name',
					'customer_email' => 'new@example.com',
					'start_datetime' => '2026-04-25 14:00:00',
					'end_datetime'   => '2026-04-25 15:00:00',
				)
			),
		);
		$this->wpdb->mock_update = 1;

		$result = HBE_Bookings::update(
			1,
			456,
			array(
				'title'         => 'New Name',
				'customerEmail' => 'new@example.com',
				'start'         => '2026-04-25 14:00:00',
				'end'           => '2026-04-25 15:00:00',
			)
		);

		$this->assertIsArray( $result );
		$this->assertSame( 456, $result['id'] );
		$this->assertSame( 'New Name', $result['customerName'] );
		$this->assertSame( 'new@example.com', $result['customerEmail'] );
	}

	public function test_update_not_found_returns_error(): void {
		$this->wpdb->mock_get_row = array( null );

		$result = HBE_Bookings::update( 1, 999, $this->get_valid_payload() );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_not_found', $result->get_error_code() );
	}

	public function test_update_invalid_email_returns_error(): void {
		$this->wpdb->mock_get_row = array( $this->get_booking_row( 456 ) );

		$result = HBE_Bookings::update(
			1,
			456,
			array( 'customerEmail' => 'bad-email' )
		);

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'invalid_email', $result->get_error_code() );
	}

	public function test_update_conflict_returns_error(): void {
		$this->wpdb->mock_get_row = array( $this->get_booking_row( 456 ) );
		$this->wpdb->mock_get_var = array( '*' => 1 );

		$result = HBE_Bookings::update(
			1,
			456,
			array(
				'start' => '2026-04-25 14:00:00',
				'end'   => '2026-04-25 15:00:00',
			)
		);

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_conflict', $result->get_error_code() );
	}

	public function test_update_excludes_self_from_conflict_check(): void {
		$this->wpdb->mock_get_row = array(
			$this->get_booking_row( 456 ),
			$this->get_booking_row(
				456,
				array(
					'start_datetime' => '2026-04-25 14:00:00',
					'end_datetime'   => '2026-04-25 15:00:00',
				)
			),
		);
		$this->wpdb->mock_get_var = array( '*' => 0 );
		$this->wpdb->mock_update  = 1;

		$result = HBE_Bookings::update(
			1,
			456,
			array(
				'start' => '2026-04-25 14:00:00',
				'end'   => '2026-04-25 15:00:00',
			)
		);

		$this->assertIsArray( $result );

		$conflict_queries = array_filter(
			$this->wpdb->captured,
			function ( $c ) {
				return 'get_var' === $c['method'];
			}
		);
		$this->assertNotEmpty( $conflict_queries );
		$query = array_values( $conflict_queries )[0]['query'];
		$this->assertStringContainsString( 'id !=', $query );
	}

	public function test_update_generic_failure(): void {
		$this->wpdb->mock_get_row = array( $this->get_booking_row( 456 ) );
		$this->wpdb->mock_update  = false;

		$result = HBE_Bookings::update( 1, 456, array( 'title' => 'New Name' ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_update_failed', $result->get_error_code() );
	}

	public function test_update_race_condition_duplicate_entry(): void {
		$this->wpdb->mock_get_row = array( $this->get_booking_row( 456 ) );
		$this->wpdb->mock_get_var = array( '*' => 0 );
		$this->wpdb->mock_update  = false;
		$this->wpdb->last_error   = "Duplicate entry '1-2026-04-25 10:00:00-2026-04-25 11:00:00' for key 'unique_booking_slot'";

		$result = HBE_Bookings::update(
			1,
			456,
			array(
				'start' => '2026-04-25 10:00:00',
				'end'   => '2026-04-25 11:00:00',
			)
		);

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'booking_conflict', $result->get_error_code() );
	}

	// ================================================================
	// CANCEL
	// ================================================================

	public function test_cancel_success(): void {
		$this->wpdb->mock_get_row = array( $this->get_booking_row( 789 ) );
		$this->wpdb->mock_update  = 1;

		$result = HBE_Bookings::cancel( 1, 789 );

		$this->assertTrue( $result );
		$updates = array_filter(
			$this->wpdb->captured,
			function ( $c ) {
				return 'update' === $c['method'];
			}
		);
		$this->assertNotEmpty( $updates );
		$update = array_values( $updates )[0];
		$this->assertSame( 'cancelled', $update['data']['status'] );
	}

	public function test_cancel_not_found(): void {
		$this->wpdb->mock_get_row = array( null );

		$result = HBE_Bookings::cancel( 1, 999 );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_not_found', $result->get_error_code() );
	}

	public function test_cancel_update_failure(): void {
		$this->wpdb->mock_get_row = array( $this->get_booking_row( 789 ) );
		$this->wpdb->mock_update  = false;

		$result = HBE_Bookings::cancel( 1, 789 );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'hbe_booking_cancel_failed', $result->get_error_code() );
	}

	// ================================================================
	// HAS_CONFLICT (private — accessed via Reflection)
	// ================================================================

	public function test_has_conflict_detects_overlap(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'has_conflict' );
		$method->setAccessible( true );

		$this->wpdb->mock_get_var = array( '*' => 1 );

		$result = $method->invoke( null, 1, '2026-04-25 10:00:00', '2026-04-25 11:00:00' );

		$this->assertTrue( $result );
	}

	public function test_has_conflict_no_overlap(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'has_conflict' );
		$method->setAccessible( true );

		$this->wpdb->mock_get_var = array( '*' => 0 );

		$result = $method->invoke( null, 1, '2026-04-25 10:00:00', '2026-04-25 11:00:00' );

		$this->assertFalse( $result );
	}

	public function test_has_conflict_null_count_returns_false(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'has_conflict' );
		$method->setAccessible( true );

		// Default get_var returns null — (int) null is 0.
		$result = $method->invoke( null, 1, '2026-04-25 10:00:00', '2026-04-25 11:00:00' );

		$this->assertFalse( $result );
	}

	public function test_has_conflict_excludes_cancelled_in_query(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'has_conflict' );
		$method->setAccessible( true );

		$this->wpdb->mock_get_var = array( '*' => 0 );

		$method->invoke( null, 1, '2026-04-25 10:00:00', '2026-04-25 11:00:00' );

		$queries = array_filter(
			$this->wpdb->captured,
			function ( $c ) {
				return 'get_var' === $c['method'];
			}
		);
		$this->assertNotEmpty( $queries );
		$query = array_values( $queries )[0]['query'];
		$this->assertStringContainsString( "status != 'cancelled'", $query );
	}

	public function test_has_conflict_respects_exclude_param(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'has_conflict' );
		$method->setAccessible( true );

		$this->wpdb->mock_get_var = array( '*' => 0 );

		$method->invoke( null, 1, '2026-04-25 10:00:00', '2026-04-25 11:00:00', 99 );

		$queries = array_filter(
			$this->wpdb->captured,
			function ( $c ) {
				return 'get_var' === $c['method'];
			}
		);
		$this->assertNotEmpty( $queries );
		$query = array_values( $queries )[0]['query'];
		$this->assertStringContainsString( 'id !=', $query );
		$this->assertStringContainsString( '99', $query );
	}

	// ================================================================
	// IS_WITHIN_BOOKING_WINDOW (private — accessed via Reflection)
	// ================================================================

	public function test_is_within_booking_window_no_limit(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'is_within_booking_window' );
		$method->setAccessible( true );

		$settings = array( 'slotSettings' => array( 'maxAdvanceDays' => 0 ) );
		$result   = $method->invoke( null, '2030-12-31 10:00:00', $settings );

		$this->assertTrue( $result );
	}

	public function test_is_within_booking_window_within_limit(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'is_within_booking_window' );
		$method->setAccessible( true );

		$settings    = array( 'slotSettings' => array( 'maxAdvanceDays' => 7 ) );
		$tomorrow    = gmdate( 'Y-m-d H:i:s', strtotime( '+1 day' ) );
		$result      = $method->invoke( null, $tomorrow, $settings );

		$this->assertTrue( $result );
	}

	public function test_is_within_booking_window_outside_limit(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'is_within_booking_window' );
		$method->setAccessible( true );

		$settings        = array( 'slotSettings' => array( 'maxAdvanceDays' => 1 ) );
		$three_days_out  = gmdate( 'Y-m-d H:i:s', strtotime( '+3 days' ) );
		$result          = $method->invoke( null, $three_days_out, $settings );

		$this->assertFalse( $result );
	}

	public function test_is_within_booking_window_exactly_at_limit(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'is_within_booking_window' );
		$method->setAccessible( true );

		$settings = array( 'slotSettings' => array( 'maxAdvanceDays' => 2 ) );
		// Today at midnight + 2 days should be exactly at the boundary.
		$two_days_midnight = gmdate( 'Y-m-d', strtotime( '+2 days' ) ) . ' 00:00:00';
		$result            = $method->invoke( null, $two_days_midnight, $settings );

		$this->assertTrue( $result );
	}

	public function test_is_within_booking_window_end_of_day(): void {
		$method = new ReflectionMethod( HBE_Bookings::class, 'is_within_booking_window' );
		$method->setAccessible( true );

		$settings = array( 'slotSettings' => array( 'maxAdvanceDays' => 2 ) );
		// End of day 2 should still be allowed (23:59:59 boundary).
		$two_days_end = gmdate( 'Y-m-d', strtotime( '+2 days' ) ) . ' 23:59:59';
		$result       = $method->invoke( null, $two_days_end, $settings );

		$this->assertTrue( $result );
	}
}
