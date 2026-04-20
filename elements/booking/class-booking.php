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
	 * Registers element control groups.
	 *
	 * @return void
	 */
	public function set_control_groups() {
		$this->control_groups['bookingSetup'] = array(
			'title' => esc_html__( 'Setup', 'h-bricks-elements' ),
			'tab'   => 'content',
		);

		$this->control_groups['bookingLabels'] = array(
			'title' => esc_html__( 'Labels', 'h-bricks-elements' ),
			'tab'   => 'content',
		);

		$this->control_groups['bookingContent'] = array(
			'title' => esc_html__( 'Content', 'h-bricks-elements' ),
			'tab'   => 'style',
		);

		$this->control_groups['bookingColumns'] = array(
			'title' => esc_html__( 'Columns', 'h-bricks-elements' ),
			'tab'   => 'style',
		);

		$this->control_groups['bookingCalendar'] = array(
			'title' => esc_html__( 'Calendar', 'h-bricks-elements' ),
			'tab'   => 'style',
		);

		$this->control_groups['bookingServices'] = array(
			'title' => esc_html__( 'Services', 'h-bricks-elements' ),
			'tab'   => 'style',
		);

		$this->control_groups['bookingSlots'] = array(
			'title' => esc_html__( 'Time Slots', 'h-bricks-elements' ),
			'tab'   => 'style',
		);
	}

	/**
	 * Registers element controls.
	 *
	 * @return void
	 */
	public function set_controls() {
		$calendar_options    = $this->get_calendar_options();
		$default_calendar_id = $this->get_default_calendar_id( $calendar_options );

		$this->controls['calendarInfo'] = array(
			'tab'     => 'content',
			'group'   => 'bookingSetup',
			'type'    => 'info',
			'content' => esc_html__( 'Select one of the calendars created in the admin area. The frontend skeleton will load its working hours, services, and blocked dates.', 'h-bricks-elements' ),
		);

		$this->controls['calendarId'] = array(
			'tab'         => 'content',
			'group'       => 'bookingSetup',
			'label'       => esc_html__( 'Calendar', 'h-bricks-elements' ),
			'type'        => 'select',
			'options'     => $calendar_options,
			'placeholder' => esc_html__( 'Select calendar', 'h-bricks-elements' ),
			'clearable'   => false,
			'default'     => $default_calendar_id,
		);

		$this->controls['firstColumnMode'] = array(
			'tab'     => 'content',
			'group'   => 'bookingSetup',
			'label'   => esc_html__( 'First column', 'h-bricks-elements' ),
			'type'    => 'select',
			'options' => array(
				'off'     => esc_html__( 'Off', 'h-bricks-elements' ),
				'info'    => esc_html__( 'Info', 'h-bricks-elements' ),
				'service' => esc_html__( 'Service', 'h-bricks-elements' ),
			),
			'default' => 'service',
		);

		$this->controls['showSlots'] = array(
			'tab'     => 'content',
			'group'   => 'bookingSetup',
			'label'   => esc_html__( 'Show slots column', 'h-bricks-elements' ),
			'type'    => 'checkbox',
			'default' => true,
		);

		$this->controls['showReservationSummary'] = array(
			'tab'      => 'content',
			'group'    => 'bookingSetup',
			'label'    => esc_html__( 'Show reservation summary', 'h-bricks-elements' ),
			'type'     => 'checkbox',
			'default'  => false,
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['layoutMode'] = array(
			'tab'     => 'content',
			'group'   => 'bookingSetup',
			'label'   => esc_html__( 'Flow mode', 'h-bricks-elements' ),
			'type'    => 'select',
			'options' => array(
				'inline'  => esc_html__( 'Inline', 'h-bricks-elements' ),
				'stepper' => esc_html__( 'Stepper', 'h-bricks-elements' ),
			),
			'default' => 'inline',
		);

		$this->controls['stepperAutoAdvance'] = array(
			'tab'      => 'content',
			'group'    => 'bookingSetup',
			'label'    => esc_html__( 'Auto continue in stepper', 'h-bricks-elements' ),
			'type'     => 'checkbox',
			'default'  => false,
			'required' => array(
				'layoutMode',
				'=',
				'stepper',
			),
		);

		$this->controls['showStepperProgress'] = array(
			'tab'      => 'content',
			'group'    => 'bookingSetup',
			'label'    => esc_html__( 'Show stepper progress', 'h-bricks-elements' ),
			'type'     => 'checkbox',
			'default'  => true,
			'required' => array(
				'layoutMode',
				'=',
				'stepper',
			),
		);

		$this->controls['infoTitle'] = array(
			'tab'      => 'content',
			'group'    => 'bookingLabels',
			'label'    => esc_html__( 'Info title', 'h-bricks-elements' ),
			'type'     => 'text',
			'default'  => esc_html__( 'Booking information', 'h-bricks-elements' ),
			'required' => array(
				'firstColumnMode',
				'=',
				'info',
			),
		);

		$this->controls['infoText'] = array(
			'tab'      => 'content',
			'group'    => 'bookingLabels',
			'label'    => esc_html__( 'Info text', 'h-bricks-elements' ),
			'type'     => 'textarea',
			'default'  => esc_html__( 'Use this column for a short intro, opening notes, or any calendar-specific instructions.', 'h-bricks-elements' ),
			'required' => array(
				'firstColumnMode',
				'=',
				'info',
			),
		);

		$this->controls['firstColumnLabel'] = array(
			'tab'         => 'content',
			'group'       => 'bookingLabels',
			'label'       => esc_html__( 'First column heading', 'h-bricks-elements' ),
			'type'        => 'text',
			'placeholder' => esc_html__( 'Information / Services', 'h-bricks-elements' ),
			'required'    => array(
				'firstColumnMode',
				'!=',
				'off',
			),
		);

		$this->controls['calendarColumnLabel'] = array(
			'tab'         => 'content',
			'group'       => 'bookingLabels',
			'label'       => esc_html__( 'Calendar heading', 'h-bricks-elements' ),
			'type'        => 'text',
			'placeholder' => esc_html__( 'Calendar', 'h-bricks-elements' ),
		);

		$this->controls['slotsColumnLabel'] = array(
			'tab'         => 'content',
			'group'       => 'bookingLabels',
			'label'       => esc_html__( 'Slots heading', 'h-bricks-elements' ),
			'type'        => 'text',
			'placeholder' => esc_html__( 'Availability', 'h-bricks-elements' ),
			'required'    => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['successTitle'] = array(
			'tab'     => 'content',
			'group'   => 'bookingLabels',
			'label'   => esc_html__( 'Success title', 'h-bricks-elements' ),
			'type'    => 'text',
			'default' => esc_html__( 'This meeting is scheduled', 'h-bricks-elements' ),
		);

		$this->controls['successText'] = array(
			'tab'     => 'content',
			'group'   => 'bookingLabels',
			'label'   => esc_html__( 'Success text', 'h-bricks-elements' ),
			'type'    => 'textarea',
			'default' => esc_html__( 'Your booking is confirmed. Please keep these details for your records.', 'h-bricks-elements' ),
		);

		$this->controls['successButtonLabel'] = array(
			'tab'     => 'content',
			'group'   => 'bookingLabels',
			'label'   => esc_html__( 'Success button label', 'h-bricks-elements' ),
			'type'    => 'text',
			'default' => esc_html__( 'Book another time', 'h-bricks-elements' ),
		);

		$this->controls['columnGap'] = array(
			'tab'     => 'style',
			'group'   => 'bookingColumns',
			'label'   => esc_html__( 'Column gap', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 0,
			'step'    => 1,
			'default' => 24,
			'css'     => array(
				array(
					'property' => 'gap',
				),
			),
		);

		$this->controls['columnPadding'] = array(
			'tab'     => 'style',
			'group'   => 'bookingColumns',
			'label'   => esc_html__( 'Column padding', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 0,
			'step'    => 1,
			'default' => 20,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__column',
					'property' => 'padding',
				),
			),
		);

		$this->controls['columnRadius'] = array(
			'tab'     => 'style',
			'group'   => 'bookingColumns',
			'label'   => esc_html__( 'Column radius', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 0,
			'step'    => 1,
			'default' => 20,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__column',
					'property' => 'border-radius',
				),
			),
		);

		$this->controls['columnBackground'] = array(
			'tab'   => 'style',
			'group' => 'bookingColumns',
			'label' => esc_html__( 'Column background', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__column',
					'property' => 'background-color',
				),
			),
		);

		$this->controls['eyebrowColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingContent',
			'label' => esc_html__( 'Eyebrow color', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__eyebrow',
					'property' => 'color',
				),
			),
		);

		$this->controls['titleColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingContent',
			'label' => esc_html__( 'Title color', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__title',
					'property' => 'color',
				),
			),
		);

		$this->controls['bodyColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingContent',
			'label' => esc_html__( 'Body color', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__copy, .hbe-booking__service-copy, .hbe-booking__service-meta, .hbe-booking__slot-summary, .hbe-booking__slot-date',
					'property' => 'color',
				),
			),
		);

		$this->controls['titleSizeEm'] = array(
			'tab'     => 'style',
			'group'   => 'bookingContent',
			'label'   => esc_html__( 'Title size', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'em',
			'min'     => 0.5,
			'step'    => 0.05,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__title',
					'property' => 'font-size',
				),
			),
		);

		$this->controls['bodySizeEm'] = array(
			'tab'     => 'style',
			'group'   => 'bookingContent',
			'label'   => esc_html__( 'Body size', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'em',
			'min'     => 0.5,
			'step'    => 0.05,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__copy, .hbe-booking__service-copy, .hbe-booking__service-meta, .hbe-booking__slot-summary, .hbe-booking__slot-date',
					'property' => 'font-size',
				),
			),
		);

		$this->controls['calendarMonthColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar month color', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-month',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarWeekdayColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar weekday color', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-weekday',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarNavColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar nav color', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-nav',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarDayRadius'] = array(
			'tab'     => 'style',
			'group'   => 'bookingCalendar',
			'label'   => esc_html__( 'Calendar day radius', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 0,
			'step'    => 1,
			'default' => 13,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day',
					'property' => 'border-radius',
				),
			),
		);

		$this->controls['calendarCellFontSizeEm'] = array(
			'tab'     => 'style',
			'group'   => 'bookingCalendar',
			'label'   => esc_html__( 'Calendar cell font size', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'em',
			'min'     => 0.5,
			'step'    => 0.05,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day',
					'property' => 'font-size',
				),
			),
		);

		$this->controls['calendarDayBorder'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar cell border', 'h-bricks-elements' ),
			'type'  => 'border',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day',
				),
			),
		);

		$this->controls['calendarDayTextColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar day text', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarDayHoverTextColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar hover text', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available:hover',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarDayHoverBackground'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar hover background', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available:hover',
					'property' => 'background-color',
				),
			),
		);

		$this->controls['calendarDayHoverBorderColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar hover border', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available:hover',
					'property' => 'border-color',
				),
			),
		);

		$this->controls['calendarDayBackground'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar day background', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day',
					'property' => 'background-color',
				),
			),
		);

		$this->controls['calendarDayBorderColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Calendar day border', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day',
					'property' => 'border-color',
				),
			),
		);

		$this->controls['calendarAvailableDayTextColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Available day text', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarAvailableDayBackground'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Available day background', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available',
					'property' => 'background-color',
				),
			),
		);

		$this->controls['calendarAvailableDayBorderColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Available day border', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available',
					'property' => 'border-color',
				),
			),
		);

		$this->controls['calendarAvailableDayBorder'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Available day full border', 'h-bricks-elements' ),
			'type'  => 'border',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-available',
				),
			),
		);

		$this->controls['calendarSelectedDayTextColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Selected day text', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-selected',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarSelectedDayBackground'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Selected day background', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-selected',
					'property' => 'background-color',
				),
			),
		);

		$this->controls['calendarSelectedDayBorderColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Selected day border', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-selected',
					'property' => 'border-color',
				),
			),
		);

		$this->controls['calendarSelectedDayBorder'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Selected day full border', 'h-bricks-elements' ),
			'type'  => 'border',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-selected',
				),
			),
		);

		$this->controls['calendarDisabledDayTextColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Disabled day text', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-disabled',
					'property' => 'color',
				),
			),
		);

		$this->controls['calendarDisabledDayBackground'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Disabled day background', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-disabled',
					'property' => 'background-color',
				),
			),
		);

		$this->controls['calendarDisabledDayBorderColor'] = array(
			'tab'   => 'style',
			'group' => 'bookingCalendar',
			'label' => esc_html__( 'Disabled day border', 'h-bricks-elements' ),
			'type'  => 'color',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .hbe-booking__calendar-day.is-disabled',
					'property' => 'border-color',
				),
			),
		);

		$this->controls['serviceButtonBorder'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service button border', 'h-bricks-elements' ),
			'type'     => 'border',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonTextColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service button text', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button',
					'property' => 'color',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonBackground'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service button background', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button',
					'property' => 'background-color',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonHoverBackground'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service hover background', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button:hover',
					'property' => 'background-color',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonHoverBorderColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service hover border', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button:hover',
					'property' => 'border-color',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonActiveBorder'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service active border', 'h-bricks-elements' ),
			'type'     => 'border',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button.is-active',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonActiveTextColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service active text', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button.is-active',
					'property' => 'color',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['serviceButtonActiveBackground'] = array(
			'tab'      => 'style',
			'group'    => 'bookingServices',
			'label'    => esc_html__( 'Service active background', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__service-button.is-active',
					'property' => 'background-color',
				),
			),
			'required' => array(
				'firstColumnMode',
				'=',
				'service',
			),
		);

		$this->controls['slotListGap'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot cell gap', 'h-bricks-elements' ),
			'type'     => 'number',
			'unit'     => 'px',
			'min'      => 0,
			'step'     => 1,
			'default'  => 12,
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-list',
					'property' => 'gap',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemPadding'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot cell padding', 'h-bricks-elements' ),
			'type'     => 'number',
			'unit'     => 'px',
			'min'      => 0,
			'step'     => 1,
			'default'  => 14,
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-item',
					'property' => 'padding',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemRadius'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot cell radius', 'h-bricks-elements' ),
			'type'     => 'number',
			'unit'     => 'px',
			'min'      => 0,
			'step'     => 1,
			'default'  => 16,
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-item',
					'property' => 'border-radius',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemBorder'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot cell border', 'h-bricks-elements' ),
			'type'     => 'border',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-item',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemBackground'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot cell background', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-item',
					'property' => 'background-color',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemTextColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot cell text', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-item, .hbe-booking__slot-time, .hbe-booking__slot-date',
					'property' => 'color',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemTimeColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot time text', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-time',
					'property' => 'color',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotItemDateColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Time slot date text', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-date',
					'property' => 'color',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotSummaryBackground'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Slot summary background', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-summary',
					'property' => 'background-color',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['slotSummaryTextColor'] = array(
			'tab'      => 'style',
			'group'    => 'bookingSlots',
			'label'    => esc_html__( 'Slot summary text', 'h-bricks-elements' ),
			'type'     => 'color',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__slot-summary',
					'property' => 'color',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
		);

		$this->controls['firstColumnBorder'] = array(
			'tab'      => 'style',
			'group'    => 'bookingColumns',
			'label'    => esc_html__( 'First column border', 'h-bricks-elements' ),
			'type'     => 'border',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__column--first',
				),
			),
			'required' => array(
				'firstColumnMode',
				'!=',
				'off',
			),
		);

		$this->controls['calendarColumnBorder'] = array(
			'tab'   => 'style',
			'group' => 'bookingColumns',
			'label' => esc_html__( 'Calendar border', 'h-bricks-elements' ),
			'type'  => 'border',
			'css'   => array(
				array(
					'selector' => '.hbe-booking__column--calendar',
				),
			),
		);

		$this->controls['slotsColumnBorder'] = array(
			'tab'      => 'style',
			'group'    => 'bookingColumns',
			'label'    => esc_html__( 'Slots border', 'h-bricks-elements' ),
			'type'     => 'border',
			'css'      => array(
				array(
					'selector' => '.hbe-booking__column--slots',
				),
			),
			'required' => array(
				'showSlots',
				'!=',
				'',
			),
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
		$calendar_options    = $this->get_calendar_options();
		$default_calendar_id = $this->get_default_calendar_id( $calendar_options );
		$calendar_id         = isset( $this->settings['calendarId'] ) ? absint( $this->settings['calendarId'] ) : $default_calendar_id;
		$first_column_mode   = $this->normalize_first_column_mode(
			isset( $this->settings['firstColumnMode'] ) ? (string) $this->settings['firstColumnMode'] : 'service'
		);
		$show_slots          = ! isset( $this->settings['showSlots'] ) || ! empty( $this->settings['showSlots'] );
		$show_summary        = ! empty( $this->settings['showReservationSummary'] );
		$layout_mode         = $this->normalize_layout_mode(
			isset( $this->settings['layoutMode'] ) ? (string) $this->settings['layoutMode'] : 'inline'
		);
		$stepper_auto_advance = ! empty( $this->settings['stepperAutoAdvance'] );
		$show_stepper_progress = ! isset( $this->settings['showStepperProgress'] ) || ! empty( $this->settings['showStepperProgress'] );
		$info_title          = isset( $this->settings['infoTitle'] ) ? sanitize_text_field( (string) $this->settings['infoTitle'] ) : '';
		$info_text           = isset( $this->settings['infoText'] ) ? sanitize_textarea_field( (string) $this->settings['infoText'] ) : '';
		$first_column_label  = isset( $this->settings['firstColumnLabel'] ) ? sanitize_text_field( (string) $this->settings['firstColumnLabel'] ) : '';
		$calendar_label      = isset( $this->settings['calendarColumnLabel'] ) ? sanitize_text_field( (string) $this->settings['calendarColumnLabel'] ) : '';
		$slots_label         = isset( $this->settings['slotsColumnLabel'] ) ? sanitize_text_field( (string) $this->settings['slotsColumnLabel'] ) : '';
		$success_title       = isset( $this->settings['successTitle'] ) ? sanitize_text_field( (string) $this->settings['successTitle'] ) : '';
		$success_text        = isset( $this->settings['successText'] ) ? sanitize_textarea_field( (string) $this->settings['successText'] ) : '';
		$success_button_label = isset( $this->settings['successButtonLabel'] ) ? sanitize_text_field( (string) $this->settings['successButtonLabel'] ) : '';
		$column_count        = 1;
		$is_builder_preview  = $this->is_bricks_builder_preview();

		if ( 'off' !== $first_column_mode ) {
			++$column_count;
		}

		if ( $show_slots ) {
			++$column_count;
		}

		$root_classes = array(
			'hbe-booking',
			'hbe-booking--columns-' . $column_count,
			'hbe-booking--first-' . $first_column_mode,
			'hbe-booking--layout-' . $layout_mode,
		);

		$this->set_attribute( '_root', 'class', implode( ' ', $root_classes ) );
		$this->set_attribute( '_root', 'data-hbe-booking', 'true' );
		$this->set_attribute( '_root', 'data-calendar-id', (string) $calendar_id );
		$this->set_attribute( '_root', 'data-first-column-mode', $first_column_mode );
		$this->set_attribute( '_root', 'data-show-slots', $show_slots ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-show-summary', $show_summary ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-layout-mode', $layout_mode );
		$this->set_attribute( '_root', 'data-stepper-auto-advance', $stepper_auto_advance ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-show-stepper-progress', $show_stepper_progress ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-info-title', $info_title );
		$this->set_attribute( '_root', 'data-info-text', $info_text );
		$this->set_attribute( '_root', 'data-first-column-label', $first_column_label );
		$this->set_attribute( '_root', 'data-success-title', $success_title );
		$this->set_attribute( '_root', 'data-success-text', $success_text );
		$this->set_attribute( '_root', 'data-success-button-label', $success_button_label );
		$this->set_attribute( '_root', 'data-builder-preview', $is_builder_preview ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-rest-base', untrailingslashit( rest_url( HBE_REST::NAMESPACE ) ) );

		echo '<div ' . $this->render_attributes( '_root' ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		if ( 'off' !== $first_column_mode ) {
			$this->render_first_column( $first_column_mode, $info_title, $info_text, $first_column_label, $calendar_id > 0, $is_builder_preview );
		}

		$this->render_calendar_column( $calendar_label, $calendar_id > 0, $is_builder_preview );

		if ( $show_slots ) {
			$this->render_slots_column( $slots_label, $show_summary, $first_column_mode, $is_builder_preview );
		}

		echo '</div>';
	}

	/**
	 * Renders the optional first column.
	 *
	 * @param string $first_column_mode First column mode.
	 * @param string $info_title        Info title.
	 * @param string $info_text         Info text.
	 * @param string $first_column_label First column heading override.
	 * @param bool   $has_calendar       Whether a calendar is configured.
	 * @param bool   $is_builder_preview Whether the element is rendered inside the Bricks builder.
	 * @return void
	 */
	private function render_first_column( string $first_column_mode, string $info_title, string $info_text, string $first_column_label, bool $has_calendar, bool $is_builder_preview ): void {
		$eyebrow = '' !== $first_column_label
			? $first_column_label
			: ( 'info' === $first_column_mode ? __( 'Information', 'h-bricks-elements' ) : __( 'Services', 'h-bricks-elements' ) );

		echo '<section class="hbe-booking__column hbe-booking__column--first">';
		echo '<div class="hbe-booking__eyebrow">' . esc_html( $eyebrow ) . '</div>';
		echo '<div class="hbe-booking__first-body">';

		if ( 'info' === $first_column_mode ) {
			$title = '' !== $info_title ? $info_title : __( 'Booking information', 'h-bricks-elements' );
			$text  = '' !== $info_text ? $info_text : __( 'Add a short intro in Bricks Builder for this booking block.', 'h-bricks-elements' );

			echo '<h3 class="hbe-booking__title">' . esc_html( $title ) . '</h3>';
			echo '<p class="hbe-booking__copy">' . nl2br( esc_html( $text ) ) . '</p>';
		} elseif ( $is_builder_preview ) {
			$this->render_service_preview_markup();
		} elseif ( $has_calendar ) {
			echo '<div class="hbe-booking__service-list">';
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Loading booking options...', 'h-bricks-elements' ) . '</p>';
			echo '</div>';
		} else {
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Booking options will appear here when available.', 'h-bricks-elements' ) . '</p>';
		}

		echo '</div>';
		echo '</section>';
	}

	/**
	 * Renders the calendar column.
	 *
	 * @param bool   $has_calendar       Whether a calendar is configured.
	 * @param bool   $is_builder_preview Whether the element is rendered inside the Bricks builder.
	 * @return void
	 */
	private function render_calendar_column( string $calendar_label, bool $has_calendar, bool $is_builder_preview ): void {
		$eyebrow = '' !== $calendar_label ? $calendar_label : __( 'Calendar', 'h-bricks-elements' );

		echo '<section class="hbe-booking__column hbe-booking__column--calendar">';
		echo '<div class="hbe-booking__eyebrow">' . esc_html( $eyebrow ) . '</div>';
		echo '<div class="hbe-booking__calendar-meta">';
		echo '<div class="hbe-booking__calendar-topline">';
		echo '<div>';
		echo '<h3 class="hbe-booking__title">';
		echo esc_html( $has_calendar ? __( 'Select Date', 'h-bricks-elements' ) : __( 'Booking unavailable', 'h-bricks-elements' ) );
		echo '</h3>';
		echo '</div>';
		echo '</div>';
		echo '<p class="hbe-booking__copy">';
		echo esc_html( $has_calendar ? __( 'Review availability below and choose the day that works best for you.', 'h-bricks-elements' ) : __( 'This booking page is not ready yet.', 'h-bricks-elements' ) );
		echo '</p>';
		echo '</div>';
		echo '<div class="hbe-booking__calendar-mount">';
		if ( $is_builder_preview ) {
			$this->render_calendar_preview_markup();
		}
		echo '</div>';
		echo '<div class="hbe-booking__status">';
		if ( $is_builder_preview ) {
			echo '<span class="hbe-booking__status-label">' . esc_html__( 'Next Availability', 'h-bricks-elements' ) . '</span>';
			echo '<strong class="hbe-booking__status-title">' . esc_html__( 'Thursday, March 5', 'h-bricks-elements' ) . '</strong>';
			echo '<span class="hbe-booking__status-copy">' . esc_html__( 'Preview card for the helper area below the calendar.', 'h-bricks-elements' ) . '</span>';
		} else {
			/* Intentionally empty — JS renders the spinner overlay via [data-loading] and
			 * populates this element only on error states (e.g. "Calendar unavailable"). */
		}
		echo '</div>';
		echo '</section>';
	}

	/**
	 * Renders the slots column.
	 *
	 * @param bool $is_builder_preview Whether the element is rendered inside the Bricks builder.
	 * @return void
	 */
	private function render_slots_column( string $slots_label, bool $show_summary, string $first_column_mode, bool $is_builder_preview ): void {
		$eyebrow = '' !== $slots_label ? $slots_label : __( 'Availability', 'h-bricks-elements' );

		echo '<section class="hbe-booking__column hbe-booking__column--slots">';
		echo '<div class="hbe-booking__eyebrow">' . esc_html( $eyebrow ) . '</div>';
		echo '<div class="hbe-booking__slots-body">';
		if ( $is_builder_preview ) {
			$this->render_slots_preview_markup( $show_summary, $first_column_mode );
		} else {
			echo '<h3 class="hbe-booking__title">' . esc_html__( 'Select a date', 'h-bricks-elements' ) . '</h3>';
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Available booking times will appear here after you choose a day.', 'h-bricks-elements' ) . '</p>';
		}
		echo '</div>';
		echo '</section>';
	}

	/**
	 * Renders a static calendar preview for the builder.
	 *
	 * @return void
	 */
	private function render_calendar_preview_markup(): void {
		$weekdays = array( 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' );
		$days     = array(
			array( 'label' => '24', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
			array( 'label' => '25', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
			array( 'label' => '26', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
			array( 'label' => '27', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
			array( 'label' => '28', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
			array( 'label' => '1', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '2', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '3', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '4', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '5', 'class' => 'hbe-booking__calendar-day is-available is-selected' ),
			array( 'label' => '6', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '7', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '8', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '9', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '10', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '11', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '12', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '13', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '14', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '15', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '16', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '17', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '18', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '19', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '20', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '21', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '22', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '23', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '24', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '25', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '26', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '27', 'class' => 'hbe-booking__calendar-day is-available' ),
			array( 'label' => '28', 'class' => 'hbe-booking__calendar-day is-disabled' ),
			array( 'label' => '29', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
			array( 'label' => '30', 'class' => 'hbe-booking__calendar-day is-outside is-disabled' ),
		);

		echo '<div class="hbe-booking__calendar-shell">';
		echo '<div class="hbe-booking__calendar-header">';
		echo '<h4 class="hbe-booking__calendar-month">March 2026</h4>';
		echo '<div class="hbe-booking__calendar-actions">';
		echo '<button type="button" class="hbe-booking__calendar-nav" aria-label="Previous month"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg></button>';
		echo '<button type="button" class="hbe-booking__calendar-nav" aria-label="Next month"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg></button>';
		echo '</div>';
		echo '</div>';
		echo '<div class="hbe-booking__calendar-weekdays">';
		foreach ( $weekdays as $weekday ) {
			echo '<div class="hbe-booking__calendar-weekday">' . esc_html( substr( $weekday, 0, 2 ) ) . '</div>';
		}
		echo '</div>';
		echo '<div class="hbe-booking__calendar-days">';
		foreach ( $days as $day ) {
			echo '<div class="' . esc_attr( $day['class'] ) . '">';
			echo '<span class="hbe-booking__calendar-day-number">' . esc_html( $day['label'] ) . '</span>';
			if ( false !== strpos( $day['class'], 'is-available' ) ) {
				echo '<span class="hbe-booking__calendar-dot"></span>';
			}
			echo '</div>';
		}
		echo '</div>';
		echo '</div>';
	}

	/**
	 * Renders static service buttons for the builder.
	 *
	 * @return void
	 */
	private function render_service_preview_markup(): void {
		echo '<h3 class="hbe-booking__title">' . esc_html__( 'Services', 'h-bricks-elements' ) . '</h3>';
		echo '<p class="hbe-booking__copy">' . esc_html__( 'Preview service choices for styling the booking experience.', 'h-bricks-elements' ) . '</p>';
		echo '<div class="hbe-booking__service-buttons">';
		echo '<button type="button" class="hbe-booking__service-button is-active">';
		echo '<span class="hbe-booking__service-name">' . esc_html__( 'Initial Consultation', 'h-bricks-elements' ) . '</span>';
		echo '<span class="hbe-booking__service-meta">' . esc_html__( '60 min', 'h-bricks-elements' ) . '</span>';
		echo '<span class="hbe-booking__service-copy">' . esc_html__( 'Active preview state', 'h-bricks-elements' ) . '</span>';
		echo '</button>';
		echo '<button type="button" class="hbe-booking__service-button">';
		echo '<span class="hbe-booking__service-name">' . esc_html__( 'Follow-up Session', 'h-bricks-elements' ) . '</span>';
		echo '<span class="hbe-booking__service-meta">' . esc_html__( '45 min', 'h-bricks-elements' ) . '</span>';
		echo '<span class="hbe-booking__service-copy">' . esc_html__( 'Default preview state', 'h-bricks-elements' ) . '</span>';
		echo '</button>';
		echo '</div>';
	}

	/**
	 * Renders static time slot cells for the builder.
	 *
	 * @return void
	 */
	private function render_slots_preview_markup( bool $show_summary, string $first_column_mode ): void {
		echo '<div class="hbe-booking__slots-panel is-details">';
		echo '<div class="hbe-booking__slots-header">';
		echo '<h3 class="hbe-booking__title">' . esc_html__( 'Available Times', 'h-bricks-elements' ) . '</h3>';
		echo '<p class="hbe-booking__copy">' . esc_html__( 'Preview available times for the booking flow.', 'h-bricks-elements' ) . '</p>';
		echo '</div>';
		echo '<div class="hbe-booking__slot-list">';
		echo '<button type="button" class="hbe-booking__slot-item is-selected"><span class="hbe-booking__slot-time">09:00 - 10:00</span><span class="hbe-booking__slot-date">Mar 5</span></button>';
		echo '<button type="button" class="hbe-booking__slot-item"><span class="hbe-booking__slot-time">11:30 - 12:30</span><span class="hbe-booking__slot-date">Mar 5</span></button>';
		echo '<button type="button" class="hbe-booking__slot-item"><span class="hbe-booking__slot-time">15:00 - 16:00</span><span class="hbe-booking__slot-date">Mar 5</span></button>';
		echo '</div>';
		echo '<div class="hbe-booking__slot-actions">';
		echo '<button type="button" class="hbe-booking__details-button">' . esc_html__( 'Continue', 'h-bricks-elements' ) . '</button>';
		echo '</div>';
		echo '<div class="hbe-booking__booking-card">';
		if ( $show_summary ) {
			echo '<div class="hbe-booking__booking-kicker">' . esc_html__( 'Booking Summary', 'h-bricks-elements' ) . '</div>';
			if ( 'service' === $first_column_mode ) {
				echo '<div class="hbe-booking__booking-row"><span>' . esc_html__( 'Service', 'h-bricks-elements' ) . '</span><strong>' . esc_html__( 'Initial Consultation', 'h-bricks-elements' ) . '</strong></div>';
			}
			echo '<div class="hbe-booking__booking-row"><span>' . esc_html__( 'Date', 'h-bricks-elements' ) . '</span><strong>' . esc_html__( 'Tuesday, March 5, 2026', 'h-bricks-elements' ) . '</strong></div>';
			echo '<div class="hbe-booking__booking-row"><span>' . esc_html__( 'Time', 'h-bricks-elements' ) . '</span><strong>09:00 - 10:00</strong></div>';
			echo '<div class="hbe-booking__booking-row is-total"><span>' . esc_html__( 'Total Due', 'h-bricks-elements' ) . '</span><strong>$180.00</strong></div>';
		} else {
			echo '<div class="hbe-booking__booking-kicker">' . esc_html__( 'Booking Details', 'h-bricks-elements' ) . '</div>';
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Preview the focused booking form state.', 'h-bricks-elements' ) . '</p>';
		}
		echo '<button type="button" class="hbe-booking__confirm-button">' . esc_html__( 'Confirm Booking', 'h-bricks-elements' ) . '</button>';
		echo '<p class="hbe-booking__booking-policy">' . esc_html__( 'Preview content for styling the public booking form.', 'h-bricks-elements' ) . '</p>';
		echo '</div>';
		echo '</div>';
	}

	/**
	 * Checks whether the current render happens inside the Bricks builder.
	 *
	 * @return bool
	 */
	private function is_bricks_builder_preview(): bool {
		return ( function_exists( 'bricks_is_builder_main' ) && bricks_is_builder_main() )
			|| ( function_exists( 'bricks_is_builder_iframe' ) && bricks_is_builder_iframe() )
			|| ( function_exists( 'bricks_is_builder_call' ) && bricks_is_builder_call() );
	}

	/**
	 * Returns the calendar select options.
	 *
	 * @return array<string,string>
	 */
	private function get_calendar_options(): array {
		$options = array();

		foreach ( HBE_Calendar_Post_Type::get_admin_items() as $item ) {
			if ( empty( $item['id'] ) || empty( $item['title'] ) ) {
				continue;
			}

			$label = (string) $item['title'];

			if ( ! empty( $item['icon'] ) ) {
				$label = trim( (string) $item['icon'] . ' ' . $label );
			}

			$options[ (string) absint( $item['id'] ) ] = $label;
		}

		return $options;
	}

	/**
	 * Returns the first available calendar ID.
	 *
	 * @param array<string,string> $calendar_options Calendar options.
	 * @return int
	 */
	private function get_default_calendar_id( array $calendar_options ): int {
		$calendar_ids = array_keys( $calendar_options );

		return empty( $calendar_ids ) ? 0 : absint( (string) $calendar_ids[0] );
	}

	/**
	 * Normalizes the first column mode.
	 *
	 * @param string $mode Raw mode.
	 * @return string
	 */
	private function normalize_first_column_mode( string $mode ): string {
		return in_array( $mode, array( 'off', 'info', 'service' ), true ) ? $mode : 'service';
	}

	/**
	 * Normalizes the layout mode.
	 *
	 * @param string $mode Raw mode.
	 * @return string
	 */
	private function normalize_layout_mode( string $mode ): string {
		if ( 'stepper' === $mode ) {
			return 'stepper';
		}

		return 'inline';
	}
}
