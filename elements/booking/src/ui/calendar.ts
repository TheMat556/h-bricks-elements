import { createPublicBookingRequest, ensureBookingsLoaded } from "../api";
import {
	buildCalendarDays,
	buildCompletedBookingWhatLabel,
	canNavigateToMonth,
	escapeAttribute,
	escapeHtml,
	formatLongDate,
	formatMeetingSchedule,
	formatSlotRange,
	formatTimeRange,
	getActiveServices,
	getBookableSlotsForDate,
	getCalendarValidRange,
	getExceptionForDate,
	getMaxAdvanceDays,
	getMeetingDurationMinutes,
	getRequiredMinutes,
	getSelectedPriceLabel,
	getSelectedServiceLabel,
	getServiceDisplayLabel,
	getServiceMinutes,
	getTimeZoneLabel,
	isDateAvailable,
	isDateInValidRange,
	isSameSlot,
	startOfDay,
	toDateKey,
} from "../slots";
import {
	attachNoticeAnimationCleanup,
	isStepperMode,
	resetCompletedBooking,
	setBookingNotice,
	setBookingStep,
	syncBookingLayoutState,
} from "../state";
import type {
	BookingSlot,
	BookingState,
	CompletedBookingState,
	DateException,
	Service,
	StepperPanel,
} from "../types";
import {
	calendarWeekdayLabels,
	longDateFormatter,
	monthFormatter,
	shortWeekdayDateFormatter,
} from "../types";
import {
	getInitialStepperPanel,
	getStepperPanels,
	setStepperDirection,
	syncStepperUI,
} from "./stepper";

export function goToStepperPanel(state: BookingState, panel: StepperPanel) {
	if (!isStepperMode(state)) {
		return;
	}

	const validPanels = new Set(
		getStepperPanels(state).map((item) => item.panel),
	);

	if (!validPanels.has(panel)) {
		return;
	}

	setStepperDirection(state, panel);

	if (panel === "details") {
		if (!state.selectedSlot || !state.showSlots) {
			return;
		}

		state.stepperPanel = "details";
		setBookingStep(state, "details");
		renderSlots(state);
		return;
	}

	const wasDetails = state.bookingStep === "details";

	state.stepperPanel = panel;

	if (wasDetails) {
		setBookingStep(state, "availability");
		renderSlots(state);
		return;
	}

	if (panel === "slots") {
		renderSlots(state);
		return;
	}

	syncStepperUI(state);
}

export function syncRenderedSlotSelection(
	state: BookingState,
	selectedSlot: BookingSlot,
) {
	state.slotsBodyEl
		?.querySelectorAll<HTMLButtonElement>("[data-slot-start][data-slot-end]")
		.forEach((button) => {
			button.classList.toggle(
				"is-selected",
				button.dataset.slotStart === selectedSlot.start &&
					button.dataset.slotEnd === selectedSlot.end,
			);
		});

	state.slotsBodyEl
		?.querySelector<HTMLButtonElement>('[data-booking-step="details"]')
		?.removeAttribute("disabled");
}

export function renderCalendarStepperActions(state: BookingState): string {
	if (!isStepperMode(state)) {
		return "";
	}

	const backTarget = state.firstColumnMode !== "off" ? "first" : "";
	const nextDisabled = !state.selectedDate;
	const selectionMarkup = state.selectedDate
		? `<div class="hbe-booking__stepper-selection">${escapeHtml(
				longDateFormatter.format(state.selectedDate),
			)}</div>`
		: '<div class="hbe-booking__stepper-selection">Select a date to continue.</div>';
	const backMarkup = backTarget
		? `
			<button
				type="button"
				class="hbe-booking__details-button is-secondary"
				data-stepper-target="${backTarget}"
			>
				Back
			</button>
		`
		: "";

	if (!state.showSlots) {
		return `
			<div class="hbe-booking__stepper-actions is-align-end">
				${selectionMarkup}
				${backMarkup}
			</div>
		`;
	}

	return `
		<div class="hbe-booking__stepper-actions">
			${selectionMarkup}
			<div class="hbe-booking__stepper-actions-row">
				${backMarkup}
				<button
					type="button"
					class="hbe-booking__details-button"
					data-stepper-target="slots"
					${nextDisabled ? "disabled" : ""}
				>
					Continue to Time
				</button>
			</div>
		</div>
	`;
}

export function renderSlotsPanel(
	content: string,
	variant: "availability" | "details" | "success" | "empty" | "blocked",
): string {
	return `<div class="hbe-booking__slots-panel is-${variant}">${content}</div>`;
}

export async function selectFirstAvailableDate(state: BookingState) {
	if (!state.calendar || state.selectedDate) {
		return;
	}

	const today = startOfDay(new Date());
	const validRange = getCalendarValidRange(state.calendar.settings, today);
	const maxAdvanceDays = getMaxAdvanceDays(state.calendar.settings);
	const maxSearchDays = maxAdvanceDays > 0 ? maxAdvanceDays + 1 : 366;

	for (let offset = 0; offset < maxSearchDays; offset += 1) {
		const candidate = startOfDay(
			new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset),
		);

		if (!isDateInValidRange(candidate, validRange)) {
			break;
		}

		await ensureBookingsLoaded(state, candidate);

		if (isDateAvailable(state, candidate)) {
			state.selectedDate = candidate;
			state.visibleDate = new Date(
				candidate.getFullYear(),
				candidate.getMonth(),
				1,
			);
			return;
		}
	}

	state.visibleDate = new Date(today.getFullYear(), today.getMonth(), 1);
}

export function createContentElement<K extends keyof HTMLElementTagNameMap>(
	tagName: K,
	className: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tagName);
	element.className = className;

	if (typeof text === "string") {
		element.textContent = text;
	}

	return element;
}

export function renderStatusMessage(
	target: HTMLElement,
	{
		label,
		title,
		copy,
	}: {
		label: string;
		title: string;
		copy: string;
	},
) {
	target.replaceChildren(
		createContentElement("span", "hbe-booking__status-label", label),
		createContentElement("strong", "hbe-booking__status-title", title),
		createContentElement("span", "hbe-booking__status-copy", copy),
	);
}

export function createInfoStack({
	title,
	copy,
	icon,
}: {
	title: string;
	copy: string;
	icon?: string;
}): HTMLDivElement {
	const stack = createContentElement("div", "hbe-booking__info-stack");

	if (icon) {
		stack.append(createContentElement("span", "hbe-booking__info-icon", icon));
	}

	stack.append(
		createContentElement("h3", "hbe-booking__title", title),
		createContentElement("p", "hbe-booking__copy", copy),
	);

	return stack;
}

export function createFirstColumnSelectionElement(
	state: BookingState,
): HTMLDivElement | null {
	if (!state.selectedDate || !state.selectedSlot) {
		return null;
	}

	const selection = createContentElement("div", "hbe-booking__first-selection");
	const label = createContentElement(
		"div",
		"hbe-booking__first-selection-label",
		"Selected Time",
	);
	const value = createContentElement(
		"div",
		"hbe-booking__first-selection-value",
	);

	value.append(
		document.createTextNode(longDateFormatter.format(state.selectedDate)),
		document.createTextNode(" •"),
		document.createElement("br"),
		document.createTextNode(
			formatSlotRange(state.selectedSlot, state.timeFormat),
		),
	);
	selection.append(label, value);

	return selection;
}

export function createFirstColumnStepperActions(
	state: BookingState,
): HTMLDivElement | null {
	if (!isStepperMode(state)) {
		return null;
	}

	const selectedServices = getActiveServices(state);
	const nextDisabled =
		state.firstColumnMode === "service" && selectedServices.length === 0;
	const actions = createContentElement("div", "hbe-booking__stepper-actions");
	const button = createContentElement(
		"button",
		"hbe-booking__details-button",
		"Continue to Date",
	);

	button.type = "button";
	button.dataset.stepperTarget = "calendar";
	button.disabled = nextDisabled;
	actions.append(button);

	return actions;
}

export function createServiceButton(
	state: BookingState,
	service: Service,
): HTMLButtonElement {
	const isActive = state.selectedServiceIds.has(service.id);
	const serviceMinutes = getServiceMinutes(service);
	const servicePrice = service.price?.trim() ?? "";
	const button = createContentElement(
		"button",
		`hbe-booking__service-button${isActive ? " is-active" : ""}`,
	);

	button.type = "button";
	button.dataset.serviceId = service.id;
	button.setAttribute("aria-pressed", isActive ? "true" : "false");
	button.append(
		createContentElement(
			"span",
			"hbe-booking__service-name",
			getServiceDisplayLabel(service),
		),
	);

	if (serviceMinutes > 0) {
		button.append(
			createContentElement(
				"span",
				"hbe-booking__service-meta",
				`${serviceMinutes} min`,
			),
		);
	}

	if (service.description) {
		button.append(
			createContentElement(
				"span",
				"hbe-booking__service-copy",
				service.description,
			),
		);
	}

	if (servicePrice) {
		button.append(
			createContentElement("span", "hbe-booking__service-price", servicePrice),
		);
	}

	return button;
}

export function renderTitleCopyBlock(
	target: HTMLElement,
	title: string,
	copy: string,
) {
	target.replaceChildren(
		createContentElement("h3", "hbe-booking__title", title),
		createContentElement("p", "hbe-booking__copy", copy),
	);
}

export function renderCalendarMetaBlock(
	target: HTMLElement,
	title: string,
	copy: string,
) {
	const topline = createContentElement("div", "hbe-booking__calendar-topline");
	const headingWrap = document.createElement("div");
	headingWrap.append(createContentElement("h3", "hbe-booking__title", title));
	topline.append(headingWrap);
	target.replaceChildren(
		topline,
		createContentElement("p", "hbe-booking__copy", copy),
	);
}

export function renderLoadingState(state: BookingState) {
	state.root.setAttribute("data-loading", "");
	state.renderedSlots = [];

	if (state.slotsBodyEl) {
		state.slotsBodyEl.replaceChildren();
	}

	if (state.firstColumnMode === "service" && state.firstBodyEl) {
		state.firstBodyEl.replaceChildren();
	}

	syncStepperUI(state);
}

export function renderMissingCalendar(state: BookingState) {
	if (state.statusEl) {
		renderStatusMessage(state.statusEl, {
			label: "Booking unavailable",
			title: "This booking page is not ready yet",
			copy: "Please check back later.",
		});
	}

	if (state.firstBodyEl && !state.isBuilderPreview) {
		renderTitleCopyBlock(
			state.firstBodyEl,
			"Booking unavailable",
			"This booking page is not ready yet.",
		);
	}

	if (state.slotsBodyEl && !state.isBuilderPreview) {
		renderTitleCopyBlock(
			state.slotsBodyEl,
			"No availability yet",
			"Please try again later.",
		);
	}

	syncStepperUI(state);
}

export function renderErrorState(state: BookingState, message: string) {
	if (state.statusEl) {
		renderStatusMessage(state.statusEl, {
			label: "Calendar unavailable",
			title: "Availability could not be loaded",
			copy: message,
		});
	}

	if (state.calendarMetaEl) {
		renderTitleCopyBlock(state.calendarMetaEl, "Calendar unavailable", message);
	}

	if (state.firstBodyEl && state.firstColumnMode === "service") {
		renderTitleCopyBlock(
			state.firstBodyEl,
			"Booking options unavailable",
			"We couldn't load the available booking options.",
		);
	}

	if (state.slotsBodyEl) {
		renderTitleCopyBlock(
			state.slotsBodyEl,
			"Availability unavailable",
			"The calendar data could not be loaded.",
		);
	}

	syncStepperUI(state);
}

export function transitionInlineBookingStep(
	state: BookingState,
	step: "availability" | "details",
) {
	if (isStepperMode(state) || !state.slotsBodyEl) {
		setBookingStep(state, step);
		renderCalendarMeta(state);
		renderSlots(state);
		return;
	}

	if (state.bookingStep === step) {
		renderCalendarMeta(state);
		renderSlots(state);
		return;
	}

	if (state.stepTransitionTimer !== null) {
		window.clearTimeout(state.stepTransitionTimer);
		state.stepTransitionTimer = null;
	}

	state.root.classList.remove(
		"is-inline-transitioning-out",
		"is-inline-transitioning-in",
	);
	state.root.classList.add("is-inline-transitioning-out");

	state.stepTransitionTimer = window.setTimeout(() => {
		setBookingStep(state, step, false);
		renderCalendarMeta(state);
		renderSlots(state);

		window.requestAnimationFrame(() => {
			state.root.classList.remove("is-inline-transitioning-out");
			state.root.classList.add("is-inline-transitioning-in");
			state.stepTransitionTimer = window.setTimeout(() => {
				state.root.classList.remove("is-inline-transitioning-in");
				state.stepTransitionTimer = null;
			}, 420);
		});
	}, 180);
}

export function transitionFromSuccessToAvailability(state: BookingState) {
	if (isStepperMode(state) || !state.slotsBodyEl) {
		resetCompletedBooking(state);
		setBookingNotice(state, null);
		setBookingStep(state, "availability", false);
		if (isStepperMode(state)) {
			const initialPanel = getInitialStepperPanel(state);
			setStepperDirection(state, initialPanel);
			state.stepperPanel = initialPanel;
		}
		renderCalendarMeta(state);
		renderSlots(state);
		return;
	}

	if (state.stepTransitionTimer !== null) {
		window.clearTimeout(state.stepTransitionTimer);
		state.stepTransitionTimer = null;
	}

	state.root.classList.remove(
		"is-inline-transitioning-out",
		"is-inline-transitioning-in",
	);
	state.root.classList.add("is-inline-transitioning-out");

	state.stepTransitionTimer = window.setTimeout(() => {
		resetCompletedBooking(state);
		setBookingNotice(state, null);
		setBookingStep(state, "availability", false);
		renderCalendarMeta(state);
		renderSlots(state);

		window.requestAnimationFrame(() => {
			state.root.classList.remove("is-inline-transitioning-out");
			state.root.classList.add("is-inline-transitioning-in");
			state.stepTransitionTimer = window.setTimeout(() => {
				state.root.classList.remove("is-inline-transitioning-in");
				state.stepTransitionTimer = null;
			}, 420);
		});
	}, 180);
}

export function renderCalendarMeta(state: BookingState) {
	const calendar = state.calendar;

	if (!calendar || !state.calendarMetaEl || !state.statusEl) {
		return;
	}

	const selectedServices = getActiveServices(state);
	const serviceSummary =
		selectedServices.length > 0
			? selectedServices
					.map((service) => getServiceDisplayLabel(service))
					.join(", ")
			: state.firstColumnMode === "service"
				? "Select a service to narrow availability."
				: "Choose a day to inspect the currently available booking slots.";

	renderCalendarMetaBlock(state.calendarMetaEl, "Select Date", serviceSummary);

	if (calendar.settings.adminOnly) {
		renderStatusMessage(state.statusEl, {
			label: "Booking unavailable",
			title: "Online booking is disabled",
			copy: "Please contact us directly if you would like to schedule this meeting.",
		});
		return;
	}

	state.statusEl.replaceChildren();
}

export function renderFirstColumn(state: BookingState) {
	if (
		!state.firstBodyEl ||
		state.firstColumnMode === "off" ||
		!state.calendar
	) {
		return;
	}

	if (state.firstColumnMode === "info") {
		renderInfoColumn(state);
		return;
	}

	renderServicesColumn(state);
}

export function renderInfoColumn(state: BookingState) {
	if (!state.firstBodyEl || !state.calendar) {
		return;
	}

	const title =
		state.infoTitle.trim() || getPublicDisplayName(state) || "Booking details";
	const text =
		state.infoText.trim() || "Choose a date and time that works best for you.";
	const icon = state.calendar.settings.icon?.trim() ?? "";
	const layout = createContentElement("div", "hbe-booking__first-layout");
	const selection = createFirstColumnSelectionElement(state);
	const stepperActions = createFirstColumnStepperActions(state);

	layout.append(createInfoStack({ title, copy: text, icon }));

	if (selection) {
		layout.append(selection);
	}

	if (stepperActions) {
		layout.append(stepperActions);
	}

	state.firstBodyEl.replaceChildren(layout);
	syncStepperUI(state);
}

export function renderServicesColumn(state: BookingState) {
	if (!state.firstBodyEl || !state.calendar) {
		return;
	}

	const services = Array.isArray(state.calendar.settings.services)
		? state.calendar.settings.services
		: [];
	const heading = state.firstColumnLabel.trim() || "Services";

	if (services.length === 0) {
		const layout = createContentElement("div", "hbe-booking__first-layout");
		const selection = createFirstColumnSelectionElement(state);
		const stepperActions = createFirstColumnStepperActions(state);

		layout.append(
			createInfoStack({
				title: heading,
				copy: "No services are available for booking right now.",
			}),
		);

		if (selection) {
			layout.append(selection);
		}

		if (stepperActions) {
			layout.append(stepperActions);
		}

		state.firstBodyEl.replaceChildren(layout);
		syncStepperUI(state);
		return;
	}

	const isMulti = state.calendar.settings.selectionMode === "multi";
	const description = isMulti
		? "Select one or more services."
		: "Select a service.";
	const layout = createContentElement("div", "hbe-booking__first-layout");
	const buttons = createContentElement("div", "hbe-booking__service-buttons");
	const selection = createFirstColumnSelectionElement(state);
	const stepperActions = createFirstColumnStepperActions(state);

	layout.append(createInfoStack({ title: heading, copy: description }));
	services.forEach((service) => {
		buttons.append(createServiceButton(state, service));
	});
	layout.append(buttons);

	if (selection) {
		layout.append(selection);
	}

	if (stepperActions) {
		layout.append(stepperActions);
	}

	state.firstBodyEl.replaceChildren(layout);

	syncStepperUI(state);
}

export async function toggleServiceSelection(
	state: BookingState,
	serviceId: string,
) {
	if (!serviceId || !state.calendar) {
		return;
	}

	const nextSelectedServiceIds = new Set(state.selectedServiceIds);

	if (state.calendar.settings.selectionMode === "multi") {
		if (nextSelectedServiceIds.has(serviceId)) {
			nextSelectedServiceIds.delete(serviceId);
		} else {
			nextSelectedServiceIds.add(serviceId);
		}
	} else {
		nextSelectedServiceIds.clear();
		nextSelectedServiceIds.add(serviceId);
	}
	state.selectedServiceIds = nextSelectedServiceIds;

	setBookingNotice(state, null);
	resetCompletedBooking(state);
	setBookingStep(state, "availability");
	renderServicesColumn(state);

	if (state.selectedDate && !isDateAvailable(state, state.selectedDate)) {
		state.selectedDate = null;
		state.selectedSlot = null;
	}

	await selectFirstAvailableDate(state);
	state.calendarInstance?.redraw();
	renderSlots(state);
	renderCalendarMeta(state);
}

export function mountCalendar(state: BookingState) {
	if (!state.calendarMountEl || !state.calendar) {
		return;
	}

	state.calendarInstance?.destroy();
	state.calendarMountEl.replaceChildren();

	const today = startOfDay(new Date());
	const initialDate = state.visibleDate ?? state.selectedDate ?? today;
	const visibleMonth = new Date(
		initialDate.getFullYear(),
		initialDate.getMonth(),
		1,
	);
	const validRange = getCalendarValidRange(state.calendar.settings, today);
	state.visibleDate = visibleMonth;

	const days = buildCalendarDays(state, visibleMonth, validRange);
	const canGoPrev = canNavigateToMonth(
		new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
		validRange,
	);
	const canGoNext = canNavigateToMonth(
		new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
		validRange,
	);

	state.calendarMountEl.innerHTML = `
		<div class="hbe-booking__calendar-shell">
			<div class="hbe-booking__calendar-header">
				<h4 class="hbe-booking__calendar-month">${escapeHtml(monthFormatter.format(visibleMonth))}</h4>
				<div class="hbe-booking__calendar-actions">
					<button
						type="button"
						class="hbe-booking__calendar-nav"
						data-calendar-nav="prev"
						aria-label="Previous month"
						${canGoPrev ? "" : "disabled"}
					>
						<svg aria-hidden="true" viewBox="0 0 24 24">
							<path d="M14.5 5.5 8 12l6.5 6.5" />
						</svg>
					</button>
					<button
						type="button"
						class="hbe-booking__calendar-nav"
						data-calendar-nav="next"
						aria-label="Next month"
						${canGoNext ? "" : "disabled"}
					>
						<svg aria-hidden="true" viewBox="0 0 24 24">
							<path d="M9.5 5.5 16 12l-6.5 6.5" />
						</svg>
					</button>
				</div>
			</div>
			<div class="hbe-booking__calendar-weekdays">
				${calendarWeekdayLabels
					.map(
						(label) =>
							`<div class="hbe-booking__calendar-weekday">${escapeHtml(label)}</div>`,
					)
					.join("")}
			</div>
			<div class="hbe-booking__calendar-days">
				${days
					.map((day) => {
						const dayClasses = [
							"hbe-booking__calendar-day",
							day.isOutsideMonth ? "is-outside" : "",
							day.isAvailable ? "is-available" : "is-disabled",
							day.isSelected ? "is-selected" : "",
						]
							.filter(Boolean)
							.join(" ");
						const tagName = day.isAvailable ? "button" : "span";
						const attrs = day.isAvailable
							? `type="button" data-calendar-date="${escapeAttribute(day.dateKey)}"`
							: "";

						return `
							<${tagName}
								class="${dayClasses}"
								${attrs}
								${tagName === "button" ? `aria-label="${escapeAttribute(longDateFormatter.format(day.date))}"` : ""}
							>
								<span class="hbe-booking__calendar-day-number">${escapeHtml(
									String(day.date.getDate()),
								)}</span>
								${day.isAvailable ? '<span class="hbe-booking__calendar-dot"></span>' : ""}
							</${tagName}>
						`;
					})
					.join("")}
			</div>
		</div>
		${renderCalendarStepperActions(state)}
	`;

	state.calendarInstance = {
		clear: () => {
			mountCalendar(state);
		},
		redraw: () => {
			mountCalendar(state);
		},
		destroy: () => {
			state.calendarMountEl?.replaceChildren();
		},
	};

	syncStepperUI(state);
}

export async function navigateCalendarMonth(
	state: BookingState,
	delta: number,
) {
	if (!state.calendar) {
		return;
	}

	const currentMonth =
		state.visibleDate ?? state.selectedDate ?? startOfDay(new Date());
	const targetMonth = new Date(
		currentMonth.getFullYear(),
		currentMonth.getMonth() + delta,
		1,
	);
	const validRange = getCalendarValidRange(
		state.calendar.settings,
		startOfDay(new Date()),
	);

	if (!canNavigateToMonth(targetMonth, validRange)) {
		return;
	}

	try {
		await ensureBookingsLoaded(state, targetMonth);
		state.visibleDate = targetMonth;
		mountCalendar(state);
		renderCalendarMeta(state);
		renderSlots(state);
	} catch (error) {
		setBookingNotice(state, {
			type: "error",
			message:
				error instanceof Error
					? error.message
					: "Bookings could not be refreshed.",
		});
		renderSlots(state);
	}
}

export function renderAdminOnlySlotsState(state: BookingState): boolean {
	if (!state.slotsBodyEl || !state.calendar?.settings.adminOnly) {
		return false;
	}

	state.renderedSlots = [];
	setBookingStep(state, "availability");
	state.slotsBodyEl.innerHTML = renderSlotsPanel(
		`
			<h3 class="hbe-booking__title">Booking unavailable</h3>
			<p class="hbe-booking__copy">Online booking is not available for this calendar right now.</p>
		`,
		"blocked",
	);
	syncStepperUI(state);

	return true;
}

export function renderUnselectedDateSlotsState(state: BookingState): boolean {
	if (!state.slotsBodyEl || state.selectedDate) {
		return false;
	}

	state.renderedSlots = [];
	setBookingStep(state, "availability");
	state.slotsBodyEl.innerHTML = renderSlotsPanel(
		`
			<div class="hbe-booking__slots-header">
				<p class="hbe-booking__copy">Choose a date to see available times.</p>
				${renderTimeFormatToggle(state)}
			</div>
		`,
		"empty",
	);
	syncStepperUI(state);

	return true;
}

export function renderExceptionSlotsState(
	state: BookingState,
	matchingException: DateException | undefined,
): boolean {
	if (!state.slotsBodyEl || !state.selectedDate || !matchingException) {
		return false;
	}

	state.renderedSlots = [];
	state.slotsBodyEl.innerHTML = renderSlotsPanel(
		`
			<h3 class="hbe-booking__title">${escapeHtml(longDateFormatter.format(state.selectedDate))}</h3>
			<p class="hbe-booking__copy">This date is not available${matchingException.reason ? `: ${escapeHtml(matchingException.reason)}` : "."}</p>
		`,
		"blocked",
	);
	syncStepperUI(state);

	return true;
}

export function renderCompletedBookingState(state: BookingState): boolean {
	if (
		!state.slotsBodyEl ||
		!state.bookingCompleted ||
		!state.completedBooking
	) {
		return false;
	}

	// Reuse same transition pattern as availability↔details
	state.root.classList.remove(
		"is-inline-transitioning-out",
		"is-inline-transitioning-in",
	);
	state.root.classList.add("is-inline-transitioning-out");
	const slotsBodyEl = state.slotsBodyEl;

	window.setTimeout(() => {
		if (!slotsBodyEl) {
			return;
		}

		slotsBodyEl.innerHTML = renderSlotsPanel(
			renderSuccessPanel(state),
			"success",
		);
		syncStepperUI(state);

		window.requestAnimationFrame(() => {
			state.root.classList.remove("is-inline-transitioning-out");
			state.root.classList.add("is-inline-transitioning-in");

			// Trigger success-specific child animations alongside the panel fade-in
			const successCard = state.slotsBodyEl?.querySelector<HTMLElement>(
				".hbe-booking__booking-card--success",
			);
			if (successCard) {
				successCard.classList.add("is-entering");
			}

			window.setTimeout(() => {
				state.root.classList.remove("is-inline-transitioning-in");
			}, 420);
		});
	}, 180);

	return true;
}

export function renderDetailsSlotsState(
	state: BookingState,
	{
		noticeMarkup,
		serviceLabel,
		dateHeading,
		priceLabel,
	}: {
		noticeMarkup: string;
		serviceLabel: string | null;
		dateHeading: string;
		priceLabel: string;
	},
): boolean {
	if (
		!state.slotsBodyEl ||
		state.bookingStep !== "details" ||
		!state.selectedSlot
	) {
		return false;
	}

	state.slotsBodyEl.innerHTML = renderSlotsPanel(
		`
			${noticeMarkup}
			${renderBookingPanel(state, {
				serviceLabel,
				dateHeading,
				priceLabel,
			})}
		`,
		"details",
	);

	// Commit stepper DOM write BEFORE starting the animation so the mutation
	// doesn't steal a frame mid-transition.
	syncStepperUI(state);
	attachNoticeAnimationCleanup(state);
	state.bookingNoticeShouldAnimate = false;
	state.bookingNoticeShouldWiggle = false;

	return true;
}

export function renderNoAvailableSlotsState(
	state: BookingState,
	availableSlots: BookingSlot[],
	dateHeading: string,
): boolean {
	if (!state.slotsBodyEl || availableSlots.length > 0) {
		return false;
	}

	state.renderedSlots = [];
	setBookingStep(state, "availability");
	state.slotsBodyEl.innerHTML = renderSlotsPanel(
		`
			<h3 class="hbe-booking__title">${escapeHtml(dateHeading)}</h3>
			<p class="hbe-booking__copy">No times are available on this date.</p>
		`,
		"availability",
	);
	syncStepperUI(state);

	return true;
}

export function syncClearedSlotSelection(
	state: BookingState,
	availableSlots: BookingSlot[],
) {
	const selectedSlot = state.selectedSlot;
	const slotSelectionWasCleared =
		selectedSlot !== null &&
		!availableSlots.some((slot) => isSameSlot(slot, selectedSlot));

	if (!slotSelectionWasCleared) {
		return;
	}

	state.selectedSlot = null;
	setBookingStep(state, "availability");
	renderCalendarMeta(state);
}

export function renderBookingNoticeMarkup(state: BookingState): string {
	if (!state.bookingNotice) {
		return "";
	}

	const enteringClass = state.bookingNoticeShouldAnimate ? " is-entering" : "";
	const wiggleClass = state.bookingNoticeShouldWiggle ? " is-wiggling" : "";

	return `<div class="hbe-booking__booking-notice-wrap${enteringClass}">
		<div class="hbe-booking__booking-notice is-${escapeAttribute(state.bookingNotice.type)}${enteringClass}${wiggleClass}">
			${escapeHtml(state.bookingNotice.message)}
		</div>
	</div>`;
}

export function renderAvailableSlotsMarkup(
	state: BookingState,
	availableSlots: BookingSlot[],
): string {
	const slotsMarkup = availableSlots
		.map((slot, index) => {
			const isSelected =
				state.selectedSlot !== null && isSameSlot(slot, state.selectedSlot);

			return `
				<button
					type="button"
					class="hbe-booking__slot-item${isSelected ? " is-selected" : ""}"
					style="--i:${index}"
					data-slot-start="${escapeAttribute(slot.start)}"
					data-slot-end="${escapeAttribute(slot.end)}"
				>
					<span class="hbe-booking__slot-inner">
						<span class="hbe-booking__slot-dot"></span>
						<span class="hbe-booking__slot-time">${escapeHtml(formatSlotRange(slot, state.timeFormat))}</span>
					</span>
					<span class="hbe-booking__slot-arrow">
						<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
					</span>
				</button>
			`;
		})
		.join("");
	const backButtonMarkup = isStepperMode(state)
		? `
			<button
				type="button"
				class="hbe-booking__details-button is-secondary"
				data-stepper-target="calendar"
			>
				Back
			</button>
		`
		: "";
	const continueTargetMarkup = isStepperMode(state)
		? 'data-stepper-target="details"'
		: 'data-booking-step="details"';

	return `
		<div class="hbe-booking__slots-header">
			<h3 class="hbe-booking__title">${escapeHtml(shortWeekdayDateFormatter.format(state.selectedDate))}</h3>
			${renderTimeFormatToggle(state)}
		</div>
		<div class="hbe-booking__slot-list">${slotsMarkup}</div>
		<div class="hbe-booking__slot-actions">
			${backButtonMarkup}
			<button
				type="button"
				class="hbe-booking__details-button"
				${continueTargetMarkup}
				${state.selectedSlot ? "" : "disabled"}
			>
				Continue
			</button>
		</div>
	`;
}

export function animateRenderedSlotItems(slotsBodyEl: HTMLElement) {
	// Animate each slot item in using WAAPI — more reliable than CSS animations
	// on freshly-injected DOM (avoids transition:all conflicts and reflow timing issues).
	const slotItems = slotsBodyEl.querySelectorAll<HTMLElement>(
		".hbe-booking__slot-item",
	);
	slotItems.forEach((item, i) => {
		item.animate(
			[
				{ opacity: "0", transform: "translateY(8px) scale(0.98)" },
				{ opacity: "1", transform: "translateY(0) scale(1)" },
			],
			{
				duration: 360,
				delay: i * 50 + 30,
				easing: "cubic-bezier(0.16, 1, 0.3, 1)",
				fill: "backwards",
			},
		);
	});
}

export function renderSlots(state: BookingState) {
	renderFirstColumn(state);

	if (!state.slotsBodyEl || !state.calendar) {
		return;
	}

	if (
		renderAdminOnlySlotsState(state) ||
		renderUnselectedDateSlotsState(state)
	) {
		return;
	}

	const dateKey = toDateKey(state.selectedDate);
	const matchingException = getExceptionForDate(
		state.calendar.settings,
		dateKey,
	);

	if (renderExceptionSlotsState(state, matchingException)) {
		return;
	}

	const requiredMinutes = getRequiredMinutes(state);
	const availableSlots = getBookableSlotsForDate(
		state.calendar.settings,
		state.selectedDate,
		requiredMinutes,
		state.bookings,
	);
	state.renderedSlots = availableSlots;
	syncClearedSlotSelection(state, availableSlots);

	const dateHeading = longDateFormatter.format(state.selectedDate);
	const priceLabel = getSelectedPriceLabel(state);
	const serviceLabel = getSelectedServiceLabel(state);
	const noticeMarkup = renderBookingNoticeMarkup(state);

	if (renderCompletedBookingState(state)) {
		return;
	}

	if (
		renderDetailsSlotsState(state, {
			noticeMarkup,
			serviceLabel,
			dateHeading,
			priceLabel,
		})
	) {
		return;
	}

	if (renderNoAvailableSlotsState(state, availableSlots, dateHeading)) {
		return;
	}

	state.slotsBodyEl.innerHTML = renderSlotsPanel(
		renderAvailableSlotsMarkup(state, availableSlots),
		"availability",
	);

	syncStepperUI(state);
	animateRenderedSlotItems(state.slotsBodyEl);
}

export function renderBookingSummaryMarkup(
	summaryServiceLabel: string | null,
	dateHeading: string,
	timeLabel: string,
	priceLabel: string,
): string {
	return `
		<div class="hbe-booking__booking-summary">
			<div class="hbe-booking__booking-kicker">Booking summary</div>
			${summaryServiceLabel ? renderBookingSummaryRow("Service", summaryServiceLabel) : ""}
			${renderBookingSummaryRow("Date", dateHeading)}
			${renderBookingSummaryRow("Time", timeLabel)}
			${renderBookingSummaryRow("Total Due", priceLabel, " is-total")}
		</div>
	`;
}

export function renderBookingFieldsMarkup(state: BookingState): string {
	const disabledMarkup = state.isSubmittingBooking ? "disabled" : "";

	return `
		<div class="hbe-booking__booking-fields">
			<label class="hbe-booking__field hbe-booking__field--half">
				<span>Full name</span>
				<input
					type="text"
					value="${escapeAttribute(state.bookingForm.name)}"
					data-booking-field="name"
					placeholder="Your name"
					${disabledMarkup}
				/>
			</label>
			<label class="hbe-booking__field hbe-booking__field--half">
				<span>Email address</span>
				<input
					type="email"
					value="${escapeAttribute(state.bookingForm.email)}"
					data-booking-field="email"
					placeholder="you@example.com"
					${disabledMarkup}
				/>
			</label>
			<label class="hbe-booking__field hbe-booking__field--half">
				<span>Phone number</span>
				<input
					type="tel"
					value="${escapeAttribute(state.bookingForm.phone)}"
					data-booking-field="phone"
					placeholder="Optional"
					${disabledMarkup}
				/>
			</label>
			<label class="hbe-booking__field hbe-booking__field--full">
				<span>Additional notes</span>
				<textarea
					rows="4"
					data-booking-field="notes"
					placeholder="Anything we should know?"
					${disabledMarkup}
				>${escapeHtml(state.bookingForm.notes)}</textarea>
			</label>
		</div>
	`;
}

export function renderBookingActionsMarkup(state: BookingState): string {
	const backTargetMarkup = isStepperMode(state)
		? 'data-stepper-target="slots"'
		: 'data-booking-step="availability"';
	const backLabel = isStepperMode(state) ? "Back to Time" : "Back to Calendar";
	const submitLabel = state.isSubmittingBooking
		? '<span class="hbe-booking__button-spinner" aria-hidden="true"></span><span>Confirming...</span>'
		: "<span>Confirm booking</span>";
	const submitDisabledMarkup = state.isSubmittingBooking
		? 'disabled aria-disabled="true"'
		: "";

	return `
		<div class="hbe-booking__booking-actions">
			<button
				type="button"
				class="hbe-booking__details-button is-secondary"
				${backTargetMarkup}
			>
				${backLabel}
			</button>
			<button
				type="submit"
				class="hbe-booking__confirm-button${state.isSubmittingBooking ? " is-loading" : ""}"
				data-booking-submit="true"
				${submitDisabledMarkup}
			>
				${submitLabel}
			</button>
		</div>
	`;
}

export function renderBookingPanel(
	state: BookingState,
	{
		serviceLabel,
		dateHeading,
		priceLabel,
	}: {
		serviceLabel: string | null;
		dateHeading: string;
		priceLabel: string;
	},
): string {
	const timeLabel = state.selectedSlot
		? formatSlotRange(state.selectedSlot, state.timeFormat)
		: "Choose a slot";
	const summaryServiceLabel =
		serviceLabel ??
		(state.selectedSlot
			? getDefaultMeetingLabel(
					state,
					state.selectedSlot.startDate,
					state.selectedSlot.endDate,
				)
			: null);
	const summaryMarkup = state.showReservationSummary
		? renderBookingSummaryMarkup(
				summaryServiceLabel,
				dateHeading,
				timeLabel,
				priceLabel,
			)
		: "";

	return `
		<form class="hbe-booking__booking-card hbe-booking__booking-form" data-booking-form="true" ${state.isSubmittingBooking ? 'aria-busy="true"' : ""} novalidate>
			<div class="hbe-booking__booking-scroll">
				${summaryMarkup}
				${renderBookingFieldsMarkup(state)}
			</div>
			${renderBookingActionsMarkup(state)}
			<p class="hbe-booking__booking-policy">Your booking details will appear here once the reservation is confirmed.</p>
		</form>
	`;
}

export function renderBookingSummaryRow(
	label: string,
	value: string,
	extraClass = "",
): string {
	return `
		<div class="hbe-booking__booking-row${extraClass}">
			<span>${escapeHtml(label)}</span>
			<strong>${escapeHtml(value)}</strong>
		</div>
	`;
}

export function getPublicDisplayName(state: BookingState): string | null {
	if (!state.calendar) {
		return null;
	}

	const publicBooking = state.calendar.settings.publicBooking;
	const explicitName = publicBooking?.displayName?.trim();
	const calendarTitle = state.calendar.title.trim();

	return explicitName || calendarTitle || null;
}

export function getDefaultMeetingLabel(
	state: BookingState,
	startDate: Date,
	endDate: Date,
): string {
	const configuredLabel =
		state.calendar?.settings.publicBooking?.defaultServiceLabel?.trim() ?? "";

	if (configuredLabel) {
		return configuredLabel;
	}

	return `${getMeetingDurationMinutes(startDate, endDate)} minute meeting`;
}

export function getCompletedBookingHost(state: BookingState): {
	hostLabel: string | null;
	hostEmail: string | null;
	locationLabel: string | null;
} {
	if (!state.calendar) {
		return { hostLabel: null, hostEmail: null, locationLabel: null };
	}

	const publicBooking = state.calendar.settings.publicBooking;
	const hostLabel =
		publicBooking?.displayName?.trim() || state.calendar.title.trim() || null;
	const locationLabel = publicBooking?.locationLabel?.trim() || null;

	return { hostLabel, hostEmail: null, locationLabel };
}

export function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join("");
}

export function renderSuccessCard(
	completedBooking: CompletedBookingState,
): string {
	const noteItems = completedBooking.notes
		.split(/\r?\n/)
		.map((n) => n.trim())
		.filter(Boolean);
	const initials = getInitials(completedBooking.customerName);

	const sessionText = completedBooking.hostLabel
		? `${completedBooking.whatLabel} with ${completedBooking.hostLabel}`
		: completedBooking.whatLabel;

	const timeLine = completedBooking.timeZoneLabel
		? `${completedBooking.timeLabel} · ${completedBooking.timeZoneLabel}`
		: completedBooking.timeLabel;

	const locationSection = completedBooking.locationLabel
		? `<span class="hbe-booking__success-kv-sub">${escapeHtml(completedBooking.locationLabel)}</span>`
		: "";

	const notesSection =
		noteItems.length > 0
			? `
		<div class="hbe-booking__success-section">
			<span class="hbe-booking__success-section-label">Notes</span>
			${noteItems.map((n) => `<span class="hbe-booking__success-kv-value">${escapeHtml(n)}</span>`).join("")}
		</div>`
			: "";

	return `
		<div class="hbe-booking__success-card">
			<div class="hbe-booking__success-section">
				<span class="hbe-booking__success-section-label">Session</span>
				<p class="hbe-booking__success-session-text">${escapeHtml(sessionText)}</p>
				${locationSection}
			</div>
			<div class="hbe-booking__success-section">
				<span class="hbe-booking__success-section-label">Date &amp; Time</span>
				<span class="hbe-booking__success-kv-value">${escapeHtml(completedBooking.dateHeading)}</span>
				<span class="hbe-booking__success-kv-sub">${escapeHtml(timeLine)}</span>
			</div>
			<div class="hbe-booking__success-section">
				<span class="hbe-booking__success-section-label">Participant</span>
				<div class="hbe-booking__success-participant">
					<div class="hbe-booking__success-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
					<div class="hbe-booking__success-participant-info">
						<span class="hbe-booking__success-kv-value">${escapeHtml(completedBooking.customerName)}</span>
						${completedBooking.customerEmail ? `<span class="hbe-booking__success-kv-sub">${escapeHtml(completedBooking.customerEmail)}</span>` : ""}
					</div>
				</div>
			</div>
			${notesSection}
		</div>
	`;
}

export function renderSuccessPanel(state: BookingState): string {
	const title = state.successTitle.trim() || "Booking Confirmed";
	const copy =
		state.successText.trim() || "Your meeting has been successfully scheduled.";
	const buttonLabel = state.successButtonLabel.trim() || "Book another time";
	const completedBooking = state.completedBooking;

	return `
		<div class="hbe-booking__booking-card hbe-booking__booking-card--success">
			<div class="hbe-booking__success-hero">
				<div class="hbe-booking__success-icon-wrap">
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path d="M5 12.5 9.5 17 19 7.5"></path>
					</svg>
				</div>
				<div class="hbe-booking__success-head">
					<h3 class="hbe-booking__title">${escapeHtml(title)}</h3>
					<p class="hbe-booking__copy hbe-booking__success-copy">${escapeHtml(copy)}</p>
				</div>
				<button
					type="button"
					class="hbe-booking__success-cta"
					data-booking-reset="true"
				>
					${escapeHtml(buttonLabel)}
				</button>
			</div>
			${completedBooking ? renderSuccessCard(completedBooking) : ""}
		</div>
	`;
}

export function renderTimeFormatToggle(state: BookingState): string {
	const is12 = state.timeFormat === "12h";
	return `
		<div class="hbe-booking__time-toggle">
			<button type="button" class="hbe-booking__time-toggle-btn${is12 ? " is-active" : ""}" data-time-format="12h">12h</button>
			<button type="button" class="hbe-booking__time-toggle-btn${!is12 ? " is-active" : ""}" data-time-format="24h">24h</button>
		</div>
	`;
}

export async function submitPublicBooking(state: BookingState) {
	if (state.isSubmittingBooking) {
		return;
	}

	if (!state.calendar || !state.selectedDate || !state.selectedSlot) {
		setBookingNotice(state, {
			type: "error",
			message: "Select a date and time slot first.",
		});
		renderSlots(state);
		return;
	}

	if (state.bookingForm.name.trim() === "") {
		setBookingNotice(state, {
			type: "error",
			message: "Enter your name to confirm the booking.",
		});
		renderSlots(state);
		return;
	}

	if (state.bookingForm.email.trim() === "") {
		setBookingNotice(state, {
			type: "error",
			message: "Enter your email to confirm the booking.",
		});
		renderSlots(state);
		return;
	}

	state.isSubmittingBooking = true;
	setBookingNotice(state, null);
	dispatchBookingEvent(state, "submit", {
		start: state.selectedSlot.start,
		end: state.selectedSlot.end,
		serviceIds: Array.from(state.selectedServiceIds),
		serviceLabel: getSelectedServiceLabel(state),
	});
	renderSlots(state);

	try {
		const booking = await createPublicBookingRequest(state, state.selectedSlot);
		const { hostLabel, hostEmail, locationLabel } =
			getCompletedBookingHost(state);
		const startIso =
			booking.start || state.selectedSlot.startDate.toISOString();
		const endIso = booking.end || state.selectedSlot.endDate.toISOString();
		const startDate = new Date(startIso);
		const endDate = new Date(endIso);
		const timezone =
			booking.timezone?.trim() ||
			Intl.DateTimeFormat().resolvedOptions().timeZone;
		const timeZoneLabel = getTimeZoneLabel(startDate, timezone);
		const customerName =
			state.bookingForm.name.trim() ||
			booking.customerName?.trim() ||
			booking.title?.trim() ||
			"Guest";
		const customerEmail =
			state.bookingForm.email.trim() || booking.customerEmail?.trim() || "";
		const notes = state.bookingForm.notes.trim();
		const serviceLabel = getSelectedServiceLabel(state);
		const defaultMeetingLabel = getDefaultMeetingLabel(
			state,
			startDate,
			endDate,
		);
		const completedBooking: CompletedBookingState = {
			serviceLabel,
			whatLabel: buildCompletedBookingWhatLabel(
				serviceLabel,
				startDate,
				endDate,
				defaultMeetingLabel,
			),
			dateHeading: formatLongDate(startDate, timezone),
			timeLabel: formatTimeRange(
				startDate,
				endDate,
				state.timeFormat,
				timezone,
			),
			scheduleLabel: formatMeetingSchedule(
				startDate,
				endDate,
				timezone,
				state.timeFormat,
			),
			timeZoneLabel,
			customerName,
			customerEmail,
			hostLabel,
			hostEmail,
			locationLabel,
			notes,
		};
		state.bookings = [...state.bookings, booking];
		state.bookingCompleted = true;
		state.completedBooking = completedBooking;
		syncBookingLayoutState(state);
		state.selectedSlot = null;
		setBookingStep(state, "availability", false);
		if (isStepperMode(state)) {
			setStepperDirection(state, "success");
			state.stepperPanel = "success";
		}
		state.bookingForm = {
			name: "",
			email: "",
			phone: "",
			notes: "",
		};
		setBookingNotice(state, null);
		state.calendarInstance?.redraw();
		dispatchBookingEvent(state, "success", {
			bookingId: booking.id,
			start: booking.start,
			end: booking.end,
			serviceIds: Array.from(state.selectedServiceIds),
			serviceLabel: completedBooking.whatLabel,
		});
		renderCalendarMeta(state);
		renderSlots(state);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Booking could not be created.";
		setBookingNotice(state, {
			type: "error",
			message,
		});
		dispatchBookingEvent(state, "error", {
			message,
			serviceIds: Array.from(state.selectedServiceIds),
			serviceLabel: getSelectedServiceLabel(state),
		});
		renderSlots(state);
	} finally {
		state.isSubmittingBooking = false;
		renderSlots(state);
	}
}

export function dispatchBookingEvent(
	state: BookingState,
	eventName: "submit" | "success" | "error",
	detail: Record<string, unknown>,
) {
	state.root.dispatchEvent(
		new CustomEvent(`hbe:booking-${eventName}`, {
			bubbles: true,
			detail: {
				calendarId: state.calendarId,
				layoutMode: state.layoutMode,
				...detail,
			},
		}),
	);
}
