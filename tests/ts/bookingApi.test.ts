import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingFormValues } from "../../elements/booking/settings/src/BookingForm";
import {
	buildFormValues,
	combineDateAndTime,
	createBookingRequest,
	deleteBookingRequest,
	fetchBookingsRequest,
	getAdminApiConfig,
	getClientTimezone,
	getEventColor,
	getFetchRange,
	getOverviewRange,
	hasBookingConflict,
	mergeRanges,
	toBookingEvent,
	toBookingPayload,
	updateBookingRequest,
	upsertEvent,
} from "../../elements/booking/settings/src/bookingApi";
import type { BookingEvent } from "../../elements/booking/settings/src/RightPanel";

function createMockResponse(options: {
	ok: boolean;
	status?: number;
	statusText?: string;
	json?: () => Promise<unknown>;
	text?: () => Promise<string>;
}): Response {
	return {
		ok: options.ok,
		status: options.status ?? (options.ok ? 200 : 400),
		statusText: options.statusText ?? (options.ok ? "OK" : "Bad Request"),
		json: options.json ?? (() => Promise.resolve({})),
		text: options.text ?? (() => Promise.resolve("")),
		headers: new Headers(),
		redirected: false,
		url: "",
		type: "basic",
		body: null,
		bodyUsed: false,
		clone: function () {
			return this;
		},
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
		blob: () => Promise.resolve(new Blob()),
		formData: () => Promise.resolve(new FormData()),
	} as unknown as Response;
}

describe("getAdminApiConfig", () => {
	let originalLocation: Location;
	let originalHBricksAdmin: unknown;

	beforeEach(() => {
		originalLocation = window.location;
		originalHBricksAdmin = window.hBricksAdmin;
		// @ts-expect-error overriding readonly property for tests
		delete window.location;
		// @ts-expect-error replacing location
		window.location = {
			...originalLocation,
			pathname: "/wp-admin/admin.php",
			origin: "https://example.com",
		};
		window.hBricksAdmin = undefined;
		document.body.innerHTML = "";
	});

	afterEach(() => {
		// @ts-expect-error restoring readonly property
		window.location = originalLocation;
		window.hBricksAdmin = originalHBricksAdmin as
			| { restUrl?: string; restNonce?: string }
			| undefined;
		document.body.innerHTML = "";
	});

	it("returns window.hBricksAdmin values when available", () => {
		window.hBricksAdmin = {
			restUrl: "https://custom.com/wp-json/hbe/v1/",
			restNonce: "custom-nonce",
		};
		const config = getAdminApiConfig();
		expect(config.restUrl).toBe("https://custom.com/wp-json/hbe/v1/");
		expect(config.restNonce).toBe("custom-nonce");
	});

	it("falls back to DOM element dataset when window.hBricksAdmin is absent", () => {
		const root = document.createElement("div");
		root.id = "h-bricks-admin-root";
		root.setAttribute("data-rest-url", "https://dom.com/wp-json/hbe/v1/");
		root.setAttribute("data-rest-nonce", "dom-nonce");
		document.body.appendChild(root);

		const config = getAdminApiConfig();
		expect(config.restUrl).toBe("https://dom.com/wp-json/hbe/v1/");
		expect(config.restNonce).toBe("dom-nonce");
	});

	it("infers REST URL from window.location as last resort", () => {
		const config = getAdminApiConfig();
		expect(config.restUrl).toBe("https://example.com/wp-json/hbe/v1/");
		expect(config.restNonce).toBe("");
	});

	it("prefers window.hBricksAdmin over DOM over inferred", () => {
		const root = document.createElement("div");
		root.id = "h-bricks-admin-root";
		root.setAttribute("data-rest-url", "https://dom.com/wp-json/hbe/v1/");
		root.setAttribute("data-rest-nonce", "dom-nonce");
		document.body.appendChild(root);

		window.hBricksAdmin = {
			restUrl: "https://win.com/wp-json/hbe/v1/",
			restNonce: "win-nonce",
		};

		const config = getAdminApiConfig();
		expect(config.restUrl).toBe("https://win.com/wp-json/hbe/v1/");
		expect(config.restNonce).toBe("win-nonce");
	});
});

describe("getClientTimezone", () => {
	it("returns a non-empty string", () => {
		const tz = getClientTimezone();
		expect(typeof tz).toBe("string");
		expect(tz.length).toBeGreaterThan(0);
	});
});

describe("buildFormValues", () => {
	it("builds form values with defaults", () => {
		const start = new Date("2026-04-24T09:00:00Z");
		const end = new Date("2026-04-24T10:00:00Z");
		const values = buildFormValues(start, end);
		expect(values.name).toBe("");
		expect(values.description).toBe("");
		expect(values.date.isSame(dayjs(start), "day")).toBe(true);
		expect(values.startTime.isSame(dayjs(start), "minute")).toBe(true);
		expect(values.endTime.isSame(dayjs(end), "minute")).toBe(true);
	});

	it("builds form values with provided name and description", () => {
		const start = new Date("2026-04-24T09:00:00Z");
		const end = new Date("2026-04-24T10:00:00Z");
		const values = buildFormValues(start, end, "Alice", "Team meeting");
		expect(values.name).toBe("Alice");
		expect(values.description).toBe("Team meeting");
	});
});

describe("combineDateAndTime", () => {
	it("combines date and time correctly", () => {
		const dateValue = dayjs("2026-04-24");
		const timeValue = dayjs("2026-01-01T14:30:00");
		const result = combineDateAndTime(dateValue, timeValue);
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(3); // April is 3
		expect(result.getDate()).toBe(24);
		expect(result.getHours()).toBe(14);
		expect(result.getMinutes()).toBe(30);
		expect(result.getSeconds()).toBe(0);
		expect(result.getMilliseconds()).toBe(0);
	});
});

describe("getFetchRange", () => {
	it("returns correct range for day view", () => {
		const selected = dayjs("2026-04-24T12:00:00Z");
		const range = getFetchRange(selected, "day");
		expect(range.start).toBe(
			selected.startOf("day").subtract(1, "day").toISOString(),
		);
		expect(range.end).toBe(selected.endOf("day").add(1, "day").toISOString());
	});

	it("returns correct range for week view", () => {
		const selected = dayjs("2026-04-24T12:00:00Z");
		const range = getFetchRange(selected, "week");
		expect(range.start).toBe(
			selected.startOf("isoWeek").subtract(7, "day").toISOString(),
		);
		expect(range.end).toBe(
			selected.endOf("isoWeek").add(7, "day").toISOString(),
		);
	});

	it("returns correct range for month view", () => {
		const selected = dayjs("2026-04-24T12:00:00Z");
		const range = getFetchRange(selected, "month");
		expect(range.start).toBe(
			selected
				.startOf("month")
				.startOf("week")
				.subtract(7, "day")
				.toISOString(),
		);
		expect(range.end).toBe(
			selected.endOf("month").endOf("week").add(7, "day").toISOString(),
		);
	});

	it("returns correct range for agenda view", () => {
		const selected = dayjs("2026-04-24T12:00:00Z");
		const range = getFetchRange(selected, "agenda");
		expect(range.start).toBe(
			selected.startOf("day").subtract(14, "day").toISOString(),
		);
		expect(range.end).toBe(selected.endOf("day").add(30, "day").toISOString());
	});
});

describe("mergeRanges", () => {
	it("widens range to encompass both ranges", () => {
		const primary = {
			start: "2026-04-20T00:00:00.000Z",
			end: "2026-04-25T00:00:00.000Z",
		};
		const secondary = {
			start: "2026-04-22T00:00:00.000Z",
			end: "2026-04-28T00:00:00.000Z",
		};
		const merged = mergeRanges(primary, secondary);
		expect(merged.start).toBe(primary.start);
		expect(merged.end).toBe(secondary.end);
	});

	it("uses primary when it fully contains secondary", () => {
		const primary = {
			start: "2026-04-15T00:00:00.000Z",
			end: "2026-04-30T00:00:00.000Z",
		};
		const secondary = {
			start: "2026-04-20T00:00:00.000Z",
			end: "2026-04-25T00:00:00.000Z",
		};
		const merged = mergeRanges(primary, secondary);
		expect(merged.start).toBe(primary.start);
		expect(merged.end).toBe(primary.end);
	});

	it("uses secondary when it fully contains primary", () => {
		const primary = {
			start: "2026-04-20T00:00:00.000Z",
			end: "2026-04-25T00:00:00.000Z",
		};
		const secondary = {
			start: "2026-04-15T00:00:00.000Z",
			end: "2026-04-30T00:00:00.000Z",
		};
		const merged = mergeRanges(primary, secondary);
		expect(merged.start).toBe(secondary.start);
		expect(merged.end).toBe(secondary.end);
	});
});

describe("getOverviewRange", () => {
	it("returns a range from start of today to end of next iso week", () => {
		const frozen = new Date("2026-04-24T12:00:00.000Z");
		vi.useFakeTimers({ now: frozen });
		const range = getOverviewRange();
		const now = dayjs(frozen);
		expect(range.start).toBe(now.startOf("day").toISOString());
		expect(range.end).toBe(now.add(1, "week").endOf("isoWeek").toISOString());
		vi.useRealTimers();
	});
});

describe("getEventColor", () => {
	it("returns deterministic colors for IDs", () => {
		const color1 = getEventColor(1);
		const color2 = getEventColor(2);
		const color1Again = getEventColor(1);
		expect(color1).toBe(color1Again);
		expect(typeof color1).toBe("string");
		expect(color1.startsWith("#")).toBe(true);
		expect(color1).not.toBe(color2);
	});

	it("accepts string IDs", () => {
		const color = getEventColor("booking-42");
		expect(typeof color).toBe("string");
		expect(color.startsWith("#")).toBe(true);
	});
});

describe("toBookingEvent", () => {
	it("converts BookingApiItem to BookingEvent", () => {
		const item = {
			id: 42,
			calendarId: 7,
			title: "Meeting",
			description: "Team sync",
			start: "2026-04-24T09:00:00.000Z",
			end: "2026-04-24T10:00:00.000Z",
			status: "confirmed",
			timezone: "Europe/Berlin",
		};
		const event = toBookingEvent(item);
		expect(event.id).toBe("42");
		expect(event.title).toBe("Meeting");
		expect(event.description).toBe("Team sync");
		expect(event.start).toEqual(new Date(item.start));
		expect(event.end).toEqual(new Date(item.end));
		expect(event.status).toBe("confirmed");
		expect(event.calendarId).toBe(7);
		expect(event.timezone).toBe("Europe/Berlin");
		expect(event.color).toBeDefined();
	});

	it("handles missing description and timezone", () => {
		const item = {
			id: 1,
			calendarId: 1,
			title: "Call",
			start: "2026-04-24T09:00:00.000Z",
			end: "2026-04-24T10:00:00.000Z",
			status: "pending",
		};
		const event = toBookingEvent(item);
		expect(event.description).toBe("");
		expect(event.timezone).toBe("UTC");
	});
});

describe("upsertEvent", () => {
	it("inserts a new event and sorts by start time", () => {
		const events: BookingEvent[] = [
			{
				id: "1",
				title: "A",
				start: new Date("2026-04-24T10:00:00Z"),
				end: new Date("2026-04-24T11:00:00Z"),
			},
			{
				id: "2",
				title: "B",
				start: new Date("2026-04-24T14:00:00Z"),
				end: new Date("2026-04-24T15:00:00Z"),
			},
		];
		const newEvent: BookingEvent = {
			id: "3",
			title: "C",
			start: new Date("2026-04-24T09:00:00Z"),
			end: new Date("2026-04-24T10:00:00Z"),
		};
		const result = upsertEvent(events, newEvent);
		expect(result.map((e) => e.id)).toEqual(["3", "1", "2"]);
	});

	it("updates an existing event by id and re-sorts", () => {
		const events: BookingEvent[] = [
			{
				id: "1",
				title: "A",
				start: new Date("2026-04-24T10:00:00Z"),
				end: new Date("2026-04-24T11:00:00Z"),
			},
			{
				id: "2",
				title: "B",
				start: new Date("2026-04-24T14:00:00Z"),
				end: new Date("2026-04-24T15:00:00Z"),
			},
		];
		const updatedEvent: BookingEvent = {
			id: "1",
			title: "A-Moved",
			start: new Date("2026-04-24T16:00:00Z"),
			end: new Date("2026-04-24T17:00:00Z"),
		};
		const result = upsertEvent(events, updatedEvent);
		expect(result.map((e) => e.id)).toEqual(["2", "1"]);
		expect(result.find((e) => e.id === "1")?.title).toBe("A-Moved");
	});

	it("does not mutate original array", () => {
		const events: BookingEvent[] = [
			{
				id: "1",
				title: "A",
				start: new Date("2026-04-24T10:00:00Z"),
				end: new Date("2026-04-24T11:00:00Z"),
			},
		];
		const newEvent: BookingEvent = {
			id: "2",
			title: "B",
			start: new Date("2026-04-24T12:00:00Z"),
			end: new Date("2026-04-24T13:00:00Z"),
		};
		const originalIds = events.map((e) => e.id);
		upsertEvent(events, newEvent);
		expect(events.map((e) => e.id)).toEqual(originalIds);
	});
});

describe("hasBookingConflict", () => {
	const baseEvent = (overrides: Partial<BookingEvent> = {}): BookingEvent => ({
		id: "1",
		title: "Event",
		start: new Date("2026-04-24T10:00:00Z"),
		end: new Date("2026-04-24T11:00:00Z"),
		status: "confirmed",
		...overrides,
	});

	it("returns false for empty events array", () => {
		const result = hasBookingConflict(
			[],
			new Date("2026-04-24T10:00:00Z"),
			new Date("2026-04-24T11:00:00Z"),
		);
		expect(result).toBe(false);
	});

	it("detects overlapping event", () => {
		const events = [baseEvent()];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T10:30:00Z"),
			new Date("2026-04-24T11:30:00Z"),
		);
		expect(result).toBe(true);
	});

	it("does not flag exact boundary as conflict (end equals start)", () => {
		const events = [baseEvent()];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T09:00:00Z"),
			new Date("2026-04-24T10:00:00Z"),
		);
		expect(result).toBe(false);
	});

	it("does not flag exact boundary as conflict (start equals end)", () => {
		const events = [baseEvent()];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T11:00:00Z"),
			new Date("2026-04-24T12:00:00Z"),
		);
		expect(result).toBe(false);
	});

	it("excludes event by matching excludeId", () => {
		const events = [baseEvent({ id: "exclude-me" })];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T10:30:00Z"),
			new Date("2026-04-24T11:30:00Z"),
			"exclude-me",
		);
		expect(result).toBe(false);
	});

	it("does not exclude events with different ids", () => {
		const events = [baseEvent({ id: "other" })];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T10:30:00Z"),
			new Date("2026-04-24T11:30:00Z"),
			"exclude-me",
		);
		expect(result).toBe(true);
	});

	it("ignores cancelled events", () => {
		const events = [baseEvent({ status: "cancelled" })];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T10:30:00Z"),
			new Date("2026-04-24T11:30:00Z"),
		);
		expect(result).toBe(false);
	});

	it("returns false when end <= start", () => {
		const events = [baseEvent()];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T12:00:00Z"),
			new Date("2026-04-24T11:00:00Z"),
		);
		expect(result).toBe(false);
	});

	it("detects full containment", () => {
		const events = [baseEvent()];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T09:00:00Z"),
			new Date("2026-04-24T12:00:00Z"),
		);
		expect(result).toBe(true);
	});

	it("detects being fully contained", () => {
		const events = [baseEvent()];
		const result = hasBookingConflict(
			events,
			new Date("2026-04-24T10:15:00Z"),
			new Date("2026-04-24T10:45:00Z"),
		);
		expect(result).toBe(true);
	});
});

describe("toBookingPayload", () => {
	it("converts form values to REST payload", () => {
		const values: BookingFormValues = {
			name: "  Alice  ",
			description: "  Team meeting  ",
			date: dayjs("2026-04-24"),
			startTime: dayjs("2026-01-01T09:00:00"),
			endTime: dayjs("2026-01-01T10:30:00"),
		};
		const payload = toBookingPayload(values);
		expect(payload.title).toBe("Alice");
		expect(payload.description).toBe("Team meeting");
		// Compute expected ISO strings using same dayjs logic as source
		const expectedStart = dayjs("2026-04-24")
			.hour(9)
			.minute(0)
			.second(0)
			.millisecond(0)
			.toISOString();
		const expectedEnd = dayjs("2026-04-24")
			.hour(10)
			.minute(30)
			.second(0)
			.millisecond(0)
			.toISOString();
		expect(payload.start).toBe(expectedStart);
		expect(payload.end).toBe(expectedEnd);
		expect(typeof payload.timezone).toBe("string");
		expect(payload.timezone.length).toBeGreaterThan(0);
	});

	it("trims name and description", () => {
		const values: BookingFormValues = {
			name: "  Bob  ",
			description: "  Standup  ",
			date: dayjs("2026-04-24"),
			startTime: dayjs("2026-01-01T14:00:00"),
			endTime: dayjs("2026-01-01T15:00:00"),
		};
		const payload = toBookingPayload(values);
		expect(payload.title).toBe("Bob");
		expect(payload.description).toBe("Standup");
		const expectedStart = dayjs("2026-04-24")
			.hour(14)
			.minute(0)
			.second(0)
			.millisecond(0)
			.toISOString();
		const expectedEnd = dayjs("2026-04-24")
			.hour(15)
			.minute(0)
			.second(0)
			.millisecond(0)
			.toISOString();
		expect(payload.start).toBe(expectedStart);
		expect(payload.end).toBe(expectedEnd);
	});
});

describe("fetchBookingsRequest", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
		window.hBricksAdmin = {
			restUrl: "https://example.com/wp-json/hbe/v1/",
			restNonce: "test-nonce",
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		window.hBricksAdmin = undefined;
	});

	it("returns bookings array on success", async () => {
		const bookings = [
			{
				id: 1,
				calendarId: 7,
				title: "Meeting",
				start: "2026-04-24T09:00:00Z",
				end: "2026-04-24T10:00:00Z",
				status: "confirmed",
			},
		];
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.resolve({ items: bookings }),
			}),
		);

		const range = {
			start: "2026-04-01T00:00:00Z",
			end: "2026-04-30T23:59:59Z",
		};
		const result = await fetchBookingsRequest(7, range);
		expect(result).toEqual(bookings);
		expect(fetch).toHaveBeenCalledWith(
			"https://example.com/wp-json/hbe/v1/admin/calendars/7/bookings?start=2026-04-01T00%3A00%3A00Z&end=2026-04-30T23%3A59%3A59Z",
			{
				method: "GET",
				headers: { "X-WP-Nonce": "test-nonce" },
			},
		);
	});

	it("returns empty array when response has no items", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.resolve({ items: undefined }),
			}),
		);

		const range = {
			start: "2026-04-01T00:00:00Z",
			end: "2026-04-30T23:59:59Z",
		};
		const result = await fetchBookingsRequest(7, range);
		expect(result).toEqual([]);
	});

	it("throws on network failure", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
		const range = {
			start: "2026-04-01T00:00:00Z",
			end: "2026-04-30T23:59:59Z",
		};
		await expect(fetchBookingsRequest(7, range)).rejects.toThrow(
			"Network error",
		);
	});

	it("throws with server message on 4xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () => Promise.resolve({ message: "Invalid date range" }),
			}),
		);
		const range = {
			start: "2026-04-01T00:00:00Z",
			end: "2026-04-30T23:59:59Z",
		};
		await expect(fetchBookingsRequest(7, range)).rejects.toThrow(
			"Invalid date range",
		);
	});

	it("throws with fallback message on 5xx response without message", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({}),
			}),
		);
		const range = {
			start: "2026-04-01T00:00:00Z",
			end: "2026-04-30T23:59:59Z",
		};
		await expect(fetchBookingsRequest(7, range)).rejects.toThrow(
			"Bookings could not be loaded.",
		);
	});

	it("throws parse error on invalid JSON", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.reject(new SyntaxError("Unexpected token")),
			}),
		);
		const range = {
			start: "2026-04-01T00:00:00Z",
			end: "2026-04-30T23:59:59Z",
		};
		await expect(fetchBookingsRequest(7, range)).rejects.toThrow(
			"Unexpected token",
		);
	});
});

describe("createBookingRequest", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
		window.hBricksAdmin = {
			restUrl: "https://example.com/wp-json/hbe/v1/",
			restNonce: "test-nonce",
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		window.hBricksAdmin = undefined;
	});

	it("returns created booking on success", async () => {
		const booking = {
			id: 42,
			calendarId: 7,
			title: "New Booking",
			start: "2026-04-24T09:00:00Z",
			end: "2026-04-24T10:00:00Z",
			status: "confirmed",
		};
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.resolve({ item: booking }),
			}),
		);

		const payload = {
			title: "New Booking",
			description: "Description",
			start: "2026-04-24T09:00:00Z",
			end: "2026-04-24T10:00:00Z",
			timezone: "Europe/Berlin",
		};
		const result = await createBookingRequest(7, payload);
		expect(result).toEqual(booking);
		expect(fetch).toHaveBeenCalledWith(
			"https://example.com/wp-json/hbe/v1/admin/calendars/7/bookings",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-WP-Nonce": "test-nonce",
				},
				body: JSON.stringify(payload),
			},
		);
	});

	it("throws on network failure", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
		const payload = {
			title: "New Booking",
			description: "Description",
			start: "2026-04-24T09:00:00Z",
			end: "2026-04-24T10:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(createBookingRequest(7, payload)).rejects.toThrow(
			"Network error",
		);
	});

	it("throws with server message on 4xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () => Promise.resolve({ message: "Slot unavailable" }),
			}),
		);
		const payload = {
			title: "New Booking",
			description: "Description",
			start: "2026-04-24T09:00:00Z",
			end: "2026-04-24T10:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(createBookingRequest(7, payload)).rejects.toThrow(
			"Slot unavailable",
		);
	});

	it("throws with fallback message on 5xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({}),
			}),
		);
		const payload = {
			title: "New Booking",
			description: "Description",
			start: "2026-04-24T09:00:00Z",
			end: "2026-04-24T10:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(createBookingRequest(7, payload)).rejects.toThrow(
			"Booking could not be created.",
		);
	});

	it("throws parse error on invalid JSON", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.reject(new SyntaxError("Unexpected token")),
			}),
		);
		const payload = {
			title: "New Booking",
			description: "Description",
			start: "2026-04-24T09:00:00Z",
			end: "2026-04-24T10:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(createBookingRequest(7, payload)).rejects.toThrow(
			"Unexpected token",
		);
	});
});

describe("updateBookingRequest", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
		window.hBricksAdmin = {
			restUrl: "https://example.com/wp-json/hbe/v1/",
			restNonce: "test-nonce",
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		window.hBricksAdmin = undefined;
	});

	it("returns updated booking on success", async () => {
		const booking = {
			id: 42,
			calendarId: 7,
			title: "Updated Booking",
			start: "2026-04-24T11:00:00Z",
			end: "2026-04-24T12:00:00Z",
			status: "confirmed",
		};
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.resolve({ item: booking }),
			}),
		);

		const payload = {
			title: "Updated Booking",
			description: "Updated Description",
			start: "2026-04-24T11:00:00Z",
			end: "2026-04-24T12:00:00Z",
			timezone: "Europe/Berlin",
		};
		const result = await updateBookingRequest(7, 42, payload);
		expect(result).toEqual(booking);
		expect(fetch).toHaveBeenCalledWith(
			"https://example.com/wp-json/hbe/v1/admin/calendars/7/bookings/42",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-WP-Nonce": "test-nonce",
				},
				body: JSON.stringify(payload),
			},
		);
	});

	it("throws on network failure", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
		const payload = {
			title: "Updated Booking",
			description: "Description",
			start: "2026-04-24T11:00:00Z",
			end: "2026-04-24T12:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(updateBookingRequest(7, 42, payload)).rejects.toThrow(
			"Network error",
		);
	});

	it("throws with server message on 4xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: () => Promise.resolve({ message: "Conflict detected" }),
			}),
		);
		const payload = {
			title: "Updated Booking",
			description: "Description",
			start: "2026-04-24T11:00:00Z",
			end: "2026-04-24T12:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(updateBookingRequest(7, 42, payload)).rejects.toThrow(
			"Conflict detected",
		);
	});

	it("throws with fallback message on 5xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({}),
			}),
		);
		const payload = {
			title: "Updated Booking",
			description: "Description",
			start: "2026-04-24T11:00:00Z",
			end: "2026-04-24T12:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(updateBookingRequest(7, 42, payload)).rejects.toThrow(
			"Booking could not be updated.",
		);
	});

	it("throws parse error on invalid JSON", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: true,
				json: () => Promise.reject(new SyntaxError("Unexpected token")),
			}),
		);
		const payload = {
			title: "Updated Booking",
			description: "Description",
			start: "2026-04-24T11:00:00Z",
			end: "2026-04-24T12:00:00Z",
			timezone: "Europe/Berlin",
		};
		await expect(updateBookingRequest(7, 42, payload)).rejects.toThrow(
			"Unexpected token",
		);
	});
});

describe("deleteBookingRequest", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
		window.hBricksAdmin = {
			restUrl: "https://example.com/wp-json/hbe/v1/",
			restNonce: "test-nonce",
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		window.hBricksAdmin = undefined;
	});

	it("resolves void on success", async () => {
		vi.mocked(fetch).mockResolvedValue(createMockResponse({ ok: true }));
		await expect(deleteBookingRequest(7, 42)).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledWith(
			"https://example.com/wp-json/hbe/v1/admin/calendars/7/bookings/42",
			{
				method: "DELETE",
				headers: { "X-WP-Nonce": "test-nonce" },
			},
		);
	});

	it("throws on network failure", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
		await expect(deleteBookingRequest(7, 42)).rejects.toThrow("Network error");
	});

	it("throws with server message on 4xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 403,
				statusText: "Forbidden",
				json: () => Promise.resolve({ message: "Not authorized" }),
			}),
		);
		await expect(deleteBookingRequest(7, 42)).rejects.toThrow("Not authorized");
	});

	it("throws with fallback message on 5xx response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({}),
			}),
		);
		await expect(deleteBookingRequest(7, 42)).rejects.toThrow(
			"Booking could not be deleted.",
		);
	});

	it("throws parse error on invalid JSON during error response", async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({
				ok: false,
				status: 500,
				json: () => Promise.reject(new SyntaxError("Unexpected token")),
			}),
		);
		await expect(deleteBookingRequest(7, 42)).rejects.toThrow(
			"Unexpected token",
		);
	});
});
