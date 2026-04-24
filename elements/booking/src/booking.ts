import "./booking.css";
// calendar formatters imported via ui/calendar
import {
	applyResponsiveLayoutMode,
	createInitialBookingState,
	normalizeLayoutMode,
	setBookingStep,
	syncBookingLayoutState,
} from "./state";
import type { BookingState, PublicCalendar } from "./types";
import {
	goToStepperPanel,
	mountCalendar,
	navigateCalendarMonth,
	renderCalendarMeta,
	renderErrorState,
	renderFirstColumn,
	renderLoadingState,
	renderMissingCalendar,
	renderSlots,
	selectFirstAvailableDate,
	submitPublicBooking,
	toggleServiceSelection,
	transitionFromSuccessToAvailability,
	transitionInlineBookingStep,
} from "./ui/calendar";
import {
	ensureStepperProgressElement,
	getInitialStepperPanel,
	syncStepperUI,
} from "./ui/stepper";

// stepper imported via ui/calendar
// slots utilities imported via ui/calendar
// api imported via ui/calendar

function bootBookingElements() {
	document
		.querySelectorAll<HTMLElement>("[data-hbe-booking]")
		.forEach((root) => {
			void initBookingElement(root);
		});
}

async function initBookingElement(root: HTMLElement) {
	const state = createInitialBookingState(root);

	if (!state.calendarMountEl || !state.statusEl) {
		return;
	}

	const naturalLayoutMode = normalizeLayoutMode(state.root.dataset.layoutMode);
	applyResponsiveLayoutMode(state, naturalLayoutMode);

	state.stepperPanel = getInitialStepperPanel(state);
	ensureStepperProgressElement(state);
	setBookingStep(state, "availability", false);
	syncBookingLayoutState(state);
	bindRootInteractions(state);

	if (!state.calendarId || !state.restBase) {
		renderMissingCalendar(state);
		return;
	}

	renderLoadingState(state);

	try {
		const response = await fetch(
			`${state.restBase}/public/calendars/${state.calendarId}`,
		);

		if (!response.ok) {
			throw new Error(`Failed to load calendar (${response.status})`);
		}

		const calendar = (await response.json()) as PublicCalendar;
		state.calendar = calendar;
		state.selectedServiceIds = getInitialServiceSelection(
			calendar.settings,
			state.firstColumnMode,
		);
		syncBookingLayoutState(state);
		await ensureBookingsLoaded(state);

		await selectFirstAvailableDate(state);
		renderFirstColumn(state);
		renderSlots(state);
		mountCalendar(state);
		renderCalendarMeta(state);
	} catch (error) {
		renderErrorState(
			state,
			error instanceof Error
				? error.message
				: "Calendar data could not be loaded.",
		);
	} finally {
		state.root.removeAttribute("data-loading");
	}

	// Dynamically switch layout when crossing the mobile breakpoint
	const mobileQuery = window.matchMedia("(max-width: 640px)");
	mobileQuery.addEventListener("change", () => {
		applyResponsiveLayoutMode(state, naturalLayoutMode);
		state.stepperPanel = getInitialStepperPanel(state);
		ensureStepperProgressElement(state);
		syncStepperUI(state);
	});
}

function bindRootInteractions(state: BookingState) {
	state.root.addEventListener("click", (event) => {
		handleDelegatedClick(state, event);
	});
	state.root.addEventListener("input", (event) => {
		handleDelegatedInput(state, event);
	});
	state.root.addEventListener("submit", (event) => {
		handleDelegatedSubmit(state, event);
	});
}

function handleDelegatedClick(state: BookingState, event: MouseEvent) {
	if (!(event.target instanceof Element)) {
		return;
	}

	const actionEl = findDelegatedActionElement(state, event.target);

	if (!actionEl) {
		return;
	}

	if (handleStepperTargetAction(state, actionEl)) {
		return;
	}

	if (handleServiceSelectionAction(state, actionEl)) {
		return;
	}

	if (handleCalendarDateAction(state, actionEl)) {
		return;
	}

	if (handleCalendarNavigationAction(state, actionEl)) {
		return;
	}

	if (handleTimeFormatAction(state, actionEl)) {
		return;
	}

	if (handleSlotAction(state, actionEl)) {
		return;
	}

	if (handleBookingStepAction(state, actionEl)) {
		return;
	}

	if (actionEl.dataset.bookingReset === "true") {
		transitionFromSuccessToAvailability(state);
	}
}

function findDelegatedActionElement(
	state: BookingState,
	target: Element,
): HTMLElement | null {
	const actionEl = target.closest<HTMLElement>(
		[
			"[data-stepper-target]",
			"[data-service-id]",
			"[data-calendar-date]",
			"[data-calendar-nav]",
			"[data-time-format]",
			"[data-slot-start][data-slot-end]",
			"[data-booking-step]",
			"[data-booking-reset]",
		].join(", "),
	);

	return actionEl && state.root.contains(actionEl) ? actionEl : null;
}

function handleStepperTargetAction(
	state: BookingState,
	actionEl: HTMLElement,
): boolean {
	const stepperTarget = actionEl.dataset.stepperTarget;
	if (
		stepperTarget === "first" ||
		stepperTarget === "calendar" ||
		stepperTarget === "slots" ||
		stepperTarget === "details" ||
		stepperTarget === "success"
	) {
		goToStepperPanel(state, stepperTarget);
		return true;
	}

	return false;
}

function handleServiceSelectionAction(
	state: BookingState,
	actionEl: HTMLElement,
): boolean {
	const serviceId = actionEl.dataset.serviceId;
	if (serviceId) {
		void toggleServiceSelection(state, serviceId);
		return true;
	}

	return false;
}

function handleCalendarDateAction(
	state: BookingState,
	actionEl: HTMLElement,
): boolean {
	const calendarDate = actionEl.dataset.calendarDate;
	if (calendarDate) {
		handleCalendarDateSelection(state, calendarDate);
		return true;
	}

	return false;
}

function handleCalendarNavigationAction(
	state: BookingState,
	actionEl: HTMLElement,
): boolean {
	const calendarNav = actionEl.dataset.calendarNav;
	if (calendarNav === "prev" || calendarNav === "next") {
		void navigateCalendarMonth(state, calendarNav === "prev" ? -1 : 1);
		return true;
	}

	return false;
}

function handleTimeFormatAction(
	state: BookingState,
	actionEl: HTMLElement,
): boolean {
	const timeFormat = actionEl.dataset.timeFormat;
	if (timeFormat === "12h" || timeFormat === "24h") {
		state.timeFormat = timeFormat;
		renderSlots(state);
		return true;
	}

	return false;
}

function handleSlotAction(state: BookingState, actionEl: HTMLElement): boolean {
	const slotStart = actionEl.dataset.slotStart;
	const slotEnd = actionEl.dataset.slotEnd;
	if (slotStart && slotEnd) {
		handleSlotSelection(state, slotStart, slotEnd);
		return true;
	}

	return false;
}

function handleBookingStepAction(
	state: BookingState,
	actionEl: HTMLElement,
): boolean {
	const bookingStep = actionEl.dataset.bookingStep;
	if (bookingStep === "details") {
		if (!state.selectedSlot) {
			return true;
		}

		transitionInlineBookingStep(state, "details");
		return true;
	}

	if (bookingStep === "availability") {
		transitionInlineBookingStep(state, "availability");
		return true;
	}

	return false;
}

function handleDelegatedInput(state: BookingState, event: Event) {
	const target = event.target;

	if (
		!(
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement
		)
	) {
		return;
	}

	const key = target.dataset.bookingField;

	if (key !== "name" && key !== "email" && key !== "phone" && key !== "notes") {
		return;
	}

	state.bookingForm = {
		...state.bookingForm,
		[key]: target.value,
	};
}

function handleDelegatedSubmit(state: BookingState, event: Event) {
	const target = event.target;

	if (
		!(target instanceof HTMLFormElement) ||
		target.dataset.bookingForm !== "true"
	) {
		return;
	}

	event.preventDefault();
	void submitPublicBooking(state);
}

function handleCalendarDateSelection(state: BookingState, dateKey: string) {
	const clickedDate = parseDateKey(dateKey);

	if (!clickedDate || !isDateAvailable(state, clickedDate)) {
		return;
	}

	state.selectedDate = clickedDate;
	state.selectedSlot = null;
	setBookingNotice(state, null);
	resetCompletedBooking(state);
	setBookingStep(state, "availability");

	if (shouldAutoAdvanceStepper(state) && state.showSlots) {
		setStepperDirection(state, "slots");
		state.stepperPanel = "slots";
	}

	renderCalendarMeta(state);
	renderSlots(state);
	state.calendarInstance?.redraw();
}

function handleSlotSelection(
	state: BookingState,
	slotStart: string,
	slotEnd: string,
) {
	const slot = state.renderedSlots.find(
		(candidate) => candidate.start === slotStart && candidate.end === slotEnd,
	);

	if (!slot) {
		return;
	}

	state.selectedSlot = slot;
	setBookingNotice(state, null);
	resetCompletedBooking(state);

	if (shouldAutoAdvanceStepper(state)) {
		setStepperDirection(state, "details");
		state.stepperPanel = "details";
		setBookingStep(state, "details");
		renderCalendarMeta(state);
		renderSlots(state);
		return;
	}

	setBookingStep(state, "availability");
	renderCalendarMeta(state);
	syncRenderedSlotSelection(state, slot);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootBookingElements);
} else {
	bootBookingElements();
}
