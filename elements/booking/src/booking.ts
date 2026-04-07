import "./booking.css";

type FirstColumnMode = "off" | "info" | "service";
type WeekdayKey =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

type Service = {
	id: string;
	name: string;
	description?: string;
	duration?: number;
	prepTime?: number;
	cleanupTime?: number;
	price?: string;
};

type DateException = {
	id: string;
	date: string;
	reason?: string;
};

type WorkingInterval = {
	start: string;
	end: string;
};

type WorkingDay = {
	enabled?: boolean;
	intervals?: WorkingInterval[];
};

type MailSettings = {
	enabled?: boolean;
	host?: string;
	port?: number;
	encryption?: string;
	username?: string;
	password?: string;
	fromName?: string;
	fromEmail?: string;
	subject?: string;
};

type CalendarSettings = {
	icon?: string;
	adminOnly?: boolean;
	allowDoubleBookings?: boolean;
	slotSettings?: {
		sessionDuration?: number;
		prepTime?: number;
		cleanupTime?: number;
		maxAdvanceDays?: number;
	};
	selectionMode?: "single" | "multi";
	services?: Service[];
	exceptions?: DateException[];
	workingHours?: Partial<Record<WeekdayKey, WorkingDay>>;
	mailSettings?: MailSettings;
};

type PublicCalendar = {
	id: number;
	title: string;
	slug: string;
	settings: CalendarSettings;
};

type PublicBooking = {
	id: number;
	start: string;
	end: string;
	status?: string;
	serviceId?: string;
	title?: string;
};

type BookingSlot = {
	start: string;
	end: string;
	startDate: Date;
	endDate: Date;
};

type BookingFormState = {
	name: string;
	email: string;
	phone: string;
	notes: string;
};

type BookingNotice = {
	type: "success" | "error" | "info";
	message: string;
};

type BookingState = {
	root: HTMLElement;
	calendarMetaEl: HTMLElement | null;
	statusEl: HTMLElement | null;
	firstBodyEl: HTMLElement | null;
	slotsBodyEl: HTMLElement | null;
	calendarMountEl: HTMLElement | null;
	firstColumnMode: FirstColumnMode;
	showSlots: boolean;
	infoTitle: string;
	infoText: string;
	firstColumnLabel: string;
	showReservationSummary: boolean;
	isBuilderPreview: boolean;
	restBase: string;
	calendarId: number;
	calendar: PublicCalendar | null;
	bookings: PublicBooking[];
	bookingsRangeEnd: Date | null;
	visibleDate: Date | null;
	selectedDate: Date | null;
	selectedSlot: BookingSlot | null;
	selectedServiceIds: Set<string>;
	bookingForm: BookingFormState;
	bookingNotice: BookingNotice | null;
	bookingStep: "availability" | "details";
	stepTransitionTimer: number | null;
	isSubmittingBooking: boolean;
	timeFormat: "12h" | "24h";
	calendarInstance: {
		clear: () => void;
		redraw: () => void;
		destroy: () => void;
	} | null;
};

const weekdayKeys: WeekdayKey[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];

const longDateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, {
	month: "long",
	year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

const timeFormatter12 = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
	hour12: true,
});

const timeFormatter24 = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

const shortWeekdayDateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
});

const calendarWeekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function bootBookingElements() {
	document
		.querySelectorAll<HTMLElement>("[data-hbe-booking]")
		.forEach((root) => {
			void initBookingElement(root);
		});
}

async function initBookingElement(root: HTMLElement) {
	const state: BookingState = {
		root,
		calendarMetaEl: root.querySelector<HTMLElement>(".hbe-booking__calendar-meta"),
		statusEl: root.querySelector<HTMLElement>(".hbe-booking__status"),
		firstBodyEl: root.querySelector<HTMLElement>(".hbe-booking__first-body"),
		slotsBodyEl: root.querySelector<HTMLElement>(".hbe-booking__slots-body"),
		calendarMountEl: root.querySelector<HTMLElement>(".hbe-booking__calendar-mount"),
		firstColumnMode: normalizeFirstColumnMode(root.dataset.firstColumnMode),
		showSlots: root.dataset.showSlots !== "false",
		infoTitle: root.dataset.infoTitle ?? "",
		infoText: root.dataset.infoText ?? "",
		firstColumnLabel: root.dataset.firstColumnLabel ?? "",
		showReservationSummary: root.dataset.showSummary === "true",
		isBuilderPreview: root.dataset.builderPreview === "true",
		restBase: (root.dataset.restBase ?? "").replace(/\/$/, ""),
		calendarId: Number.parseInt(root.dataset.calendarId ?? "0", 10) || 0,
		calendar: null,
		bookings: [],
		bookingsRangeEnd: null,
		visibleDate: null,
		selectedDate: null,
		selectedSlot: null,
		selectedServiceIds: new Set<string>(),
		bookingForm: {
			name: "",
			email: "",
			phone: "",
			notes: "",
		},
		bookingNotice: null,
		bookingStep: "availability",
		stepTransitionTimer: null,
		isSubmittingBooking: false,
		timeFormat: "12h",
		calendarInstance: null,
	};

	if (!state.calendarMountEl || !state.statusEl) {
		return;
	}

	setBookingStep(state, "availability", false);

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
		state.selectedServiceIds = getInitialServiceSelection(calendar.settings);
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
	}
}

function normalizeFirstColumnMode(mode?: string): FirstColumnMode {
	if (mode === "off" || mode === "info" || mode === "service") {
		return mode;
	}

	return "service";
}

function getInitialServiceSelection(settings: CalendarSettings): Set<string> {
	const services = Array.isArray(settings.services) ? settings.services : [];

	if (
		settings.selectionMode === "single" &&
		services.length > 0 &&
		services[0]?.id
	) {
		return new Set([services[0].id]);
	}

	return new Set<string>();
}

async function ensureBookingsLoaded(
	state: BookingState,
	focusDate: Date = new Date(),
) {
	if (!state.calendar) {
		return;
	}

	const targetEnd = getBookingsRangeEnd(state.calendar.settings, focusDate);

	if (state.bookingsRangeEnd && state.bookingsRangeEnd >= targetEnd) {
		return;
	}

	const startDate = startOfDay(new Date());
	const params = new URLSearchParams({
		start: startDate.toISOString(),
		end: targetEnd.toISOString(),
	});
	const response = await fetch(
		`${state.restBase}/public/calendars/${state.calendarId}/bookings?${params.toString()}`,
	);

	if (!response.ok) {
		throw new Error(`Failed to load bookings (${response.status})`);
	}

	const data = (await response.json()) as { items?: PublicBooking[] };
	state.bookings = Array.isArray(data.items) ? data.items : [];
	state.bookingsRangeEnd = targetEnd;
}

async function selectFirstAvailableDate(state: BookingState) {
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

async function createPublicBookingRequest(
	state: BookingState,
	slot: BookingSlot,
): Promise<PublicBooking> {
	const response = await fetch(
		`${state.restBase}/public/calendars/${state.calendarId}/bookings`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: state.bookingForm.name,
				description: state.bookingForm.notes,
				customerEmail: state.bookingForm.email,
				customerPhone: state.bookingForm.phone,
				serviceId: getPrimaryServiceId(state),
				start: slot.startDate.toISOString(),
				end: slot.endDate.toISOString(),
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				meta: {
					selectedServiceIds: Array.from(state.selectedServiceIds),
					selectedServiceNames: getActiveServices(state).map((service) => service.name),
				},
			}),
		},
	);

	const data = (await response.json()) as { item?: PublicBooking; message?: string };

	if (!response.ok || !data.item) {
		throw new Error(
			typeof data.message === "string"
				? data.message
				: "Booking could not be created.",
		);
	}

	return data.item;
}

function renderLoadingState(state: BookingState) {
	if (state.statusEl) {
		state.statusEl.innerHTML = `
			<span class="hbe-booking__status-label">Loading</span>
			<strong class="hbe-booking__status-title">Checking availability</strong>
			<span class="hbe-booking__status-copy">Loading calendar...</span>
		`;
	}

	if (state.firstColumnMode === "service" && state.firstBodyEl) {
		state.firstBodyEl.innerHTML =
			'<p class="hbe-booking__copy">Loading services...</p>';
	}

	if (state.slotsBodyEl) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Select a date</h3>
			<p class="hbe-booking__copy">Available booking times will appear after the calendar has loaded.</p>
		`;
	}
}

function renderMissingCalendar(state: BookingState) {
	if (state.statusEl) {
		state.statusEl.textContent =
			"Select a calendar in Bricks Builder to populate the month view.";
	}

	if (state.firstBodyEl && !state.isBuilderPreview) {
		state.firstBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">No calendar selected</h3>
			<p class="hbe-booking__copy">This element needs a calendar from the admin area.</p>
		`;
	}

	if (state.slotsBodyEl && !state.isBuilderPreview) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">No availability yet</h3>
			<p class="hbe-booking__copy">Pick a calendar first so the booking block can load its dates.</p>
		`;
	}
}

function renderErrorState(state: BookingState, message: string) {
	if (state.statusEl) {
		state.statusEl.innerHTML = `
			<span class="hbe-booking__status-label">Calendar unavailable</span>
			<strong class="hbe-booking__status-title">Availability could not be loaded</strong>
			<span class="hbe-booking__status-copy">${escapeHtml(message)}</span>
		`;
	}

	if (state.calendarMetaEl) {
		state.calendarMetaEl.innerHTML = `
			<h3 class="hbe-booking__title">Calendar unavailable</h3>
			<p class="hbe-booking__copy">${escapeHtml(message)}</p>
		`;
	}

	if (state.firstBodyEl && state.firstColumnMode === "service") {
		state.firstBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Services unavailable</h3>
			<p class="hbe-booking__copy">The selected calendar could not be loaded.</p>
		`;
	}

	if (state.slotsBodyEl) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Availability unavailable</h3>
			<p class="hbe-booking__copy">The calendar data could not be loaded.</p>
		`;
	}
}

function setBookingStep(
	state: BookingState,
	step: "availability" | "details",
	animate = true,
) {
	const previousStep = state.bookingStep;

	if (state.stepTransitionTimer !== null) {
		window.clearTimeout(state.stepTransitionTimer);
		state.stepTransitionTimer = null;
	}

	state.root.classList.remove(
		"is-transitioning-to-details",
		"is-transitioning-to-availability",
	);

	state.bookingStep = step;
	state.root.classList.toggle("is-details-view", step === "details");

	if (!animate || previousStep === step) {
		return;
	}

	const transitionClass =
		step === "details"
			? "is-transitioning-to-details"
			: "is-transitioning-to-availability";

	state.root.classList.add(transitionClass);
	state.stepTransitionTimer = window.setTimeout(() => {
		state.root.classList.remove(transitionClass);
		state.stepTransitionTimer = null;
	}, 440);
}

function renderCalendarMeta(state: BookingState) {
	const calendar = state.calendar;

	if (!calendar || !state.calendarMetaEl || !state.statusEl) {
		return;
	}

	const availabilitySummary = getAvailabilitySummary(state);
	const selectedServices = getActiveServices(state);
	const serviceSummary =
		selectedServices.length > 0
			? selectedServices.map((service) => service.name).join(", ")
			: state.firstColumnMode === "service"
				? "Select a service to narrow availability."
				: "Choose a day to inspect the currently available booking slots.";

	state.calendarMetaEl.innerHTML = `
		<div class="hbe-booking__calendar-topline">
			<div>
				<h3 class="hbe-booking__title">Select Date</h3>
			</div>
		</div>
		<p class="hbe-booking__copy">${escapeHtml(serviceSummary)}</p>
	`;

	if (calendar.settings.adminOnly) {
		state.statusEl.innerHTML = `
			<span class="hbe-booking__status-label">Private calendar</span>
			<strong class="hbe-booking__status-title">Online booking is disabled</strong>
			<span class="hbe-booking__status-copy">This calendar is currently configured for admin-only bookings.</span>
		`;
		return;
	}

	if (state.selectedSlot !== null && state.selectedDate !== null) {
		state.statusEl.innerHTML = `
			<span class="hbe-booking__status-label">Current Selection</span>
			<strong class="hbe-booking__status-title">${escapeHtml(longDateFormatter.format(state.selectedDate))}</strong>
			<span class="hbe-booking__status-copy">Selected ${escapeHtml(formatSlotRange(state.selectedSlot, state.timeFormat))}. ${escapeHtml(state.bookingStep === "details" ? "Complete the reservation form to confirm the booking." : "Continue to booking details to confirm the booking.")}</span>
		`;
		return;
	}

	const nextAvailableSlot = findNextAvailableSlot(state);

	if (nextAvailableSlot) {
		state.statusEl.innerHTML = `
			<span class="hbe-booking__status-label">Next Availability</span>
			<strong class="hbe-booking__status-title">${escapeHtml(longDateFormatter.format(nextAvailableSlot.startDate))}</strong>
			<span class="hbe-booking__status-copy">${escapeHtml(availabilitySummary)} First open slot: ${escapeHtml(formatSlotRange(nextAvailableSlot, state.timeFormat))}.</span>
		`;
		return;
	}

	state.statusEl.innerHTML = `
		<span class="hbe-booking__status-label">Next Availability</span>
		<strong class="hbe-booking__status-title">No upcoming slots found</strong>
		<span class="hbe-booking__status-copy">${escapeHtml(availabilitySummary)}</span>
	`;
}

function getAvailabilitySummary(state: BookingState): string {
	const calendar = state.calendar;

	if (!calendar) {
		return "";
	}

	if (calendar.settings.adminOnly) {
		return "Online booking is disabled for this calendar.";
	}

	if (state.firstColumnMode === "service") {
		const selectedServices = getActiveServices(state);

		if (selectedServices.length > 0) {
			return `${selectedServices.length} selected service${selectedServices.length === 1 ? "" : "s"} with bookable slots calculated from duration.`;
		}

		const availableServices = Array.isArray(calendar.settings.services)
			? calendar.settings.services.length
			: 0;

		return availableServices > 0
			? `${availableServices} service${availableServices === 1 ? "" : "s"} available.`
			: "No services configured yet.";
	}

	const defaultSlotMinutes = getDefaultSlotMinutes(calendar.settings);

	return defaultSlotMinutes > 0
		? `Default slot footprint: ${defaultSlotMinutes} min.`
		: "Select a date to inspect the currently available day structure.";
}

function findNextAvailableSlot(state: BookingState): BookingSlot | null {
	if (!state.calendar) {
		return null;
	}

	const startDate = startOfDay(new Date());
	const maxAdvanceDays = getMaxAdvanceDays(state.calendar.settings);
	const searchWindow = maxAdvanceDays > 0 ? maxAdvanceDays : 62;
	const requiredMinutes = getRequiredMinutes(state);

	for (let offset = 0; offset <= searchWindow; offset += 1) {
		const candidate = new Date(
			startDate.getFullYear(),
			startDate.getMonth(),
			startDate.getDate() + offset,
		);

		const slots = getBookableSlotsForDate(
			state.calendar.settings,
			candidate,
			requiredMinutes,
			state.bookings,
		);

		if (slots.length > 0) {
			return slots[0];
		}
	}

	return null;
}

function renderFirstColumn(state: BookingState) {
	if (!state.firstBodyEl || state.firstColumnMode === "off" || !state.calendar) {
		return;
	}

	if (state.firstColumnMode === "info") {
		renderInfoColumn(state);
		return;
	}

	renderServicesColumn(state);
}

function renderInfoColumn(state: BookingState) {
	if (!state.firstBodyEl || !state.calendar) {
		return;
	}

	const title = state.infoTitle.trim() || state.calendar.title;
	const text =
		state.infoText.trim() ||
		"Add introductory text in Bricks Builder for this booking calendar.";
	const icon = state.calendar.settings.icon?.trim() ?? "";

	state.firstBodyEl.innerHTML = `
		<div class="hbe-booking__first-layout">
			<div class="hbe-booking__info-stack">
				${
					icon
						? `<span class="hbe-booking__info-icon">${escapeHtml(icon)}</span>`
						: ""
				}
				<h3 class="hbe-booking__title">${escapeHtml(title)}</h3>
				<p class="hbe-booking__copy">${escapeHtml(text)}</p>
			</div>
			${renderFirstColumnSelection(state)}
		</div>
	`;
}

function renderServicesColumn(state: BookingState) {
	if (!state.firstBodyEl || !state.calendar) {
		return;
	}

	const services = Array.isArray(state.calendar.settings.services)
		? state.calendar.settings.services
		: [];
	const heading = state.firstColumnLabel.trim() || "Services";

	if (services.length === 0) {
		state.firstBodyEl.innerHTML = `
			<div class="hbe-booking__first-layout">
				<div class="hbe-booking__info-stack">
					<h3 class="hbe-booking__title">${escapeHtml(heading)}</h3>
					<p class="hbe-booking__copy">Add services in the admin settings to populate this column.</p>
				</div>
				${renderFirstColumnSelection(state)}
			</div>
		`;
		return;
	}

	const isMulti = state.calendar.settings.selectionMode === "multi";
	const description = isMulti
		? "Select one or more services."
		: "Select a service.";

	const buttonsMarkup = services
		.map((service) => {
			const isActive = state.selectedServiceIds.has(service.id);
			const serviceMinutes = getServiceMinutes(service);
			const servicePrice = service.price?.trim() ?? "";

			return `
				<button
					type="button"
					class="hbe-booking__service-button${isActive ? " is-active" : ""}"
					data-service-id="${escapeAttribute(service.id)}"
					aria-pressed="${isActive ? "true" : "false"}"
				>
					<span class="hbe-booking__service-name">${escapeHtml(service.name)}</span>
					${
						serviceMinutes > 0
							? `<span class="hbe-booking__service-meta">${serviceMinutes} min</span>`
							: ""
					}
					${
						service.description
							? `<span class="hbe-booking__service-copy">${escapeHtml(service.description)}</span>`
							: ""
					}
					${
						servicePrice
							? `<span class="hbe-booking__service-price">${escapeHtml(servicePrice)}</span>`
							: ""
					}
				</button>
			`;
		})
		.join("");

	state.firstBodyEl.innerHTML = `
		<div class="hbe-booking__first-layout">
			<div class="hbe-booking__service-buttons">${buttonsMarkup}</div>
			${renderFirstColumnSelection(state)}
		</div>
	`;

	state.firstBodyEl
		.querySelectorAll<HTMLButtonElement>("[data-service-id]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				void toggleServiceSelection(state, button.dataset.serviceId ?? "");
			});
		});
}

function renderFirstColumnSelection(state: BookingState): string {
	if (!state.selectedDate || !state.selectedSlot) {
		return "";
	}

	return `
		<div class="hbe-booking__first-selection">
			<div class="hbe-booking__first-selection-label">Selected Time</div>
			<div class="hbe-booking__first-selection-value">
				${escapeHtml(longDateFormatter.format(state.selectedDate))} •<br />
				${escapeHtml(formatSlotRange(state.selectedSlot, state.timeFormat))}
			</div>
		</div>
	`;
}

async function toggleServiceSelection(state: BookingState, serviceId: string) {
	if (!serviceId || !state.calendar) {
		return;
	}

	if (state.calendar.settings.selectionMode === "multi") {
		if (state.selectedServiceIds.has(serviceId)) {
			state.selectedServiceIds.delete(serviceId);
		} else {
			state.selectedServiceIds.add(serviceId);
		}
	} else {
		state.selectedServiceIds = new Set([serviceId]);
	}

	state.bookingNotice = null;
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

function mountCalendar(state: BookingState) {
	if (!state.calendarMountEl || !state.calendar) {
		return;
	}

	state.calendarInstance?.destroy();
	state.calendarMountEl.innerHTML = "";

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
	`;

	state.calendarMountEl
		.querySelectorAll<HTMLButtonElement>("[data-calendar-date]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				const dateKey = button.dataset.calendarDate;

				if (!dateKey) {
					return;
				}

				const clickedDate = parseDateKey(dateKey);

				if (!clickedDate || !isDateAvailable(state, clickedDate)) {
					return;
				}

				state.selectedDate = clickedDate;
				state.selectedSlot = null;
				state.bookingNotice = null;
				setBookingStep(state, "availability");
				renderCalendarMeta(state);
				renderSlots(state);
				state.calendarInstance?.redraw();
			});
		});

	state.calendarMountEl
		.querySelector<HTMLButtonElement>('[data-calendar-nav="prev"]')
		?.addEventListener("click", () => {
			void navigateCalendarMonth(state, -1);
		});

	state.calendarMountEl
		.querySelector<HTMLButtonElement>('[data-calendar-nav="next"]')
		?.addEventListener("click", () => {
			void navigateCalendarMonth(state, 1);
		});

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
}

async function navigateCalendarMonth(state: BookingState, delta: number) {
	if (!state.calendar) {
		return;
	}

	const currentMonth = state.visibleDate ?? state.selectedDate ?? startOfDay(new Date());
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
		state.bookingNotice = {
			type: "error",
			message:
				error instanceof Error
					? error.message
					: "Bookings could not be refreshed.",
		};
		renderSlots(state);
	}
}

function renderSlots(state: BookingState) {
	if (!state.slotsBodyEl || !state.calendar) {
		return;
	}

	renderFirstColumn(state);

	if (state.calendar.settings.adminOnly) {
		setBookingStep(state, "availability");
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Admin only</h3>
			<p class="hbe-booking__copy">This calendar is intentionally blocked for public booking right now.</p>
		`;
		return;
	}

	if (!state.selectedDate) {
		setBookingStep(state, "availability");
		state.slotsBodyEl.innerHTML = `
			<div class="hbe-booking__slots-header">
				<p class="hbe-booking__copy">Pick a day on the calendar.</p>
				${renderTimeFormatToggle(state)}
			</div>
		`;
		attachTimeFormatToggle(state);
		return;
	}

	const dateKey = toDateKey(state.selectedDate);
	const matchingException = getExceptionForDate(state.calendar.settings, dateKey);

	if (matchingException) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">${escapeHtml(longDateFormatter.format(state.selectedDate))}</h3>
			<p class="hbe-booking__copy">This date is blocked${matchingException.reason ? `: ${escapeHtml(matchingException.reason)}` : "."}</p>
		`;
		return;
	}

	const requiredMinutes = getRequiredMinutes(state);
	const availableSlots = getBookableSlotsForDate(
		state.calendar.settings,
		state.selectedDate,
		requiredMinutes,
		state.bookings,
	);

	const slotSelectionWasCleared =
		state.selectedSlot !== null &&
		!availableSlots.some((slot) => isSameSlot(slot, state.selectedSlot as BookingSlot));

	if (slotSelectionWasCleared) {
		state.selectedSlot = null;
		setBookingStep(state, "availability");
	}

	if (slotSelectionWasCleared) {
		renderCalendarMeta(state);
	}

	const dateHeading = longDateFormatter.format(state.selectedDate);
	const priceLabel = getSelectedPriceLabel(state);
	const selectedServices = getActiveServices(state);
	const selectionLabel =
		selectedServices.length > 0
			? selectedServices.map((service) => service.name).join(", ")
			: state.firstColumnMode === "service"
				? "Select a service"
				: "Default booking";
	const noticeMarkup = state.bookingNotice
		? `<div class="hbe-booking__booking-notice is-${escapeAttribute(state.bookingNotice.type)}">${escapeHtml(state.bookingNotice.message)}</div>`
		: "";

	if (state.bookingStep === "details" && state.selectedSlot) {
		state.slotsBodyEl.innerHTML = `
			${noticeMarkup}
			${renderBookingPanel(state, {
				selectionLabel,
				dateHeading,
				priceLabel,
			})}
		`;

		attachSlotInteractions(state, availableSlots);
		return;
	}

	if (availableSlots.length === 0) {
		setBookingStep(state, "availability");
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">${escapeHtml(dateHeading)}</h3>
			<p class="hbe-booking__copy">No bookable time slots are currently available for this date.</p>
			${noticeMarkup}
		`;
		return;
	}

	const slotsMarkup = availableSlots
		.map((slot) => {
			const isSelected =
				state.selectedSlot !== null && isSameSlot(slot, state.selectedSlot);

			return `
				<button
					type="button"
					class="hbe-booking__slot-item${isSelected ? " is-selected" : ""}"
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

	state.slotsBodyEl.innerHTML = `
		<div class="hbe-booking__slots-header">
			<h3 class="hbe-booking__title">${escapeHtml(shortWeekdayDateFormatter.format(state.selectedDate))}</h3>
			${renderTimeFormatToggle(state)}
		</div>
		<div class="hbe-booking__slot-list">${slotsMarkup}</div>
		<div class="hbe-booking__slot-actions">
			<button
				type="button"
				class="hbe-booking__details-button"
				data-booking-step="details"
				${state.selectedSlot ? "" : "disabled"}
			>
				Continue to Booking Details
			</button>
		</div>
		${noticeMarkup}
	`;

	attachSlotInteractions(state, availableSlots);
}

function renderBookingPanel(
	state: BookingState,
	{
		selectionLabel,
		dateHeading,
		priceLabel,
	}: {
		selectionLabel: string;
		dateHeading: string;
		priceLabel: string;
	},
): string {
	const timeLabel = state.selectedSlot
		? formatSlotRange(state.selectedSlot, state.timeFormat)
		: "Choose a slot";
	const summaryMarkup = state.showReservationSummary
		? `
			<div class="hbe-booking__booking-summary">
				<div class="hbe-booking__booking-kicker">Reservation Summary</div>
				<div class="hbe-booking__booking-row">
					<span>Service</span>
					<strong>${escapeHtml(selectionLabel)}</strong>
				</div>
				<div class="hbe-booking__booking-row">
					<span>Date</span>
					<strong>${escapeHtml(dateHeading)}</strong>
				</div>
				<div class="hbe-booking__booking-row">
					<span>Time</span>
					<strong>${escapeHtml(timeLabel)}</strong>
				</div>
				<div class="hbe-booking__booking-row is-total">
					<span>Total Due</span>
					<strong>${escapeHtml(priceLabel)}</strong>
				</div>
			</div>
		`
		: "";

	return `
		<div class="hbe-booking__booking-card">
			<div class="hbe-booking__booking-scroll">
				${summaryMarkup}
				<div class="hbe-booking__booking-fields">
					<label class="hbe-booking__field hbe-booking__field--half">
						<span>Name</span>
						<input
							type="text"
							value="${escapeAttribute(state.bookingForm.name)}"
							data-booking-field="name"
							placeholder="Your name"
						/>
					</label>
					<label class="hbe-booking__field hbe-booking__field--half">
						<span>Email</span>
						<input
							type="email"
							value="${escapeAttribute(state.bookingForm.email)}"
							data-booking-field="email"
							placeholder="you@example.com"
						/>
					</label>
					<label class="hbe-booking__field hbe-booking__field--half">
						<span>Phone</span>
						<input
							type="tel"
							value="${escapeAttribute(state.bookingForm.phone)}"
							data-booking-field="phone"
							placeholder="Optional"
						/>
					</label>
					<label class="hbe-booking__field hbe-booking__field--full">
						<span>Notes</span>
						<textarea
							rows="4"
							data-booking-field="notes"
							placeholder="Anything we should know?"
						>${escapeHtml(state.bookingForm.notes)}</textarea>
					</label>
				</div>
			</div>
			<div class="hbe-booking__booking-actions">
				<button
					type="button"
					class="hbe-booking__details-button is-secondary"
					data-booking-step="availability"
				>
					Back to Calendar
				</button>
				<button
					type="button"
					class="hbe-booking__confirm-button"
					data-booking-submit="true"
					${state.isSubmittingBooking ? "disabled" : ""}
				>
					${state.isSubmittingBooking ? "Saving booking..." : "Confirm Booking"}
				</button>
			</div>
		</div>
	`;
}

function renderTimeFormatToggle(state: BookingState): string {
	const is12 = state.timeFormat === "12h";
	return `
		<div class="hbe-booking__time-toggle">
			<button type="button" class="hbe-booking__time-toggle-btn${is12 ? " is-active" : ""}" data-time-format="12h">12h</button>
			<button type="button" class="hbe-booking__time-toggle-btn${!is12 ? " is-active" : ""}" data-time-format="24h">24h</button>
		</div>
	`;
}

function attachTimeFormatToggle(state: BookingState) {
	if (!state.slotsBodyEl) {
		return;
	}

	state.slotsBodyEl
		.querySelectorAll<HTMLButtonElement>("[data-time-format]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				const fmt = button.dataset.timeFormat;
				if (fmt === "12h" || fmt === "24h") {
					state.timeFormat = fmt;
					renderSlots(state);
				}
			});
		});
}

function attachSlotInteractions(state: BookingState, slots: BookingSlot[]) {
	if (!state.slotsBodyEl) {
		return;
	}

	state.slotsBodyEl
		.querySelectorAll<HTMLButtonElement>("[data-slot-start][data-slot-end]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				const slot = slots.find(
					(candidate) =>
						candidate.start === button.dataset.slotStart &&
						candidate.end === button.dataset.slotEnd,
				);

				if (!slot) {
					return;
				}

				state.selectedSlot = slot;
				state.bookingNotice = null;
				setBookingStep(state, "availability");
				renderCalendarMeta(state);
				renderSlots(state);
			});
		});

	state.slotsBodyEl
		.querySelector<HTMLButtonElement>('[data-booking-step="details"]')
		?.addEventListener("click", () => {
			if (!state.selectedSlot) {
				return;
			}

			setBookingStep(state, "details");
			renderSlots(state);
		});

	state.slotsBodyEl
		.querySelector<HTMLButtonElement>('[data-booking-step="availability"]')
		?.addEventListener("click", () => {
			setBookingStep(state, "availability");
			renderSlots(state);
		});

	state.slotsBodyEl
		.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-booking-field]")
		.forEach((field) => {
			field.addEventListener("input", () => {
				const key = field.dataset.bookingField;

				if (
					key !== "name" &&
					key !== "email" &&
					key !== "phone" &&
					key !== "notes"
				) {
					return;
				}

				state.bookingForm = {
					...state.bookingForm,
					[key]: field.value,
				};
			});
		});

	state.slotsBodyEl
		.querySelector<HTMLButtonElement>("[data-booking-submit]")
		?.addEventListener("click", () => {
			void submitPublicBooking(state);
		});

	attachTimeFormatToggle(state);
}

async function submitPublicBooking(state: BookingState) {
	if (!state.calendar || !state.selectedDate || !state.selectedSlot) {
		state.bookingNotice = {
			type: "error",
			message: "Select a date and time slot first.",
		};
		renderSlots(state);
		return;
	}

	if (
		state.bookingForm.name.trim() === ""
	) {
		state.bookingNotice = {
			type: "error",
			message: "Enter your name to confirm the booking.",
		};
		renderSlots(state);
		return;
	}

	if (state.bookingForm.email.trim() === "") {
		state.bookingNotice = {
			type: "error",
			message: "Enter your email to confirm the booking.",
		};
		renderSlots(state);
		return;
	}

	state.isSubmittingBooking = true;
	state.bookingNotice = null;
	renderSlots(state);

	try {
		const booking = await createPublicBookingRequest(state, state.selectedSlot);
		state.bookings = [...state.bookings, booking];
		state.selectedSlot = null;
		setBookingStep(state, "availability");
		state.bookingForm = {
			name: "",
			email: "",
			phone: "",
			notes: "",
		};
		state.bookingNotice = {
			type: "success",
			message: "Your booking was created successfully.",
		};
		state.calendarInstance?.redraw();
		renderCalendarMeta(state);
		renderSlots(state);
	} catch (error) {
		state.bookingNotice = {
			type: "error",
			message:
				error instanceof Error ? error.message : "Booking could not be created.",
		};
		renderSlots(state);
	} finally {
		state.isSubmittingBooking = false;
		renderSlots(state);
	}
}

function getRequiredMinutes(state: BookingState): number {
	if (!state.calendar) {
		return 0;
	}

	const selectedServiceMinutes = getActiveServices(state).reduce((total, service) => {
		return total + getServiceMinutes(service);
	}, 0);

	if (selectedServiceMinutes > 0) {
		return selectedServiceMinutes;
	}

	return getDefaultSlotMinutes(state.calendar.settings);
}

function getActiveServices(state: BookingState): Service[] {
	if (!state.calendar || !Array.isArray(state.calendar.settings.services)) {
		return [];
	}

	return state.calendar.settings.services.filter((service) =>
		state.selectedServiceIds.has(service.id),
	);
}

function getPrimaryServiceId(state: BookingState): string {
	return getActiveServices(state)[0]?.id ?? "";
}

function getServiceMinutes(service: Service): number {
	return (
		Number(service.duration ?? 0) +
		Number(service.prepTime ?? 0) +
		Number(service.cleanupTime ?? 0)
	);
}

function getDefaultSlotMinutes(settings: CalendarSettings): number {
	return (
		Number(settings.slotSettings?.sessionDuration ?? 0) +
		Number(settings.slotSettings?.prepTime ?? 0) +
		Number(settings.slotSettings?.cleanupTime ?? 0)
	);
}

function getMaxAdvanceDays(settings: CalendarSettings): number {
	return Math.max(0, Number(settings.slotSettings?.maxAdvanceDays ?? 0));
}

function getBookingsRangeEnd(settings: CalendarSettings, focusDate: Date): Date {
	const today = startOfDay(new Date());
	const maxAdvanceDays = getMaxAdvanceDays(settings);

	if (maxAdvanceDays > 0) {
		return endOfDay(
			new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxAdvanceDays),
		);
	}

	const focusMonthEnd = new Date(
		focusDate.getFullYear(),
		focusDate.getMonth() + 1,
		0,
	);

	return endOfDay(
		new Date(
			focusMonthEnd.getFullYear(),
			focusMonthEnd.getMonth(),
			focusMonthEnd.getDate() + 62,
		),
	);
}

function getCalendarValidRange(settings: CalendarSettings, today: Date): {
	start: Date;
	end?: Date;
} {
	const maxAdvanceDays = getMaxAdvanceDays(settings);

	if (maxAdvanceDays > 0) {
		return {
			start: today,
			end: new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate() + maxAdvanceDays + 1,
			),
		};
	}

	return {
		start: today,
	};
}

function buildCalendarDays(
	state: BookingState,
	visibleMonth: Date,
	validRange: { start: Date; end?: Date },
): Array<{
	date: Date;
	dateKey: string;
	isOutsideMonth: boolean;
	isAvailable: boolean;
	isSelected: boolean;
}> {
	const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
	const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
	const leadingDays = (monthStart.getDay() + 6) % 7;
	const trailingDays = (7 - (((leadingDays + monthEnd.getDate()) % 7) || 7)) % 7;
	const gridStart = new Date(
		monthStart.getFullYear(),
		monthStart.getMonth(),
		monthStart.getDate() - leadingDays,
	);
	const totalDays = leadingDays + monthEnd.getDate() + trailingDays;

	return Array.from({ length: totalDays }, (_, index) => {
		const date = startOfDay(
			new Date(
				gridStart.getFullYear(),
				gridStart.getMonth(),
				gridStart.getDate() + index,
			),
		);

		return {
			date,
			dateKey: toDateKey(date),
			isOutsideMonth: date.getMonth() !== visibleMonth.getMonth(),
			isAvailable:
				isDateInValidRange(date, validRange) && isDateAvailable(state, date),
			isSelected: state.selectedDate ? isSameDay(state.selectedDate, date) : false,
		};
	});
}

function canNavigateToMonth(
	targetMonth: Date,
	validRange: { start: Date; end?: Date },
): boolean {
	const monthStart = startOfDay(
		new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1),
	);
	const monthEnd = endOfDay(
		new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0),
	);

	if (monthEnd < validRange.start) {
		return false;
	}

	if (validRange.end && monthStart >= validRange.end) {
		return false;
	}

	return true;
}

function isDateInValidRange(
	date: Date,
	validRange: { start: Date; end?: Date },
): boolean {
	if (date < validRange.start) {
		return false;
	}

	if (validRange.end && date >= validRange.end) {
		return false;
	}

	return true;
}

function getBookableSlotsForDate(
	settings: CalendarSettings,
	date: Date,
	slotMinutes: number,
	bookings: PublicBooking[],
): BookingSlot[] {
	if (slotMinutes <= 0) {
		return [];
	}

	return getIntervalsForDate(settings, date)
		.flatMap((interval) => splitIntervalIntoSlots(date, interval, slotMinutes))
		.filter((slot) => isSlotAvailable(slot, bookings, settings));
}

function splitIntervalIntoSlots(
	date: Date,
	interval: WorkingInterval,
	slotMinutes: number,
): BookingSlot[] {
	const slots: BookingSlot[] = [];
	const intervalStartMinutes = timeToMinutes(interval.start);
	const intervalEndMinutes = timeToMinutes(interval.end);

	for (
		let currentStartMinutes = intervalStartMinutes;
		currentStartMinutes + slotMinutes <= intervalEndMinutes;
		currentStartMinutes += slotMinutes
	) {
		const startDate = combineDateAndMinutes(date, currentStartMinutes);
		const endDate = combineDateAndMinutes(date, currentStartMinutes + slotMinutes);

		slots.push({
			start: minutesToTime(currentStartMinutes),
			end: minutesToTime(currentStartMinutes + slotMinutes),
			startDate,
			endDate,
		});
	}

	return slots;
}

function isSlotAvailable(
	slot: BookingSlot,
	bookings: PublicBooking[],
	settings: CalendarSettings,
): boolean {
	if (settings.allowDoubleBookings) {
		return true;
	}

	return !bookings.some((booking) => {
		const status = booking.status ?? "confirmed";

		if (status === "cancelled") {
			return false;
		}

		const bookingStart = new Date(booking.start);
		const bookingEnd = new Date(booking.end);

		return slot.startDate < bookingEnd && slot.endDate > bookingStart;
	});
}

function isSameDay(left: Date, right: Date): boolean {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

function isDateAvailable(state: BookingState, date: Date): boolean {
	if (!state.calendar) {
		return false;
	}

	if (state.calendar.settings.adminOnly) {
		return false;
	}

	const currentDate = startOfDay(date);
	const today = startOfDay(new Date());

	if (currentDate < today) {
		return false;
	}

	const maxAdvanceDays = getMaxAdvanceDays(state.calendar.settings);

	if (maxAdvanceDays > 0) {
		const lastAllowedDate = startOfDay(
			new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxAdvanceDays),
		);

		if (currentDate > lastAllowedDate) {
			return false;
		}
	}

	const dateKey = toDateKey(currentDate);

	if (getExceptionForDate(state.calendar.settings, dateKey)) {
		return false;
	}

	const requiredMinutes = getRequiredMinutes(state);

	return (
		getBookableSlotsForDate(
			state.calendar.settings,
			currentDate,
			requiredMinutes,
			state.bookings,
		).length > 0
	);
}

function getExceptionForDate(
	settings: CalendarSettings,
	dateKey: string,
): DateException | undefined {
	const exceptions = Array.isArray(settings.exceptions) ? settings.exceptions : [];

	return exceptions.find((exception) => exception.date === dateKey);
}

function getIntervalsForDate(
	settings: CalendarSettings,
	date: Date,
): WorkingInterval[] {
	const weekdayKey = weekdayKeys[date.getDay()];
	const dayConfig = settings.workingHours?.[weekdayKey];

	if (!dayConfig?.enabled || !Array.isArray(dayConfig.intervals)) {
		return [];
	}

	return dayConfig.intervals.filter((interval) => {
		return Boolean(interval?.start && interval?.end && interval.start < interval.end);
	});
}

function getSelectedPriceLabel(state: BookingState): string {
	const total = getActiveServices(state).reduce((sum, service) => {
		return sum + parsePrice(service.price);
	}, 0);

	if (total > 0) {
		return formatCurrency(total);
	}

	const firstPrice = getActiveServices(state)[0]?.price?.trim();

	if (firstPrice) {
		return firstPrice;
	}

	return "Price on request";
}

function parsePrice(price?: string): number {
	if (!price) {
		return 0;
	}

	const normalized = price.replace(/[^0-9.,-]/g, "").replace(",", ".");
	const parsed = Number.parseFloat(normalized);

	return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(amount);
}

function formatSlotRange(slot: BookingSlot, timeFormat?: "12h" | "24h"): string {
	const fmt = timeFormat === "24h" ? timeFormatter24 : timeFormat === "12h" ? timeFormatter12 : timeFormatter;
	return `${fmt.format(slot.startDate)} - ${fmt.format(slot.endDate)}`;
}

function isSameSlot(left: BookingSlot, right: BookingSlot): boolean {
	return (
		left.startDate.getTime() === right.startDate.getTime() &&
		left.endDate.getTime() === right.endDate.getTime()
	);
}

function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));

	return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
	const hours = `${Math.floor(totalMinutes / 60)}`.padStart(2, "0");
	const minutes = `${totalMinutes % 60}`.padStart(2, "0");

	return `${hours}:${minutes}`;
}

function combineDateAndMinutes(date: Date, totalMinutes: number): Date {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		Math.floor(totalMinutes / 60),
		totalMinutes % 60,
		0,
		0,
	);
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
	const parts = value.split("-").map((part) => Number.parseInt(part, 10));

	if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
		return null;
	}

	const [year, month, day] = parts;

	return startOfDay(new Date(year, month - 1, day));
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
	return escapeHtml(value);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootBookingElements);
} else {
	bootBookingElements();
}
