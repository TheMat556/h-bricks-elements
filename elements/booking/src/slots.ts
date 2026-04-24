import type {
	BookingSlot,
	BookingState,
	CalendarSettings,
	DateException,
	FirstColumnMode,
	PublicBooking,
	Service,
	WorkingInterval,
} from "./types";
import { weekdayKeys } from "./types";

export function getInitialServiceSelection(
	settings: CalendarSettings,
	firstColumnMode: FirstColumnMode,
): Set<string> {
	if (firstColumnMode !== "service") {
		return new Set<string>();
	}

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

export function getSelectedServiceLabel(state: BookingState): string | null {
	const selectedServices = getActiveServices(state);

	return selectedServices.length > 0
		? selectedServices
				.map((service) => getServiceDisplayLabel(service))
				.join(", ")
		: null;
}

export function getServiceDisplayLabel(service: Service): string {
	return service.publicLabel?.trim() || service.name.trim();
}

export function getRequiredMinutes(state: BookingState): number {
	if (!state.calendar) {
		return 0;
	}

	const selectedServiceMinutes = getActiveServices(state).reduce(
		(total, service) => {
			return total + getServiceMinutes(service);
		},
		0,
	);

	if (selectedServiceMinutes > 0) {
		return selectedServiceMinutes;
	}

	return getDefaultSlotMinutes(state.calendar.settings);
}

export function getActiveServices(state: BookingState): Service[] {
	if (
		state.firstColumnMode !== "service" ||
		!state.calendar ||
		!Array.isArray(state.calendar.settings.services)
	) {
		return [];
	}

	return state.calendar.settings.services.filter((service) =>
		state.selectedServiceIds.has(service.id),
	);
}

export function getPrimaryServiceId(state: BookingState): string {
	return getActiveServices(state)[0]?.id ?? "";
}

export function getServiceMinutes(service: Service): number {
	return (
		Number(service.duration ?? 0) +
		Number(service.prepTime ?? 0) +
		Number(service.cleanupTime ?? 0)
	);
}

export function getDefaultSlotMinutes(settings: CalendarSettings): number {
	return (
		Number(settings.slotSettings?.sessionDuration ?? 0) +
		Number(settings.slotSettings?.prepTime ?? 0) +
		Number(settings.slotSettings?.cleanupTime ?? 0)
	);
}

export function getMaxAdvanceDays(settings: CalendarSettings): number {
	return Math.max(0, Number(settings.slotSettings?.maxAdvanceDays ?? 0));
}

export function getBookingsRangeEnd(
	settings: CalendarSettings,
	focusDate: Date,
): Date {
	const today = startOfDay(new Date());
	const maxAdvanceDays = getMaxAdvanceDays(settings);

	if (maxAdvanceDays > 0) {
		return endOfDay(
			new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate() + maxAdvanceDays,
			),
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

export function getCalendarValidRange(
	settings: CalendarSettings,
	today: Date,
): {
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

export function buildCalendarDays(
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
	const monthStart = new Date(
		visibleMonth.getFullYear(),
		visibleMonth.getMonth(),
		1,
	);
	const monthEnd = new Date(
		visibleMonth.getFullYear(),
		visibleMonth.getMonth() + 1,
		0,
	);
	const leadingDays = (monthStart.getDay() + 6) % 7;
	const trailingDays = (7 - ((leadingDays + monthEnd.getDate()) % 7 || 7)) % 7;
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
			isSelected: state.selectedDate
				? isSameDay(state.selectedDate, date)
				: false,
		};
	});
}

export function canNavigateToMonth(
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

export function isDateInValidRange(
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

export function getBookableSlotsForDate(
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

export function splitIntervalIntoSlots(
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
		const endDate = combineDateAndMinutes(
			date,
			currentStartMinutes + slotMinutes,
		);

		slots.push({
			start: minutesToTime(currentStartMinutes),
			end: minutesToTime(currentStartMinutes + slotMinutes),
			startDate,
			endDate,
		});
	}

	return slots;
}

export function isSlotAvailable(
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

export function isSameDay(left: Date, right: Date): boolean {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

export function isDateAvailable(state: BookingState, date: Date): boolean {
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
			new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate() + maxAdvanceDays,
			),
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

export function getExceptionForDate(
	settings: CalendarSettings,
	dateKey: string,
): DateException | undefined {
	const exceptions = Array.isArray(settings.exceptions)
		? settings.exceptions
		: [];

	return exceptions.find((exception) => exception.date === dateKey);
}

export function getIntervalsForDate(
	settings: CalendarSettings,
	date: Date,
): WorkingInterval[] {
	const weekdayKey = weekdayKeys[date.getDay()];
	const dayConfig = settings.workingHours?.[weekdayKey];

	if (!dayConfig?.enabled || !Array.isArray(dayConfig.intervals)) {
		return [];
	}

	return dayConfig.intervals.filter((interval) => {
		return Boolean(
			interval?.start && interval?.end && interval.start < interval.end,
		);
	});
}

export function getSelectedPriceLabel(state: BookingState): string {
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

export function parsePrice(price?: string): number {
	if (!price) {
		return 0;
	}

	const normalized = price.replace(/[^0-9.,-]/g, "").replace(",", ".");
	const parsed = Number.parseFloat(normalized);

	return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(amount);
}

export function formatSlotRange(
	slot: BookingSlot,
	timeFormat?: "12h" | "24h",
): string {
	return formatTimeRange(slot.startDate, slot.endDate, timeFormat);
}

export function isSameSlot(left: BookingSlot, right: BookingSlot): boolean {
	return (
		left.startDate.getTime() === right.startDate.getTime() &&
		left.endDate.getTime() === right.endDate.getTime()
	);
}

export function timeToMinutes(time: string): number {
	const [hours, minutes] = time
		.split(":")
		.map((part) => Number.parseInt(part, 10));

	return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
	const hours = `${Math.floor(totalMinutes / 60)}`.padStart(2, "0");
	const minutes = `${totalMinutes % 60}`.padStart(2, "0");

	return `${hours}:${minutes}`;
}

export function combineDateAndMinutes(date: Date, totalMinutes: number): Date {
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

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		23,
		59,
		59,
		999,
	);
}

export function toDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date | null {
	const parts = value.split("-").map((part) => Number.parseInt(part, 10));

	if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
		return null;
	}

	const [year, month, day] = parts;

	return startOfDay(new Date(year, month - 1, day));
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function escapeAttribute(value: string): string {
	return escapeHtml(value);
}

export function getTimeZoneLabel(date: Date, timeZone?: string): string {
	try {
		const formatter = new Intl.DateTimeFormat(undefined, {
			timeZone,
			timeZoneName: "long",
		});
		const zoneName = formatter
			.formatToParts(date)
			.find((part) => part.type === "timeZoneName")?.value;

		return (
			zoneName ?? timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
		);
	} catch {
		return timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
	}
}

export function formatMeetingSchedule(
	startDate: Date,
	endDate: Date,
	timeZone?: string,
	timeFormat?: "12h" | "24h",
): string {
	return `${formatLongDate(startDate, timeZone)} ${formatTimeRange(startDate, endDate, timeFormat, timeZone)} (${getTimeZoneLabel(startDate, timeZone)})`;
}

export function getMeetingDurationMinutes(
	startDate: Date,
	endDate: Date,
): number {
	return Math.max(
		1,
		Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
	);
}

export function buildCompletedBookingWhatLabel(
	serviceLabel: string | null,
	startDate: Date,
	endDate: Date,
	defaultMeetingLabel: string,
): string {
	return (
		serviceLabel?.trim() ||
		defaultMeetingLabel.trim() ||
		`${getMeetingDurationMinutes(startDate, endDate)} minute meeting`
	);
}

export function formatTimeRange(
	startDate: Date,
	endDate: Date,
	timeFormat?: "12h" | "24h",
	timeZone?: string,
): string {
	const formatter =
		timeFormat === "24h"
			? new Intl.DateTimeFormat(undefined, {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
					timeZone,
				})
			: timeFormat === "12h"
				? new Intl.DateTimeFormat(undefined, {
						hour: "numeric",
						minute: "2-digit",
						hour12: true,
						timeZone,
					})
				: new Intl.DateTimeFormat(undefined, {
						hour: "2-digit",
						minute: "2-digit",
						timeZone,
					});

	return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

export function formatLongDate(date: Date, timeZone?: string): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone,
	}).format(date);
}
