import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildCalendarDays,
	buildCompletedBookingWhatLabel,
	canNavigateToMonth,
	endOfDay,
	escapeAttribute,
	escapeHtml,
	formatCurrency,
	formatMeetingSchedule,
	formatSlotRange,
	getBookableSlotsForDate,
	getBookingsRangeEnd,
	getCalendarValidRange,
	getDefaultSlotMinutes,
	getExceptionForDate,
	getInitialServiceSelection,
	getIntervalsForDate,
	getMaxAdvanceDays,
	getMeetingDurationMinutes,
	getPrimaryServiceId,
	getSelectedServiceLabel,
	getServiceDisplayLabel,
	getServiceMinutes,
	getTimeZoneLabel,
	isDateInValidRange,
	isSameDay,
	isSameSlot,
	isSlotAvailable,
	parseDateKey,
	parsePrice,
	splitIntervalIntoSlots,
	startOfDay,
	toDateKey,
} from "../../elements/booking/src/slots";
import type {
	BookingSlot,
	BookingState,
	CalendarSettings,
	PublicBooking,
} from "../../elements/booking/src/types";

function makeDate(
	year: number,
	month: number,
	day: number,
	hour = 0,
	minute = 0,
): Date {
	return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function makeSettings(
	overrides: Partial<CalendarSettings> = {},
): CalendarSettings {
	return {
		allowDoubleBookings: false,
		slotSettings: { sessionDuration: 60 },
		workingHours: {
			monday: { enabled: true, intervals: [{ start: "09:00", end: "12:00" }] },
			tuesday: { enabled: true, intervals: [{ start: "09:00", end: "12:00" }] },
			wednesday: {
				enabled: true,
				intervals: [{ start: "09:00", end: "12:00" }],
			},
			thursday: {
				enabled: true,
				intervals: [{ start: "09:00", end: "12:00" }],
			},
			friday: { enabled: true, intervals: [{ start: "09:00", end: "12:00" }] },
			saturday: { enabled: false, intervals: [] },
			sunday: { enabled: false, intervals: [] },
		},
		...overrides,
	};
}

function baseBookingState(overrides: Partial<BookingState> = {}): BookingState {
	return {
		root: document.createElement("div"),
		firstColumnEl: null,
		calendarColumnEl: null,
		slotsColumnEl: null,
		calendarMetaEl: null,
		statusEl: null,
		firstBodyEl: null,
		slotsBodyEl: null,
		calendarMountEl: null,
		stepperProgressEl: null,
		firstColumnMode: "off",
		layoutMode: "inline",
		showSlots: false,
		showStepperProgress: false,
		stepperAutoAdvance: false,
		infoTitle: "",
		infoText: "",
		firstColumnLabel: "",
		successTitle: "",
		successText: "",
		successButtonLabel: "",
		showReservationSummary: false,
		isBuilderPreview: false,
		restBase: "",
		calendarId: 1,
		calendar: {
			id: 1,
			title: "Test Calendar",
			slug: "test-calendar",
			settings: makeSettings({
				workingHours: {
					monday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
					tuesday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
					wednesday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
					thursday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
					friday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
					saturday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
					sunday: {
						enabled: true,
						intervals: [{ start: "09:00", end: "17:00" }],
					},
				},
				slotSettings: { sessionDuration: 60 },
			}),
		},
		bookings: [],
		bookingsRangeEnd: null,
		visibleDate: null,
		selectedDate: null,
		selectedSlot: null,
		renderedSlots: [],
		selectedServiceIds: new Set(),
		bookingForm: { name: "", email: "", phone: "", notes: "" },
		bookingNotice: null,
		bookingNoticeShouldAnimate: false,
		bookingNoticeShouldWiggle: false,
		bookingCompleted: false,
		completedBooking: null,
		bookingStep: "availability",
		stepperPanel: "first",
		stepTransitionTimer: null,
		isSubmittingBooking: false,
		timeFormat: "12h",
		calendarInstance: null,
		...overrides,
	};
}

describe("getBookableSlotsForDate", () => {
	const settings = makeSettings();
	// January 1, 2024 is a Monday
	const date = makeDate(2024, 1, 1);

	it("generates correct slots for a date honoring working hours", () => {
		const slots = getBookableSlotsForDate(settings, date, 60, []);
		expect(slots).toHaveLength(3);
		expect(slots[0].start).toBe("09:00");
		expect(slots[0].end).toBe("10:00");
		expect(slots[1].start).toBe("10:00");
		expect(slots[1].end).toBe("11:00");
		expect(slots[2].start).toBe("11:00");
		expect(slots[2].end).toBe("12:00");
	});

	it("returns empty array when slotMinutes is zero or negative", () => {
		expect(getBookableSlotsForDate(settings, date, 0, [])).toHaveLength(0);
		expect(getBookableSlotsForDate(settings, date, -10, [])).toHaveLength(0);
	});

	it("excludes booked slots", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 10, 0).toISOString(),
				end: makeDate(2024, 1, 1, 11, 0).toISOString(),
				status: "confirmed",
			},
		];
		const slots = getBookableSlotsForDate(settings, date, 60, bookings);
		expect(slots).toHaveLength(2);
		expect(slots[0].start).toBe("09:00");
		expect(slots[1].start).toBe("11:00");
	});

	it("returns empty array for a fully booked day", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 0).toISOString(),
				end: makeDate(2024, 1, 1, 12, 0).toISOString(),
				status: "confirmed",
			},
		];
		const slots = getBookableSlotsForDate(settings, date, 60, bookings);
		expect(slots).toHaveLength(0);
	});

	it("allows all slots when allowDoubleBookings is true", () => {
		const doubleSettings = makeSettings({ allowDoubleBookings: true });
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 0).toISOString(),
				end: makeDate(2024, 1, 1, 12, 0).toISOString(),
				status: "confirmed",
			},
		];
		const slots = getBookableSlotsForDate(doubleSettings, date, 60, bookings);
		expect(slots).toHaveLength(3);
	});

	it("ignores cancelled bookings", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 0).toISOString(),
				end: makeDate(2024, 1, 1, 10, 0).toISOString(),
				status: "cancelled",
			},
		];
		const slots = getBookableSlotsForDate(settings, date, 60, bookings);
		expect(slots).toHaveLength(3);
	});

	it("handles partial overlap (booking covers part of two slots)", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 30).toISOString(),
				end: makeDate(2024, 1, 1, 10, 30).toISOString(),
				status: "confirmed",
			},
		];
		const slots = getBookableSlotsForDate(settings, date, 60, bookings);
		expect(slots).toHaveLength(1);
		expect(slots[0].start).toBe("11:00");
	});

	it("handles multiple working intervals", () => {
		const multiSettings = makeSettings({
			workingHours: {
				monday: {
					enabled: true,
					intervals: [
						{ start: "09:00", end: "10:00" },
						{ start: "14:00", end: "16:00" },
					],
				},
			},
		});
		const slots = getBookableSlotsForDate(multiSettings, date, 60, []);
		expect(slots).toHaveLength(3);
		expect(slots[0].start).toBe("09:00");
		expect(slots[1].start).toBe("14:00");
		expect(slots[2].start).toBe("15:00");
	});

	it("returns empty array for a day with no working hours", () => {
		const disabledSettings = makeSettings({
			workingHours: {
				monday: { enabled: false, intervals: [] },
			},
		});
		const slots = getBookableSlotsForDate(disabledSettings, date, 60, []);
		expect(slots).toHaveLength(0);
	});
});

describe("splitIntervalIntoSlots", () => {
	const date = makeDate(2024, 1, 1);

	it("splits a time interval into fixed-length slots", () => {
		const slots = splitIntervalIntoSlots(
			date,
			{ start: "09:00", end: "12:00" },
			60,
		);
		expect(slots).toHaveLength(3);
		expect(slots[0].start).toBe("09:00");
		expect(slots[0].end).toBe("10:00");
		expect(slots[0].startDate.getHours()).toBe(9);
		expect(slots[0].endDate.getHours()).toBe(10);
		expect(slots[2].start).toBe("11:00");
		expect(slots[2].end).toBe("12:00");
	});

	it("ignores remainder shorter than slotMinutes", () => {
		const slots = splitIntervalIntoSlots(
			date,
			{ start: "09:00", end: "12:30" },
			60,
		);
		expect(slots).toHaveLength(3);
		expect(slots[slots.length - 1].end).toBe("12:00");
	});

	it("returns empty array when interval is shorter than slotMinutes", () => {
		const slots = splitIntervalIntoSlots(
			date,
			{ start: "09:00", end: "09:30" },
			60,
		);
		expect(slots).toHaveLength(0);
	});

	it("splits a three-hour interval into three 60-minute slots", () => {
		const date = makeDate(2024, 1, 1);
		const slots = splitIntervalIntoSlots(
			date,
			{ start: "01:00", end: "04:00" },
			60,
		);
		expect(slots).toHaveLength(3);
		expect(slots[0].start).toBe("01:00");
		expect(slots[1].start).toBe("02:00");
		expect(slots[2].start).toBe("03:00");
		expect(slots[0].end).toBe("02:00");
		expect(slots[2].end).toBe("04:00");
	});
});

describe("isSlotAvailable", () => {
	const settings = makeSettings();
	const slot: BookingSlot = {
		start: "09:00",
		end: "10:00",
		startDate: makeDate(2024, 1, 1, 9, 0),
		endDate: makeDate(2024, 1, 1, 10, 0),
	};

	it("returns true when no bookings overlap", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 10, 0).toISOString(),
				end: makeDate(2024, 1, 1, 11, 0).toISOString(),
				status: "confirmed",
			},
		];
		expect(isSlotAvailable(slot, bookings, settings)).toBe(true);
	});

	it("returns false when a booking overlaps", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 30).toISOString(),
				end: makeDate(2024, 1, 1, 10, 30).toISOString(),
				status: "confirmed",
			},
		];
		expect(isSlotAvailable(slot, bookings, settings)).toBe(false);
	});

	it("returns true for cancelled bookings", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 0).toISOString(),
				end: makeDate(2024, 1, 1, 10, 0).toISOString(),
				status: "cancelled",
			},
		];
		expect(isSlotAvailable(slot, bookings, settings)).toBe(true);
	});

	it("returns true when allowDoubleBookings is true", () => {
		const doubleSettings = makeSettings({ allowDoubleBookings: true });
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 9, 0).toISOString(),
				end: makeDate(2024, 1, 1, 10, 0).toISOString(),
				status: "confirmed",
			},
		];
		expect(isSlotAvailable(slot, bookings, doubleSettings)).toBe(true);
	});

	it("returns false for partial overlap (booking starts before slot ends)", () => {
		const bookings: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 8, 30).toISOString(),
				end: makeDate(2024, 1, 1, 9, 30).toISOString(),
				status: "confirmed",
			},
		];
		expect(isSlotAvailable(slot, bookings, settings)).toBe(false);
	});

	it("returns true for adjacent bookings (exact boundaries)", () => {
		const before: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 8, 0).toISOString(),
				end: makeDate(2024, 1, 1, 9, 0).toISOString(),
				status: "confirmed",
			},
		];
		const after: PublicBooking[] = [
			{
				id: 1,
				start: makeDate(2024, 1, 1, 10, 0).toISOString(),
				end: makeDate(2024, 1, 1, 11, 0).toISOString(),
				status: "confirmed",
			},
		];
		expect(isSlotAvailable(slot, before, settings)).toBe(true);
		expect(isSlotAvailable(slot, after, settings)).toBe(true);
	});
});

describe("buildCalendarDays", () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: makeDate(2024, 6, 15).getTime() });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("builds a correct 7-column grid", () => {
		const state = baseBookingState();
		const visibleMonth = makeDate(2024, 7, 1);
		const validRange = { start: startOfDay(makeDate(2024, 6, 1)) };
		const days = buildCalendarDays(state, visibleMonth, validRange);
		expect(days.length % 7).toBe(0);
		// July 2024 starts on Monday -> no leading days
		expect(days[0].date.getDate()).toBe(1);
		expect(days[0].isOutsideMonth).toBe(false);
		// July has 31 days, then 4 trailing days
		expect(days[30].date.getDate()).toBe(31);
		expect(days[30].isOutsideMonth).toBe(false);
		expect(days[31].isOutsideMonth).toBe(true);
		expect(days.length).toBe(35);
	});

	it("marks days outside validRange as disabled", () => {
		const state = baseBookingState();
		const visibleMonth = makeDate(2024, 7, 1);
		const validRange = {
			start: makeDate(2024, 7, 5),
			end: makeDate(2024, 7, 20),
		};
		const days = buildCalendarDays(state, visibleMonth, validRange);
		// July 1-4 disabled
		for (let i = 0; i < 4; i++) {
			expect(days[i].isAvailable).toBe(false);
		}
		// July 5-19 enabled (have slots and are inside range)
		for (let i = 4; i < 19; i++) {
			expect(days[i].isAvailable).toBe(true);
		}
		// July 20-31 disabled
		for (let i = 19; i < 31; i++) {
			expect(days[i].isAvailable).toBe(false);
		}
	});

	it("marks selected date correctly", () => {
		const state = baseBookingState({ selectedDate: makeDate(2024, 7, 10) });
		const visibleMonth = makeDate(2024, 7, 1);
		const validRange = { start: startOfDay(makeDate(2024, 6, 1)) };
		const days = buildCalendarDays(state, visibleMonth, validRange);
		const selectedDay = days.find(
			(d) => d.date.getDate() === 10 && !d.isOutsideMonth,
		);
		expect(selectedDay).toBeDefined();
		expect(selectedDay!.isSelected).toBe(true);
		const otherDay = days.find(
			(d) => d.date.getDate() === 11 && !d.isOutsideMonth,
		);
		expect(otherDay!.isSelected).toBe(false);
	});

	it("marks days before today as unavailable", () => {
		// Fake timer is set to June 15
		const state = baseBookingState();
		const visibleMonth = makeDate(2024, 6, 1);
		const validRange = { start: startOfDay(makeDate(2024, 1, 1)) };
		const days = buildCalendarDays(state, visibleMonth, validRange);
		const todayIndex = days.findIndex(
			(d) => !d.isOutsideMonth && d.date.getDate() === 15,
		);
		expect(todayIndex).toBeGreaterThan(-1);
		for (let i = 0; i < todayIndex; i++) {
			if (!days[i].isOutsideMonth) {
				expect(days[i].isAvailable).toBe(false);
			}
		}
		expect(days[todayIndex].isAvailable).toBe(true);
	});
});

describe("getCalendarValidRange", () => {
	const today = makeDate(2024, 1, 1);

	it("clamps navigation by maxAdvanceDays", () => {
		const settings = makeSettings({ slotSettings: { maxAdvanceDays: 7 } });
		const range = getCalendarValidRange(settings, today);
		expect(range.start).toEqual(today);
		expect(range.end).toEqual(makeDate(2024, 1, 9));
	});

	it("returns only start when maxAdvanceDays is 0 (no future booking)", () => {
		const settings = makeSettings({ slotSettings: { maxAdvanceDays: 0 } });
		const range = getCalendarValidRange(settings, today);
		expect(range.start).toEqual(today);
		expect(range.end).toBeUndefined();
	});

	it("treats undefined maxAdvanceDays as 0", () => {
		const settings = makeSettings({ slotSettings: {} });
		const range = getCalendarValidRange(settings, today);
		expect(range.start).toEqual(today);
		expect(range.end).toBeUndefined();
	});

	it("ignores negative maxAdvanceDays", () => {
		const settings = makeSettings({ slotSettings: { maxAdvanceDays: -5 } });
		const range = getCalendarValidRange(settings, today);
		expect(range.start).toEqual(today);
		expect(range.end).toBeUndefined();
	});

	it("returns only start when maxAdvanceDays is not set", () => {
		const settings = makeSettings();
		delete (settings as CalendarSettings).slotSettings;
		const range = getCalendarValidRange(settings, today);
		expect(range.start).toEqual(today);
		expect(range.end).toBeUndefined();
	});
});

describe("parsePrice", () => {
	it("returns 0 for undefined or empty string", () => {
		expect(parsePrice(undefined)).toBe(0);
		expect(parsePrice("")).toBe(0);
	});

	it("extracts numeric value from plain number strings", () => {
		expect(parsePrice("0")).toBe(0);
		expect(parsePrice("25")).toBe(25);
		expect(parsePrice("1234")).toBe(1234);
	});

	it("handles currency symbols and whitespace", () => {
		expect(parsePrice("$25")).toBe(25);
		expect(parsePrice("€ 99.99")).toBe(99.99);
		expect(parsePrice("Price: 100")).toBe(100);
	});

	it("handles comma as decimal separator", () => {
		expect(parsePrice("1,50")).toBe(1.5);
		// Only the first comma is replaced; parseFloat stops at the second dot
		expect(parsePrice("1.234,56")).toBe(1.234);
	});

	it("handles dot as decimal separator and thousands comma", () => {
		expect(parsePrice("1.50")).toBe(1.5);
		// Same first-comma-replacement quirk
		expect(parsePrice("1,234.56")).toBe(1.234);
	});

	it("returns 0 for non-numeric strings", () => {
		expect(parsePrice("abc")).toBe(0);
		expect(parsePrice("free")).toBe(0);
	});

	it("handles negative values", () => {
		expect(parsePrice("-50")).toBe(-50);
		expect(parsePrice("-10,99")).toBe(-10.99);
	});
});

describe("formatMeetingSchedule", () => {
	it("produces a human-readable string with date, time range, and timezone", () => {
		const start = new Date(Date.UTC(2024, 0, 15, 9, 0));
		const end = new Date(Date.UTC(2024, 0, 15, 10, 0));
		const result = formatMeetingSchedule(start, end, "UTC", "24h");
		expect(result).toContain("2024");
		expect(result).toContain("09:00");
		expect(result).toContain("10:00");
		expect(result).toMatch(/\(.+\)$/);
	});

	it("works without explicit timezone and format", () => {
		const start = new Date(Date.UTC(2024, 0, 15, 14, 0));
		const end = new Date(Date.UTC(2024, 0, 15, 15, 0));
		const result = formatMeetingSchedule(start, end);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("toDateKey / parseDateKey", () => {
	it("round-trips a date correctly", () => {
		const original = startOfDay(makeDate(2024, 1, 5));
		const key = toDateKey(original);
		expect(key).toBe("2024-01-05");
		const parsed = parseDateKey(key);
		expect(parsed).toEqual(original);
	});

	it("pads single-digit months and days", () => {
		const key = toDateKey(makeDate(2024, 3, 2));
		expect(key).toBe("2024-03-02");
	});

	it("returns null for invalid keys", () => {
		expect(parseDateKey("not-a-date")).toBeNull();
		expect(parseDateKey("")).toBeNull();
		expect(parseDateKey("2024-01")).toBeNull();
	});

	it("parses keys at year boundaries", () => {
		const parsed = parseDateKey("2023-12-31");
		expect(parsed).toEqual(startOfDay(makeDate(2023, 12, 31)));
	});

	it("parses out-of-range month values without returning null", () => {
		// JavaScript Date wraps months > 11
		const parsed = parseDateKey("2024-13-01");
		expect(parsed).not.toBeNull();
		expect(parsed!.getFullYear()).toBe(2025);
		expect(parsed!.getMonth()).toBe(0);
	});
});

describe("getInitialServiceSelection", () => {
	it("returns first service id in service mode with single selection", () => {
		const settings = makeSettings({
			selectionMode: "single",
			services: [
				{ id: "svc1", name: "Service 1" },
				{ id: "svc2", name: "Service 2" },
			],
		});
		expect(getInitialServiceSelection(settings, "service")).toEqual(
			new Set(["svc1"]),
		);
	});

	it("returns empty set in non-service mode", () => {
		const settings = makeSettings({
			selectionMode: "single",
			services: [{ id: "svc1", name: "Service 1" }],
		});
		expect(getInitialServiceSelection(settings, "info")).toEqual(
			new Set<string>(),
		);
		expect(getInitialServiceSelection(settings, "off")).toEqual(
			new Set<string>(),
		);
	});

	it("returns empty set when services are empty", () => {
		const settings = makeSettings({
			selectionMode: "single",
			services: [],
		});
		expect(getInitialServiceSelection(settings, "service")).toEqual(
			new Set<string>(),
		);
	});
});

describe("getSelectedServiceLabel", () => {
	it("returns joined labels for selected services", () => {
		const base = baseBookingState();
		const state = baseBookingState({
			firstColumnMode: "service",
			selectedServiceIds: new Set(["svc1", "svc2"]),
			calendar: {
				...base.calendar!,
				settings: {
					...base.calendar!.settings,
					services: [
						{ id: "svc1", name: "Service 1", publicLabel: "Public 1" },
						{ id: "svc2", name: "Service 2" },
					],
				},
			},
		});
		expect(getSelectedServiceLabel(state)).toBe("Public 1, Service 2");
	});

	it("returns null when no services are selected", () => {
		const state = baseBookingState({
			firstColumnMode: "service",
			selectedServiceIds: new Set(),
		});
		expect(getSelectedServiceLabel(state)).toBeNull();
	});
});

describe("getServiceDisplayLabel", () => {
	it("uses publicLabel when present", () => {
		expect(
			getServiceDisplayLabel({ id: "1", name: "Name", publicLabel: "Public" }),
		).toBe("Public");
	});

	it("falls back to name when publicLabel is absent", () => {
		expect(getServiceDisplayLabel({ id: "1", name: "Name" })).toBe("Name");
	});
});

describe("getPrimaryServiceId", () => {
	it("returns first active service id", () => {
		const base = baseBookingState();
		const state = baseBookingState({
			firstColumnMode: "service",
			selectedServiceIds: new Set(["svc1"]),
			calendar: {
				...base.calendar!,
				settings: {
					...base.calendar!.settings,
					services: [{ id: "svc1", name: "Service 1" }],
				},
			},
		});
		expect(getPrimaryServiceId(state)).toBe("svc1");
	});

	it("returns empty string when no active services", () => {
		expect(getPrimaryServiceId(baseBookingState())).toBe("");
	});
});

describe("getServiceMinutes", () => {
	it("sums duration, prepTime, and cleanupTime", () => {
		expect(
			getServiceMinutes({
				id: "1",
				name: "Test",
				duration: 30,
				prepTime: 5,
				cleanupTime: 10,
			}),
		).toBe(45);
	});

	it("returns 0 when all values are undefined", () => {
		expect(getServiceMinutes({ id: "1", name: "Test" })).toBe(0);
	});
});

describe("getDefaultSlotMinutes", () => {
	it("sums sessionDuration, prepTime, and cleanupTime from settings", () => {
		const settings = makeSettings({
			slotSettings: { sessionDuration: 60, prepTime: 10, cleanupTime: 5 },
		});
		expect(getDefaultSlotMinutes(settings)).toBe(75);
	});

	it("returns 0 when slotSettings is absent", () => {
		expect(
			getDefaultSlotMinutes(
				makeSettings({
					slotSettings: undefined,
				} as unknown as Partial<CalendarSettings>),
			),
		).toBe(0);
	});
});

describe("getMaxAdvanceDays", () => {
	it("returns the value when positive", () => {
		expect(
			getMaxAdvanceDays(makeSettings({ slotSettings: { maxAdvanceDays: 7 } })),
		).toBe(7);
	});

	it("returns 0 when value is negative", () => {
		expect(
			getMaxAdvanceDays(makeSettings({ slotSettings: { maxAdvanceDays: -3 } })),
		).toBe(0);
	});

	it("returns 0 when value is undefined", () => {
		expect(getMaxAdvanceDays(makeSettings({}))).toBe(0);
	});
});

describe("getBookingsRangeEnd", () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: makeDate(2024, 1, 1).getTime() });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns end of today plus maxAdvanceDays when positive", () => {
		const settings = makeSettings({ slotSettings: { maxAdvanceDays: 7 } });
		const focusDate = makeDate(2024, 1, 15);
		expect(getBookingsRangeEnd(settings, focusDate)).toEqual(
			endOfDay(makeDate(2024, 1, 8)),
		);
	});

	it("returns focus month end plus 62 days when maxAdvanceDays is 0", () => {
		const settings = makeSettings({ slotSettings: { maxAdvanceDays: 0 } });
		const focusDate = makeDate(2024, 1, 15);
		expect(getBookingsRangeEnd(settings, focusDate)).toEqual(
			endOfDay(makeDate(2024, 4, 2)),
		);
	});
});

describe("canNavigateToMonth", () => {
	const validRange = {
		start: makeDate(2024, 1, 15),
		end: makeDate(2024, 3, 15),
	};

	it("returns false for a month fully before the valid range", () => {
		expect(canNavigateToMonth(makeDate(2023, 12, 1), validRange)).toBe(false);
	});

	it("returns false for a month fully after the valid range", () => {
		expect(canNavigateToMonth(makeDate(2024, 4, 1), validRange)).toBe(false);
	});

	it("returns true for a month overlapping the valid range", () => {
		expect(canNavigateToMonth(makeDate(2024, 2, 1), validRange)).toBe(true);
	});
});

describe("isDateInValidRange", () => {
	const validRange = {
		start: makeDate(2024, 1, 15),
		end: makeDate(2024, 3, 15),
	};

	it("returns false for a date before the start", () => {
		expect(isDateInValidRange(makeDate(2024, 1, 10), validRange)).toBe(false);
	});

	it("returns false for a date at or after the end", () => {
		expect(isDateInValidRange(makeDate(2024, 3, 15), validRange)).toBe(false);
		expect(isDateInValidRange(makeDate(2024, 3, 20), validRange)).toBe(false);
	});

	it("returns true for a date inside the range", () => {
		expect(isDateInValidRange(makeDate(2024, 2, 1), validRange)).toBe(true);
	});
});

describe("getExceptionForDate", () => {
	const settings = makeSettings({
		exceptions: [
			{ id: "1", date: "2024-01-15", reason: "Holiday" },
			{ id: "2", date: "2024-01-20", reason: "Closed" },
		],
	});

	it("finds a matching exception", () => {
		const result = getExceptionForDate(settings, "2024-01-15");
		expect(result).toBeDefined();
		expect(result!.reason).toBe("Holiday");
	});

	it("returns undefined when no match", () => {
		expect(getExceptionForDate(settings, "2024-01-16")).toBeUndefined();
	});
});

describe("getIntervalsForDate", () => {
	it("returns enabled day intervals", () => {
		const settings = makeSettings({
			workingHours: {
				monday: {
					enabled: true,
					intervals: [{ start: "09:00", end: "17:00" }],
				},
			},
		});
		expect(getIntervalsForDate(settings, makeDate(2024, 1, 1))).toEqual([
			{ start: "09:00", end: "17:00" },
		]);
	});

	it("returns empty array for a disabled day", () => {
		const settings = makeSettings({
			workingHours: {
				saturday: { enabled: false, intervals: [] },
			},
		});
		expect(getIntervalsForDate(settings, makeDate(2024, 1, 6))).toEqual([]);
	});

	it("filters invalid intervals", () => {
		const settings = makeSettings({
			workingHours: {
				monday: {
					enabled: true,
					intervals: [
						{ start: "09:00", end: "17:00" },
						{ start: "17:00", end: "09:00" },
						{ start: "", end: "10:00" },
					],
				},
			},
		});
		expect(getIntervalsForDate(settings, makeDate(2024, 1, 1))).toEqual([
			{ start: "09:00", end: "17:00" },
		]);
	});
});

describe("isSameDay", () => {
	it("returns true for the same day regardless of time", () => {
		expect(
			isSameDay(makeDate(2024, 1, 1, 9, 0), makeDate(2024, 1, 1, 14, 0)),
		).toBe(true);
	});

	it("returns false for different days", () => {
		expect(isSameDay(makeDate(2024, 1, 1), makeDate(2024, 1, 2))).toBe(false);
	});
});

describe("isSameSlot", () => {
	it("returns true for identical start and end dates", () => {
		const slot: BookingSlot = {
			start: "09:00",
			end: "10:00",
			startDate: makeDate(2024, 1, 1, 9, 0),
			endDate: makeDate(2024, 1, 1, 10, 0),
		};
		expect(isSameSlot(slot, { ...slot })).toBe(true);
	});

	it("returns false for different dates", () => {
		const a: BookingSlot = {
			start: "09:00",
			end: "10:00",
			startDate: makeDate(2024, 1, 1, 9, 0),
			endDate: makeDate(2024, 1, 1, 10, 0),
		};
		const b: BookingSlot = {
			start: "10:00",
			end: "11:00",
			startDate: makeDate(2024, 1, 1, 10, 0),
			endDate: makeDate(2024, 1, 1, 11, 0),
		};
		expect(isSameSlot(a, b)).toBe(false);
	});
});

describe("formatSlotRange", () => {
	it("produces a formatted range string", () => {
		const slot: BookingSlot = {
			start: "09:00",
			end: "10:00",
			startDate: makeDate(2024, 1, 1, 9, 0),
			endDate: makeDate(2024, 1, 1, 10, 0),
		};
		const result = formatSlotRange(slot, "24h");
		expect(result).toContain("09:00");
		expect(result).toContain("10:00");
	});
});

describe("formatCurrency", () => {
	it("formats number as USD currency", () => {
		expect(formatCurrency(25.5)).toBe("$25.50");
		expect(formatCurrency(100)).toBe("$100.00");
	});
});

describe("getMeetingDurationMinutes", () => {
	it("returns minute difference between dates", () => {
		const start = makeDate(2024, 1, 1, 9, 0);
		const end = makeDate(2024, 1, 1, 10, 0);
		expect(getMeetingDurationMinutes(start, end)).toBe(60);
	});

	it("returns minimum of 1 minute", () => {
		const start = makeDate(2024, 1, 1, 10, 0);
		const end = makeDate(2024, 1, 1, 9, 0);
		expect(getMeetingDurationMinutes(start, end)).toBe(1);
	});
});

describe("buildCompletedBookingWhatLabel", () => {
	const start = makeDate(2024, 1, 1, 9, 0);
	const end = makeDate(2024, 1, 1, 10, 0);

	it("uses serviceLabel when provided", () => {
		expect(
			buildCompletedBookingWhatLabel("Custom Service", start, end, "Default"),
		).toBe("Custom Service");
	});

	it("falls back to defaultMeetingLabel", () => {
		expect(buildCompletedBookingWhatLabel(null, start, end, "Team Sync")).toBe(
			"Team Sync",
		);
	});

	it("falls back to duration when both labels are empty", () => {
		expect(buildCompletedBookingWhatLabel(null, start, end, "")).toBe(
			"60 minute meeting",
		);
		expect(buildCompletedBookingWhatLabel("   ", start, end, "")).toBe(
			"60 minute meeting",
		);
	});
});

describe("getTimeZoneLabel", () => {
	it("returns a non-empty timezone name string", () => {
		const label = getTimeZoneLabel(makeDate(2024, 1, 1));
		expect(typeof label).toBe("string");
		expect(label.length).toBeGreaterThan(0);
	});
});

describe("escapeHtml", () => {
	it("escapes &, <, >, \", and '", () => {
		expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
	});
});

describe("escapeAttribute", () => {
	it("behaves the same as escapeHtml", () => {
		const input = `&<>"'`;
		expect(escapeAttribute(input)).toBe(escapeHtml(input));
	});
});
