import flatpickr from "flatpickr";

import "./booking.css";
import "flatpickr/dist/flatpickr.min.css";

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
	isBuilderPreview: boolean;
	restBase: string;
	calendarId: number;
	calendar: PublicCalendar | null;
	selectedDate: Date | null;
	selectedServiceIds: Set<string>;
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
		isBuilderPreview: root.dataset.builderPreview === "true",
		restBase: (root.dataset.restBase ?? "").replace(/\/$/, ""),
		calendarId: Number.parseInt(root.dataset.calendarId ?? "0", 10) || 0,
		calendar: null,
		selectedDate: null,
		selectedServiceIds: new Set<string>(),
		calendarInstance: null,
	};

	if (!state.calendarMountEl || !state.statusEl) {
		return;
	}

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

function renderLoadingState(state: BookingState) {
	if (state.statusEl) {
		state.statusEl.textContent = "Loading calendar...";
	}

	if (state.firstColumnMode === "service" && state.firstBodyEl) {
		state.firstBodyEl.innerHTML =
			'<p class="hbe-booking__copy">Loading services...</p>';
	}

	if (state.slotsBodyEl) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Select a date</h3>
			<p class="hbe-booking__copy">Availability will appear after the calendar has loaded.</p>
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
		state.statusEl.textContent = message;
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

function renderCalendarMeta(state: BookingState) {
	const calendar = state.calendar;

	if (!calendar || !state.calendarMetaEl || !state.statusEl) {
		return;
	}

	const icon = calendar.settings.icon?.trim() ?? "";
	const availabilitySummary = getAvailabilitySummary(state);

	state.calendarMetaEl.innerHTML = `
		<div class="hbe-booking__meta-row">
			<h3 class="hbe-booking__title">${escapeHtml(calendar.title)}</h3>
			${icon ? `<span class="hbe-booking__icon">${escapeHtml(icon)}</span>` : ""}
		</div>
		<p class="hbe-booking__copy">${escapeHtml(availabilitySummary)}</p>
	`;

	if (calendar.settings.adminOnly) {
		state.statusEl.textContent =
			"This calendar is currently configured for admin-only bookings.";
		return;
	}

	state.statusEl.textContent =
		"Month view is fixed. Enabled days are derived from working hours and blocked dates.";
}

function getAvailabilitySummary(state: BookingState): string {
	const calendar = state.calendar;

	if (!calendar) {
		return "";
	}

	if (calendar.settings.adminOnly) {
		return "Online booking is disabled for this calendar.";
	}

	const availableServices = Array.isArray(calendar.settings.services)
		? calendar.settings.services.length
		: 0;

	if (state.firstColumnMode === "service") {
		return availableServices > 0
			? `${availableServices} service${availableServices === 1 ? "" : "s"} available.`
			: "No services configured yet.";
	}

	const defaultSlotMinutes = getDefaultSlotMinutes(calendar.settings);

	return defaultSlotMinutes > 0
		? `Default slot footprint: ${defaultSlotMinutes} min.`
		: "Select a date to inspect the currently available day structure.";
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
		<div class="hbe-booking__info-stack">
			${
				icon
					? `<span class="hbe-booking__info-icon">${escapeHtml(icon)}</span>`
					: ""
			}
			<h3 class="hbe-booking__title">${escapeHtml(title)}</h3>
			<p class="hbe-booking__copy">${escapeHtml(text)}</p>
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
			<h3 class="hbe-booking__title">${escapeHtml(heading)}</h3>
			<p class="hbe-booking__copy">Add services in the admin settings to populate this column.</p>
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
				</button>
			`;
		})
		.join("");

	state.firstBodyEl.innerHTML = `
		<h3 class="hbe-booking__title">${escapeHtml(heading)}</h3>
		<p class="hbe-booking__copy">${description}</p>
		<div class="hbe-booking__service-buttons">${buttonsMarkup}</div>
	`;

	state.firstBodyEl
		.querySelectorAll<HTMLButtonElement>("[data-service-id]")
		.forEach((button) => {
			button.addEventListener("click", () => {
				toggleServiceSelection(state, button.dataset.serviceId ?? "");
			});
		});
}

function toggleServiceSelection(state: BookingState, serviceId: string) {
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

	renderServicesColumn(state);

	if (state.calendarInstance) {
		state.calendarInstance.redraw();
	}

	if (state.selectedDate && !isDateAvailable(state, state.selectedDate)) {
		state.selectedDate = null;
		state.calendarInstance?.clear();
	}

	renderCalendarMeta(state);
	renderSlots(state);
}

function mountCalendar(state: BookingState) {
	if (!state.calendarMountEl || !state.calendar) {
		return;
	}

	state.calendarInstance?.destroy();
	state.calendarMountEl.innerHTML = "";

	const today = startOfDay(new Date());

	const calendarInstance = flatpickr(state.calendarMountEl, {
		inline: true,
		minDate: today,
		dateFormat: "Y-m-d",
		monthSelectorType: "static",
		disableMobile: true,
		locale: {
			firstDayOfWeek: 1,
		},
		disable: [
			(date: Date) => {
				return !isDateAvailable(state, date);
			},
		],
		onChange: (selectedDates: Date[]) => {
			state.selectedDate = selectedDates[0] ?? null;
			renderSlots(state);
		},
		onDayCreate: (_dateObj, _dateStr, _instance, dayElement) => {
			if (!(dayElement instanceof HTMLElement)) {
				return;
			}

			const dayDate = (dayElement as HTMLElement & { dateObj?: Date }).dateObj;

			if (!dayDate) {
				return;
			}

			if (isDateAvailable(state, dayDate)) {
				dayElement.classList.add("hbe-booking__day--available");
			}
		},
	});

	state.calendarInstance = {
		clear: () => calendarInstance.clear(),
		redraw: () => calendarInstance.redraw(),
		destroy: () => calendarInstance.destroy(),
	};
}

function renderSlots(state: BookingState) {
	if (!state.slotsBodyEl || !state.calendar) {
		return;
	}

	if (state.calendar.settings.adminOnly) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Admin only</h3>
			<p class="hbe-booking__copy">This calendar is intentionally blocked for public booking right now.</p>
		`;
		return;
	}

	if (!state.selectedDate) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">Select a date</h3>
			<p class="hbe-booking__copy">Available time slots for the selected day will appear here.</p>
		`;
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
	const matchingSlots = getBookableSlotsForDate(
		state.calendar.settings,
		state.selectedDate,
		requiredMinutes,
	);

	const activeServices = getActiveServices(state);
	const defaultSlotMinutes = getDefaultSlotMinutes(state.calendar.settings);
	const serviceSummary =
		activeServices.length > 0
			? activeServices.map((service) => service.name).join(", ")
			: state.firstColumnMode === "service"
				? defaultSlotMinutes > 0
					? `Using default slot timing (${defaultSlotMinutes} min total).`
					: "No service selected."
				: defaultSlotMinutes > 0
					? `Default slot timing: ${defaultSlotMinutes} min total.`
					: "Service selection is not active for this layout.";

	if (matchingSlots.length === 0) {
		state.slotsBodyEl.innerHTML = `
			<h3 class="hbe-booking__title">${escapeHtml(longDateFormatter.format(state.selectedDate))}</h3>
			<p class="hbe-booking__copy">${
				requiredMinutes > 0
					? "No bookable time slots fit the selected service duration on this date."
					: "No bookable time slots are configured for this date."
			}</p>
			<div class="hbe-booking__slot-summary">${escapeHtml(serviceSummary)}</div>
		`;
		return;
	}

	const intervalMarkup = matchingSlots
		.map((slot) => {
			return `
				<li class="hbe-booking__slot-item">
					<span class="hbe-booking__slot-time">${escapeHtml(slot.start)} - ${escapeHtml(slot.end)}</span>
					<span class="hbe-booking__slot-date">${escapeHtml(shortDateFormatter.format(state.selectedDate as Date))}</span>
				</li>
			`;
		})
		.join("");

	state.slotsBodyEl.innerHTML = `
		<h3 class="hbe-booking__title">${escapeHtml(longDateFormatter.format(state.selectedDate))}</h3>
		<p class="hbe-booking__copy">Calculated time slots currently available for this day.</p>
		<div class="hbe-booking__slot-summary">${escapeHtml(serviceSummary)}</div>
		<ul class="hbe-booking__slot-list">${intervalMarkup}</ul>
	`;
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

function getBookableSlotsForDate(
	settings: CalendarSettings,
	date: Date,
	slotMinutes: number,
): WorkingInterval[] {
	if (slotMinutes <= 0) {
		return [];
	}

	return getIntervalsForDate(settings, date).flatMap((interval) =>
		splitIntervalIntoSlots(interval, slotMinutes),
	);
}

function splitIntervalIntoSlots(
	interval: WorkingInterval,
	slotMinutes: number,
): WorkingInterval[] {
	const slots: WorkingInterval[] = [];
	const intervalStartMinutes = timeToMinutes(interval.start);
	const intervalEndMinutes = timeToMinutes(interval.end);

	for (
		let currentStartMinutes = intervalStartMinutes;
		currentStartMinutes + slotMinutes <= intervalEndMinutes;
		currentStartMinutes += slotMinutes
	) {
		slots.push({
			start: minutesToTime(currentStartMinutes),
			end: minutesToTime(currentStartMinutes + slotMinutes),
		});
	}

	return slots;
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

	return getBookableSlotsForDate(
		state.calendar.settings,
		currentDate,
		requiredMinutes,
	).length > 0;
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

function intervalDuration(interval: WorkingInterval): number {
	return Math.max(0, timeToMinutes(interval.end) - timeToMinutes(interval.start));
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

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");

	return `${year}-${month}-${day}`;
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
