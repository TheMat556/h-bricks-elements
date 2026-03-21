<?php
/**
 * Email hooks for bookings.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sends transactional emails.
 */
class HBE_Email_Handler {

	/**
	 * Registers hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'hbe_booking_created', array( __CLASS__, 'handle_booking_created' ), 10, 2 );
		add_action( 'hbe_booking_status_changed', array( __CLASS__, 'handle_booking_status_changed' ), 10, 3 );
	}

	/**
	 * Handles booking-created events.
	 *
	 * @param int   $booking_id Booking ID.
	 * @param array $data       Booking payload.
	 * @return void
	 */
	public static function handle_booking_created( $booking_id, $data ) {}

	/**
	 * Handles booking status transitions.
	 *
	 * @param int    $booking_id Booking ID.
	 * @param string $old_status Old status.
	 * @param string $new_status New status.
	 * @return void
	 */
	public static function handle_booking_status_changed( $booking_id, $old_status, $new_status ) {}
}
