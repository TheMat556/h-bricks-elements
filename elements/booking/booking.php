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
	public $name = 'h-booking-calender';

	/**
	 * Element icon.
	 *
	 * @var string
	 */
	public $icon = 'ti-star';

	/**
	 * Returns the element label.
	 *
	 * @return string
	 */
	public function get_label() {
		return 'Booking Module';
	}

	/**
	 * Registers element controls.
	 *
	 * @return void
	 */
	public function set_controls() {
		$this->controls['showServices'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Services anzeigen' ),
			'type'    => 'checkbox',
			'default' => true,
		);

		$this->controls['showSlots'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Zeitslots anzeigen' ),
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
		$plugin_root_url  = plugin_dir_url( dirname( __DIR__, 1 ) );
		$plugin_root_path = plugin_dir_path( dirname( __DIR__, 1 ) );

		wp_enqueue_style(
			'h-booking',
			$plugin_root_url . 'dist/booking.css',
			array(),
			filemtime( $plugin_root_path . 'dist/booking.css' )
		);

		wp_enqueue_script(
			'h-booking',
			$plugin_root_url . 'dist/booking.js',
			array(),
			filemtime( $plugin_root_path . 'dist/booking.js' ),
			true
		);
	}

	/**
	 * Renders the element.
	 *
	 * @return void
	 */
	public function render() {
		$show_services = ! empty( $this->settings['showServices'] );
		$show_slots    = ! empty( $this->settings['showSlots'] );

		$this->set_attribute( '_root', 'class', 'h-calendar' );
		$this->set_attribute( '_root', 'data-show-services', $show_services ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-show-slots', $show_slots ? 'true' : 'false' );

		echo '<div ' . $this->render_attributes( '_root' ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		if ( $show_services ) {
			include __DIR__ . '/templates/col-services.php';
		}

		include __DIR__ . '/templates/col-calendar.php';

		echo "<div class='h-cal-col'>
			<div>Zeitslot</div>
			<div>TEST3</div>
		</div>";
		echo '</div>';
	}
}
