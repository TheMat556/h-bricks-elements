import dayjs, { type Dayjs } from "dayjs";
import type { BookingFormValues } from "./BookingForm";
import { tr } from "./i18n";
import type { BookingEvent } from "./RightPanel";

export interface BookingApiItem {
	id: number;
	calendarId: number;
	title: string;
	description?: string;
	start: string;
	end: string;
	status: string;
	timezone?: string;
}

export interface BookingPayload {
	title: string;
	description: string;
	start: string;
	end: string;
	timezone: string;
}

export interface SlotInfo {
	start: Date;
	end: Date;
}

export interface FetchRange {
	start: string;
	end: string;
}

const EVENT_COLORS = [
	"#1677ff",
	"#52c41a",
	"#722ed1",
	"#fa8c16",
	"#eb2f96",
	"#13c2c2",
];

interface HBricksWindow {
	hBricksAdmin?: {
		restUrl?: string;
		restNonce?: string;
	};
	__hBricksNewBooking?: () => void;
}

declare global {
	interface Window extends HBricksWindow {}
}

export function getAdminApiConfig() {
	const rootElement = document.getElementById("h-bricks-admin-root");
	const rootDatasetUrl = rootElement?.getAttribute("data-rest-url") ?? "";
	const rootDatasetNonce = rootElement?.getAttribute("data-rest-nonce") ?? "";
	const inferredBase = window.location.pathname.split("/wp-admin/")[0] ?? "";
	const inferredRestUrl = `${window.location.origin}${inferredBase}/wp-json/hbe/v1/`;

	return {
		restUrl: window.hBricksAdmin?.restUrl || rootDatasetUrl || inferredRestUrl,
		restNonce: window.hBricksAdmin?.restNonce || rootDatasetNonce || "",
	};
}

export function getClientTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}

export function buildFormValues(
	start: Date,
	end: Date,
	name = "",
	description = "",
): BookingFormValues {
	return {
		name,
		description,
		date: dayjs(start),
		startTime: dayjs(start),
		endTime: dayjs(end),
	};
}

export function combineDateAndTime(dateValue: Dayjs, timeValue: Dayjs): Date {
	return dateValue
		.hour(timeValue.hour())
		.minute(timeValue.minute())
		.second(0)
		.millisecond(0)
		.toDate();
}

export function getFetchRange(
	selectedDate: Dayjs,
	view: "week" | "day" | "month" | "agenda",
): FetchRange {
	if (view === "day") {
		return {
			start: selectedDate.startOf("day").subtract(1, "day").toISOString(),
			end: selectedDate.endOf("day").add(1, "day").toISOString(),
		};
	}

	if (view === "week") {
		return {
			start: selectedDate.startOf("isoWeek").subtract(7, "day").toISOString(),
			end: selectedDate.endOf("isoWeek").add(7, "day").toISOString(),
		};
	}

	if (view === "month") {
		return {
			start: selectedDate
				.startOf("month")
				.startOf("week")
				.subtract(7, "day")
				.toISOString(),
			end: selectedDate
				.endOf("month")
				.endOf("week")
				.add(7, "day")
				.toISOString(),
		};
	}

	return {
		start: selectedDate.startOf("day").subtract(14, "day").toISOString(),
		end: selectedDate.endOf("day").add(30, "day").toISOString(),
	};
}

export function mergeRanges(
	primaryRange: FetchRange,
	secondaryRange: FetchRange,
): FetchRange {
	const primaryStart = dayjs(primaryRange.start);
	const primaryEnd = dayjs(primaryRange.end);
	const secondaryStart = dayjs(secondaryRange.start);
	const secondaryEnd = dayjs(secondaryRange.end);

	return {
		start: (primaryStart.isBefore(secondaryStart)
			? primaryStart
			: secondaryStart
		).toISOString(),
		end: (primaryEnd.isAfter(secondaryEnd)
			? primaryEnd
			: secondaryEnd
		).toISOString(),
	};
}

export function getOverviewRange(): FetchRange {
	return {
		start: dayjs().startOf("day").toISOString(),
		end: dayjs().add(1, "week").endOf("isoWeek").toISOString(),
	};
}

export function getEventColor(id: string | number): string {
	const stringValue = String(id);
	const hash = Array.from(stringValue).reduce(
		(total, character) => total + character.charCodeAt(0),
		0,
	);

	return EVENT_COLORS[hash % EVENT_COLORS.length];
}

export function toBookingEvent(item: BookingApiItem): BookingEvent {
	return {
		id: String(item.id),
		title: item.title,
		description: item.description ?? "",
		start: new Date(item.start),
		end: new Date(item.end),
		color: getEventColor(item.id),
		status: item.status,
		calendarId: item.calendarId,
		timezone: item.timezone ?? "UTC",
	};
}

export function upsertEvent(
	events: BookingEvent[],
	nextEvent: BookingEvent,
): BookingEvent[] {
	const sorted = [...events].sort(
		(left, right) => left.start.getTime() - right.start.getTime(),
	);
	const filtered = sorted.filter((event) => event.id !== nextEvent.id);
	return [...filtered, nextEvent].sort(
		(left, right) => left.start.getTime() - right.start.getTime(),
	);
}

export function hasBookingConflict(
	events: BookingEvent[],
	start: Date,
	end: Date,
	excludeEventId?: string,
): boolean {
	if (end.getTime() <= start.getTime()) {
		return false;
	}

	return events.some((event) => {
		if (excludeEventId && event.id === excludeEventId) {
			return false;
		}

		if (event.status === "cancelled") {
			return false;
		}

		return start < event.end && end > event.start;
	});
}

export function toBookingPayload(values: BookingFormValues): BookingPayload {
	const start = combineDateAndTime(values.date, values.startTime);
	const end = combineDateAndTime(values.date, values.endTime);

	return {
		title: values.name.trim(),
		description: values.description.trim(),
		start: start.toISOString(),
		end: end.toISOString(),
		timezone: getClientTimezone(),
	};
}

export async function fetchBookingsRequest(
	calendarId: number,
	range: FetchRange,
): Promise<BookingApiItem[]> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const query = new URLSearchParams({
		start: range.start,
		end: range.end,
	});
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings?${query.toString()}`,
		{
			method: "GET",
			headers: {
				"X-WP-Nonce": restNonce,
			},
		},
	);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: tr("Bookings could not be loaded."),
		);
	}

	return Array.isArray(data?.items) ? (data.items as BookingApiItem[]) : [];
}

export async function createBookingRequest(
	calendarId: number,
	payload: BookingPayload,
): Promise<BookingApiItem> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-WP-Nonce": restNonce,
			},
			body: JSON.stringify(payload),
		},
	);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: tr("Booking could not be created."),
		);
	}

	return data.item as BookingApiItem;
}

export async function updateBookingRequest(
	calendarId: number,
	bookingId: number,
	payload: BookingPayload,
): Promise<BookingApiItem> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings/${bookingId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-WP-Nonce": restNonce,
			},
			body: JSON.stringify(payload),
		},
	);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: tr("Booking could not be updated."),
		);
	}

	return data.item as BookingApiItem;
}

export async function deleteBookingRequest(
	calendarId: number,
	bookingId: number,
): Promise<void> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings/${bookingId}`,
		{
			method: "DELETE",
			headers: {
				"X-WP-Nonce": restNonce,
			},
		},
	);

	if (response.ok) {
		return;
	}

	const data = await response.json();
	throw new Error(
		typeof data?.message === "string"
			? data.message
			: tr("Booking could not be deleted."),
	);
}
