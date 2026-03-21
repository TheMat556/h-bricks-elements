<?php
/**
 * Booking Element for Bricks Builder.
 *
 * @package H-Bricks-Elements
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Booking module element.
 */
class Booking extends \Bricks\Element {

	/**
	 * Element category.
	 *
	 * @var string
	 */
	public $category = 'h-additional-blocks';

	/**
	 * Element name.
	 *
	 * @var string
	 */
	public $name = 'h-booking-calendar';

	/**
	 * Element icon.
	 *
	 * @var string
	 */
	public $icon = 'ti-calendar';

	/**
	 * Returns the element label.
	 *
	 * @return string
	 */
	public function get_label() {
		return 'Booking Module';
	}

	/**
	 * Returns calendar options for the control.
	 *
	 * @return array<string, string>
	 */
	private function get_calendar_options() {
		$options   = array();
		$calendars = get_posts(
			array(
				'post_type'   => 'hbe_calendar',
				'post_status' => 'publish',
				'numberposts' => -1,
				'orderby'     => 'title',
				'order'       => 'ASC',
			)
		);

		foreach ( $calendars as $calendar ) {
			$options[ (string) $calendar->ID ] = $calendar->post_title;
		}

		return $options;
	}

	/**
	 * Registers element controls.
	 *
	 * @return void
	 */
	public function set_controls() {
		$this->controls['calendarId'] = array(
			'tab'         => 'content',
			'label'       => esc_html__( 'Calendar', 'h-bricks-elements' ),
			'type'        => 'select',
			'options'     => $this->get_calendar_options(),
			'clearable'   => false,
			'placeholder' => esc_html__( 'Select calendar', 'h-bricks-elements' ),
		);

		$this->controls['showServices'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Show Services', 'h-bricks-elements' ),
			'type'    => 'checkbox',
			'default' => true,
		);

		$this->controls['showSlots'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Show Slots', 'h-bricks-elements' ),
			'type'    => 'checkbox',
			'default' => true,
		);
	}

	/**
	 * Enqueues element scripts and styles.
	 *
	 * @return void
	 */
	public function enqueue_scripts() {
		$style_path  = HBE_PLUGIN_PATH . 'dist/booking.css';
		$script_path = HBE_PLUGIN_PATH . 'dist/booking.js';

		if ( file_exists( $style_path ) ) {
			wp_enqueue_style(
				'h-booking',
				HBE_PLUGIN_URL . 'dist/booking.css',
				array(),
				filemtime( $style_path )
			);
		}

		if ( file_exists( $script_path ) ) {
			wp_enqueue_script(
				'h-booking',
				HBE_PLUGIN_URL . 'dist/booking.js',
				array(),
				filemtime( $script_path ),
				true
			);

			wp_localize_script(
				'h-booking',
				'hbePublic',
				array(
					'nonce'   => wp_create_nonce( 'wp_rest' ),
					'restUrl' => rest_url( HBE_REST_API::NAMESPACE . '/' ),
				)
			);
		}
	}

	/**
	 * Renders the element.
	 *
	 * @return void
	 */
	public function render() {
		$calendar_id   = isset( $this->settings['calendarId'] ) ? absint( $this->settings['calendarId'] ) : 0;
		$show_services = ! empty( $this->settings['showServices'] );
		$show_slots    = ! empty( $this->settings['showSlots'] );

		$this->set_attribute( '_root', 'class', 'h-calendar' );
		$this->set_attribute( '_root', 'data-calendar-id', (string) $calendar_id );
		$this->set_attribute( '_root', 'data-show-services', $show_services ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-show-slots', $show_slots ? 'true' : 'false' );

		echo '<div ' . $this->render_attributes( '_root' ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		if ( $show_services ) {
			include __DIR__ . '/templates/col-services.php';
		}

		include __DIR__ . '/templates/col-calendar.php';

		if ( $show_slots ) {
			include __DIR__ . '/templates/col-slots.php';
		}

		echo '<div class="hbe-hidden-fields">';
		echo '<input type="hidden" name="hbe_calendar_id" value="' . esc_attr( (string) $calendar_id ) . '" />';
		echo '<input type="hidden" name="hbe_date" value="" />';
		echo '<input type="hidden" name="hbe_time_start" value="" />';
		echo '<input type="hidden" name="hbe_service_id" value="" />';
		echo '</div>';
		echo '</div>';
	}
}
