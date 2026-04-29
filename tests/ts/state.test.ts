import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyResponsiveLayoutMode,
	createInitialBookingState,
	isStepperMode,
	normalizeFirstColumnMode,
	normalizeLayoutMode,
	resetCompletedBooking,
	setBookingNotice,
	setBookingStep,
	shouldAutoAdvanceStepper,
	syncBookingLayoutState,
} from "../../elements/booking/src/state";
import type { BookingState } from "../../elements/booking/src/types";

function makeRoot(dataset: Record<string, string> = {}): HTMLElement {
	const root = document.createElement("div");
	root.className = "hbe-booking";
	for (const child of [
		"hbe-booking__column--first",
		"hbe-booking__column--calendar",
		"hbe-booking__column--slots",
		"hbe-booking__calendar-meta",
		"hbe-booking__status",
		"hbe-booking__first-body",
		"hbe-booking__slots-body",
		"hbe-booking__calendar-mount",
	]) {
		const el = document.createElement("div");
		el.className = child;
		root.appendChild(el);
	}
	for (const [key, value] of Object.entries(dataset)) {
		root.dataset[key] = value;
	}
	document.body.appendChild(root);
	return root;
}

describe("normalizeFirstColumnMode", () => {
	it("returns valid mode unchanged", () => {
		expect(normalizeFirstColumnMode("off")).toBe("off");
		expect(normalizeFirstColumnMode("info")).toBe("info");
		expect(normalizeFirstColumnMode("service")).toBe("service");
	});

	it("falls back to service for unknown values", () => {
		expect(normalizeFirstColumnMode("garbage")).toBe("service");
		expect(normalizeFirstColumnMode(undefined)).toBe("service");
	});
});

describe("normalizeLayoutMode", () => {
	it("returns stepper only for exact match", () => {
		expect(normalizeLayoutMode("stepper")).toBe("stepper");
	});

	it("falls back to inline otherwise", () => {
		expect(normalizeLayoutMode("inline")).toBe("inline");
		expect(normalizeLayoutMode("garbage")).toBe("inline");
		expect(normalizeLayoutMode(undefined)).toBe("inline");
	});
});

describe("createInitialBookingState", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("reads dataset attributes into state", () => {
		const root = makeRoot({
			calendarId: "42",
			restBase: "https://example.com/wp-json/hbe/v1/",
			firstColumnMode: "info",
			layoutMode: "stepper",
			showSlots: "false",
			showStepperProgress: "false",
			stepperAutoAdvance: "false",
			builderPreview: "true",
			showSummary: "true",
		});
		const state = createInitialBookingState(root);

		expect(state.calendarId).toBe(42);
		expect(state.restBase).toBe("https://example.com/wp-json/hbe/v1");
		expect(state.firstColumnMode).toBe("info");
		expect(state.layoutMode).toBe("stepper");
		expect(state.showSlots).toBe(false);
		expect(state.showStepperProgress).toBe(false);
		expect(state.stepperAutoAdvance).toBe(false);
		expect(state.isBuilderPreview).toBe(true);
		expect(state.showReservationSummary).toBe(true);
	});

	it("defaults missing dataset fields", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);

		expect(state.calendarId).toBe(0);
		expect(state.restBase).toBe("");
		expect(state.firstColumnMode).toBe("service");
		expect(state.layoutMode).toBe("inline");
		expect(state.showSlots).toBe(true);
		expect(state.bookingStep).toBe("availability");
		expect(state.bookingForm).toEqual({
			name: "",
			email: "",
			phone: "",
			notes: "",
		});
	});
});

describe("isStepperMode / shouldAutoAdvanceStepper", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("isStepperMode reflects layout", () => {
		const root = makeRoot({ layoutMode: "stepper" });
		const state = createInitialBookingState(root);
		expect(isStepperMode(state)).toBe(true);

		state.layoutMode = "inline";
		expect(isStepperMode(state)).toBe(false);
	});

	it("auto-advance requires stepper + flag", () => {
		const root = makeRoot({ layoutMode: "stepper" });
		const state = createInitialBookingState(root);
		expect(shouldAutoAdvanceStepper(state)).toBe(true);

		state.stepperAutoAdvance = false;
		expect(shouldAutoAdvanceStepper(state)).toBe(false);

		state.stepperAutoAdvance = true;
		state.layoutMode = "inline";
		expect(shouldAutoAdvanceStepper(state)).toBe(false);
	});
});

describe("applyResponsiveLayoutMode", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("forces stepper on mobile", () => {
		vi.stubGlobal("matchMedia", (q: string) => ({
			matches: q === "(max-width: 640px)",
			media: q,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}));

		const root = makeRoot();
		const state = createInitialBookingState(root);
		applyResponsiveLayoutMode(state, "inline");

		expect(state.layoutMode).toBe("stepper");
		expect(root.dataset.layoutMode).toBe("stepper");

		vi.unstubAllGlobals();
	});

	it("falls back to inline on desktop when slots hidden", () => {
		vi.stubGlobal("matchMedia", () => ({
			matches: false,
			media: "",
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}));

		const root = makeRoot();
		const state = createInitialBookingState(root);
		state.showSlots = false;
		applyResponsiveLayoutMode(state, "stepper");

		expect(state.layoutMode).toBe("inline");
		vi.unstubAllGlobals();
	});

	it("preserves natural layout on desktop", () => {
		vi.stubGlobal("matchMedia", () => ({
			matches: false,
			media: "",
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}));

		const root = makeRoot();
		const state = createInitialBookingState(root);
		applyResponsiveLayoutMode(state, "stepper");

		expect(state.layoutMode).toBe("stepper");
		vi.unstubAllGlobals();
	});
});

describe("setBookingNotice", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	function freshState(): BookingState {
		const root = makeRoot();
		return createInitialBookingState(root);
	}

	it("animates new notice", () => {
		const state = freshState();
		setBookingNotice(state, { type: "error", message: "X" });
		expect(state.bookingNoticeShouldAnimate).toBe(true);
		expect(state.bookingNoticeShouldWiggle).toBe(false);
	});

	it("wiggles on repeated error", () => {
		const state = freshState();
		setBookingNotice(state, { type: "error", message: "X" });
		setBookingNotice(state, { type: "error", message: "X" });
		expect(state.bookingNoticeShouldWiggle).toBe(true);
		expect(state.bookingNoticeShouldAnimate).toBe(false);
	});

	it("clears notice when null", () => {
		const state = freshState();
		setBookingNotice(state, { type: "error", message: "X" });
		setBookingNotice(state, null);
		expect(state.bookingNotice).toBeNull();
		expect(state.bookingNoticeShouldAnimate).toBe(false);
	});

	it("does not wiggle on success notice", () => {
		const state = freshState();
		setBookingNotice(state, { type: "success", message: "ok" });
		setBookingNotice(state, { type: "success", message: "ok" });
		expect(state.bookingNoticeShouldWiggle).toBe(false);
	});
});

describe("syncBookingLayoutState / resetCompletedBooking", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("syncs success state on root", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		state.bookingCompleted = true;
		syncBookingLayoutState(state);
		expect(root.dataset.bookingState).toBe("success");
	});

	it("syncs active state on root", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		syncBookingLayoutState(state);
		expect(root.dataset.bookingState).toBe("active");
	});

	it("resetCompletedBooking clears completed flag", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		state.bookingCompleted = true;
		state.completedBooking = {
			id: 1,
			calendarId: 1,
			start: "",
			end: "",
			status: "confirmed",
			customerName: "x",
			customerEmail: "x@y.z",
			customerPhone: "",
			customerNotes: "",
			serviceId: "",
			timezone: "UTC",
		};
		resetCompletedBooking(state);
		expect(state.bookingCompleted).toBe(false);
		expect(state.completedBooking).toBeNull();
		expect(root.dataset.bookingState).toBe("active");
	});
});

describe("setBookingStep", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = "";
	});

	it("sets details class and clears notice transitioning to details", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		setBookingNotice(state, { type: "error", message: "boom" });

		setBookingStep(state, "details");

		expect(state.bookingStep).toBe("details");
		expect(state.bookingNotice).toBeNull();
		expect(root.classList.contains("is-details-view")).toBe(true);
		expect(root.classList.contains("is-transitioning-to-details")).toBe(true);
	});

	it("removes transition class after timeout", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		setBookingStep(state, "details");

		vi.advanceTimersByTime(500);

		expect(root.classList.contains("is-transitioning-to-details")).toBe(false);
		expect(state.stepTransitionTimer).toBeNull();
	});

	it("noop when step unchanged", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		setBookingStep(state, "availability");

		expect(root.classList.contains("is-transitioning-to-details")).toBe(false);
		expect(root.classList.contains("is-transitioning-to-availability")).toBe(
			false,
		);
	});

	it("clears existing timer when called again", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		setBookingStep(state, "details");
		const firstTimer = state.stepTransitionTimer;
		setBookingStep(state, "availability");

		expect(state.stepTransitionTimer).not.toBe(firstTimer);
		expect(state.bookingStep).toBe("availability");
	});

	it("skips animation when animate=false", () => {
		const root = makeRoot();
		const state = createInitialBookingState(root);
		setBookingStep(state, "details", false);

		expect(state.stepTransitionTimer).toBeNull();
		expect(root.classList.contains("is-transitioning-to-details")).toBe(false);
	});
});
