<?php
/**
 * Bricks custom form action integration.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the Bricks form action.
 */
class HBE_Bricks_Form_Action {

	/**
	 * Boots hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'bricks/form/custom_action', array( __CLASS__, 'register' ) );
		add_action( 'bricks/form/action/hbe_create_booking', array( __CLASS__, 'handle_submission' ), 10, 1 );
	}

	/**
	 * Registers the action name with Bricks.
	 *
	 * @param array $actions Existing actions.
	 * @return array
	 */
	public static function register( $actions ) {
		$actions['hbe_create_booking'] = __( 'Create HBE Booking', 'h-bricks-elements' );
		return $actions;
	}

	/**
	 * Handles a Bricks form submission.
	 *
	 * @param object $form Form instance.
	 * @return void
	 */
	public static function handle_submission( $form ) {
		if ( ! method_exists( $form, 'get_fields' ) ) {
			return;
		}

		$fields = $form->get_fields();
		$data   = array(
			'calendar_id'    => $fields['hbe_calendar_id'] ?? 0,
			'service_id'     => $fields['hbe_service_id'] ?? 0,
			'date'           => $fields['hbe_date'] ?? '',
			'time_start'     => $fields['hbe_time_start'] ?? '',
			'customer_name'  => $fields['name'] ?? '',
			'customer_email' => $fields['email'] ?? '',
			'customer_phone' => $fields['phone'] ?? '',
			'customer_notes' => $fields['notes'] ?? '',
			'source'         => 'frontend',
		);

		$result = HBE_Booking_Logic::create_booking( $data );
		if ( is_wp_error( $result ) && method_exists( $form, 'set_error' ) ) {
			$form->set_error( $result->get_error_message() );
		}
	}
}
