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

		$this->controls['titleSize'] = array(
			'tab'     => 'style',
			'group'   => 'bookingContent',
			'label'   => esc_html__( 'Title size', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 12,
			'step'    => 1,
			'default' => 20,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__title',
					'property' => 'font-size',
				),
			),
		);

		$this->controls['bodySize'] = array(
			'tab'     => 'style',
			'group'   => 'bookingContent',
			'label'   => esc_html__( 'Body size', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 12,
			'step'    => 1,
			'default' => 15,
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-current-month',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-weekday',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-prev-month svg, .hbe-booking__calendar-mount .flatpickr-next-month svg',
					'property' => 'fill',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day',
					'property' => 'border-radius',
				),
			),
		);

		$this->controls['calendarCellFontSize'] = array(
			'tab'     => 'style',
			'group'   => 'bookingCalendar',
			'label'   => esc_html__( 'Calendar cell font size', 'h-bricks-elements' ),
			'type'    => 'number',
			'unit'    => 'px',
			'min'     => 10,
			'step'    => 1,
			'default' => 14,
			'css'     => array(
				array(
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day:hover',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day:hover',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day:hover',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.hbe-booking__day--available',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.hbe-booking__day--available',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.hbe-booking__day--available',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.hbe-booking__day--available',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.selected, .hbe-booking__calendar-mount .flatpickr-day.startRange, .hbe-booking__calendar-mount .flatpickr-day.endRange',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.selected, .hbe-booking__calendar-mount .flatpickr-day.startRange, .hbe-booking__calendar-mount .flatpickr-day.endRange',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.selected, .hbe-booking__calendar-mount .flatpickr-day.startRange, .hbe-booking__calendar-mount .flatpickr-day.endRange',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.selected, .hbe-booking__calendar-mount .flatpickr-day.startRange, .hbe-booking__calendar-mount .flatpickr-day.endRange',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.flatpickr-disabled, .hbe-booking__calendar-mount .flatpickr-day.prevMonthDay.flatpickr-disabled, .hbe-booking__calendar-mount .flatpickr-day.nextMonthDay.flatpickr-disabled',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.flatpickr-disabled, .hbe-booking__calendar-mount .flatpickr-day.prevMonthDay.flatpickr-disabled, .hbe-booking__calendar-mount .flatpickr-day.nextMonthDay.flatpickr-disabled',
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
					'selector' => '.hbe-booking__calendar-mount .flatpickr-day.flatpickr-disabled, .hbe-booking__calendar-mount .flatpickr-day.prevMonthDay.flatpickr-disabled, .hbe-booking__calendar-mount .flatpickr-day.nextMonthDay.flatpickr-disabled',
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
		$info_title          = isset( $this->settings['infoTitle'] ) ? sanitize_text_field( (string) $this->settings['infoTitle'] ) : '';
		$info_text           = isset( $this->settings['infoText'] ) ? sanitize_textarea_field( (string) $this->settings['infoText'] ) : '';
		$first_column_label  = isset( $this->settings['firstColumnLabel'] ) ? sanitize_text_field( (string) $this->settings['firstColumnLabel'] ) : '';
		$calendar_label      = isset( $this->settings['calendarColumnLabel'] ) ? sanitize_text_field( (string) $this->settings['calendarColumnLabel'] ) : '';
		$slots_label         = isset( $this->settings['slotsColumnLabel'] ) ? sanitize_text_field( (string) $this->settings['slotsColumnLabel'] ) : '';
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
		);

		$this->set_attribute( '_root', 'class', implode( ' ', $root_classes ) );
		$this->set_attribute( '_root', 'data-hbe-booking', 'true' );
		$this->set_attribute( '_root', 'data-calendar-id', (string) $calendar_id );
		$this->set_attribute( '_root', 'data-first-column-mode', $first_column_mode );
		$this->set_attribute( '_root', 'data-show-slots', $show_slots ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-info-title', $info_title );
		$this->set_attribute( '_root', 'data-info-text', $info_text );
		$this->set_attribute( '_root', 'data-first-column-label', $first_column_label );
		$this->set_attribute( '_root', 'data-builder-preview', $is_builder_preview ? 'true' : 'false' );
		$this->set_attribute( '_root', 'data-rest-base', untrailingslashit( rest_url( HBE_REST::NAMESPACE ) ) );

		echo '<div ' . $this->render_attributes( '_root' ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		if ( 'off' !== $first_column_mode ) {
			$this->render_first_column( $first_column_mode, $info_title, $info_text, $first_column_label, $calendar_id > 0, $is_builder_preview );
		}

		$this->render_calendar_column( $calendar_label, $calendar_id > 0, $is_builder_preview );

		if ( $show_slots ) {
			$this->render_slots_column( $slots_label, $is_builder_preview );
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
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Loading services...', 'h-bricks-elements' ) . '</p>';
			echo '</div>';
		} else {
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Choose a calendar to load its services.', 'h-bricks-elements' ) . '</p>';
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
		echo '<h3 class="hbe-booking__title">';
		echo esc_html( $has_calendar ? __( 'Available dates', 'h-bricks-elements' ) : __( 'No calendar selected', 'h-bricks-elements' ) );
		echo '</h3>';
		echo '<p class="hbe-booking__copy hbe-booking__status">';
		if ( $is_builder_preview ) {
			echo esc_html__( 'Preview cells shown in the builder. Style controls apply to these states.', 'h-bricks-elements' );
		} else {
			echo esc_html( $has_calendar ? __( 'Loading calendar...', 'h-bricks-elements' ) : __( 'Select a calendar in Bricks Builder to populate the month view.', 'h-bricks-elements' ) );
		}
		echo '</p>';
		echo '</div>';
		echo '<div class="hbe-booking__calendar-mount">';
		if ( $is_builder_preview ) {
			$this->render_calendar_preview_markup();
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
	private function render_slots_column( string $slots_label, bool $is_builder_preview ): void {
		$eyebrow = '' !== $slots_label ? $slots_label : __( 'Availability', 'h-bricks-elements' );

		echo '<section class="hbe-booking__column hbe-booking__column--slots">';
		echo '<div class="hbe-booking__eyebrow">' . esc_html( $eyebrow ) . '</div>';
		echo '<div class="hbe-booking__slots-body">';
		if ( $is_builder_preview ) {
			$this->render_slots_preview_markup();
		} else {
			echo '<h3 class="hbe-booking__title">' . esc_html__( 'Select a date', 'h-bricks-elements' ) . '</h3>';
			echo '<p class="hbe-booking__copy">' . esc_html__( 'Working intervals for the selected date will appear here.', 'h-bricks-elements' ) . '</p>';
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
			array( 'label' => '24', 'class' => 'prevMonthDay flatpickr-disabled' ),
			array( 'label' => '25', 'class' => 'prevMonthDay flatpickr-disabled' ),
			array( 'label' => '26', 'class' => 'prevMonthDay flatpickr-disabled' ),
			array( 'label' => '27', 'class' => 'prevMonthDay flatpickr-disabled' ),
			array( 'label' => '28', 'class' => 'prevMonthDay flatpickr-disabled' ),
			array( 'label' => '1', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '2', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '3', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '4', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '5', 'class' => 'selected hbe-booking__day--available' ),
			array( 'label' => '6', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '7', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '8', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '9', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '10', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '11', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '12', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '13', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '14', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '15', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '16', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '17', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '18', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '19', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '20', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '21', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '22', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '23', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '24', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '25', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '26', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '27', 'class' => 'hbe-booking__day--available' ),
			array( 'label' => '28', 'class' => 'flatpickr-disabled' ),
			array( 'label' => '29', 'class' => 'flatpickr-disabled nextMonthDay' ),
			array( 'label' => '30', 'class' => 'flatpickr-disabled nextMonthDay' ),
		);

		echo '<div class="flatpickr-calendar inline">';
		echo '<div class="flatpickr-months">';
		echo '<span class="flatpickr-prev-month">';
		echo '<svg viewBox="0 0 17 17" aria-hidden="true"><path d="M9.6 3.4L4.5 8.5l5.1 5.1 1.4-1.4-3.7-3.7 3.7-3.7z"></path></svg>';
		echo '</span>';
		echo '<div class="flatpickr-month"><div class="flatpickr-current-month">March 2026</div></div>';
		echo '<span class="flatpickr-next-month">';
		echo '<svg viewBox="0 0 17 17" aria-hidden="true"><path d="M7.4 13.6l5.1-5.1-5.1-5.1-1.4 1.4 3.7 3.7-3.7 3.7z"></path></svg>';
		echo '</span>';
		echo '</div>';
		echo '<div class="flatpickr-weekdays"><div class="flatpickr-weekdaycontainer">';
		foreach ( $weekdays as $weekday ) {
			echo '<span class="flatpickr-weekday">' . esc_html( $weekday ) . '</span>';
		}
		echo '</div></div>';
		echo '<div class="flatpickr-days"><div class="dayContainer">';
		foreach ( $days as $day ) {
			$classes = trim( 'flatpickr-day ' . $day['class'] );
			echo '<span class="' . esc_attr( $classes ) . '">' . esc_html( $day['label'] ) . '</span>';
		}
		echo '</div></div>';
		echo '</div>';
	}

	/**
	 * Renders static service buttons for the builder.
	 *
	 * @return void
	 */
	private function render_service_preview_markup(): void {
		echo '<h3 class="hbe-booking__title">' . esc_html__( 'Services', 'h-bricks-elements' ) . '</h3>';
		echo '<p class="hbe-booking__copy">' . esc_html__( 'Preview buttons shown in the builder so you can style their states.', 'h-bricks-elements' ) . '</p>';
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
	private function render_slots_preview_markup(): void {
		echo '<h3 class="hbe-booking__title">' . esc_html__( 'Tuesday, March 5, 2026', 'h-bricks-elements' ) . '</h3>';
		echo '<p class="hbe-booking__copy">' . esc_html__( 'Preview time slot cells shown in the builder for styling.', 'h-bricks-elements' ) . '</p>';
		echo '<div class="hbe-booking__slot-summary">' . esc_html__( 'Using preview data', 'h-bricks-elements' ) . '</div>';
		echo '<ul class="hbe-booking__slot-list">';
		echo '<li class="hbe-booking__slot-item"><span class="hbe-booking__slot-time">09:00 - 10:00</span><span class="hbe-booking__slot-date">Mar 5</span></li>';
		echo '<li class="hbe-booking__slot-item"><span class="hbe-booking__slot-time">11:30 - 12:30</span><span class="hbe-booking__slot-date">Mar 5</span></li>';
		echo '<li class="hbe-booking__slot-item"><span class="hbe-booking__slot-time">15:00 - 16:00</span><span class="hbe-booking__slot-date">Mar 5</span></li>';
		echo '</ul>';
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
}
