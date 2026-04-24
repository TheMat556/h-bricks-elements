import type {
	BookingNotice,
	BookingState,
	FirstColumnMode,
	LayoutMode,
} from "./types";
import { legacyInfoTextDefaults, legacyInfoTitleDefaults } from "./types";

export function createInitialBookingState(root: HTMLElement): BookingState {
	const infoTitle = normalizeLegacyTemplateOverride(
		root.dataset.infoTitle ?? "",
		legacyInfoTitleDefaults,
	);
	const infoText = normalizeLegacyTemplateOverride(
		root.dataset.infoText ?? "",
		legacyInfoTextDefaults,
	);

	return {
		root,
		firstColumnEl: root.querySelector<HTMLElement>(
			".hbe-booking__column--first",
		),
		calendarColumnEl: root.querySelector<HTMLElement>(
			".hbe-booking__column--calendar",
		),
		slotsColumnEl: root.querySelector<HTMLElement>(
			".hbe-booking__column--slots",
		),
		calendarMetaEl: root.querySelector<HTMLElement>(
			".hbe-booking__calendar-meta",
		),
		statusEl: root.querySelector<HTMLElement>(".hbe-booking__status"),
		firstBodyEl: root.querySelector<HTMLElement>(".hbe-booking__first-body"),
		slotsBodyEl: root.querySelector<HTMLElement>(".hbe-booking__slots-body"),
		calendarMountEl: root.querySelector<HTMLElement>(
			".hbe-booking__calendar-mount",
		),
		stepperProgressEl: null,
		firstColumnMode: normalizeFirstColumnMode(root.dataset.firstColumnMode),
		layoutMode: normalizeLayoutMode(root.dataset.layoutMode),
		showSlots: root.dataset.showSlots !== "false",
		showStepperProgress: root.dataset.showStepperProgress !== "false",
		stepperAutoAdvance: root.dataset.stepperAutoAdvance !== "false",
		infoTitle,
		infoText,
		firstColumnLabel: root.dataset.firstColumnLabel ?? "",
		successTitle: root.dataset.successTitle ?? "",
		successText: root.dataset.successText ?? "",
		successButtonLabel: root.dataset.successButtonLabel ?? "",
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
		renderedSlots: [],
		selectedServiceIds: new Set<string>(),
		bookingForm: {
			name: "",
			email: "",
			phone: "",
			notes: "",
		},
		bookingNotice: null,
		bookingNoticeShouldAnimate: false,
		bookingNoticeShouldWiggle: false,
		bookingCompleted: false,
		completedBooking: null,
		bookingStep: "availability",
		stepperPanel: "calendar",
		stepTransitionTimer: null,
		isSubmittingBooking: false,
		timeFormat: "12h",
		calendarInstance: null,
	};
}

function normalizeLegacyTemplateOverride(
	value: string,
	legacyDefaults: Set<string>,
): string {
	const normalized = value.trim();
	if (!normalized) {
		return "";
	}

	return legacyDefaults.has(normalized) ? "" : normalized;
}

export function normalizeFirstColumnMode(mode?: string): FirstColumnMode {
	if (mode === "off" || mode === "info" || mode === "service") {
		return mode;
	}

	return "service";
}

export function normalizeLayoutMode(mode?: string): LayoutMode {
	return mode === "stepper" ? "stepper" : "inline";
}

export function applyResponsiveLayoutMode(
	state: BookingState,
	naturalLayoutMode: LayoutMode,
): void {
	const isMobile = window.matchMedia("(max-width: 640px)").matches;
	let mode: LayoutMode;

	if (isMobile) {
		mode = "stepper";
	} else if (!state.showSlots && naturalLayoutMode === "stepper") {
		// Desktop: stepper without slot-picking doesn't make sense, fall back to inline
		mode = "inline";
	} else {
		mode = naturalLayoutMode;
	}

	state.layoutMode = mode;
	state.root.dataset.layoutMode = mode;
}

export function isStepperMode(state: BookingState): boolean {
	return state.layoutMode === "stepper";
}

export function shouldAutoAdvanceStepper(state: BookingState): boolean {
	return isStepperMode(state) && state.stepperAutoAdvance;
}

function getBookingNoticeKey(notice: BookingNotice | null): string | null {
	if (!notice) {
		return null;
	}

	return `${notice.type}:${notice.message}`;
}

export function setBookingNotice(
	state: BookingState,
	notice: BookingNotice | null,
) {
	const previousKey = getBookingNoticeKey(state.bookingNotice);
	const nextKey = getBookingNoticeKey(notice);

	state.bookingNoticeShouldAnimate =
		nextKey !== null && nextKey !== previousKey;
	// Only wiggle when the same error is already visible (re-press); first
	// appearances trigger the wiggle via JS after the reveal animation ends.
	state.bookingNoticeShouldWiggle = Boolean(
		nextKey !== null && notice?.type === "error" && nextKey === previousKey,
	);
	state.bookingNotice = notice;
}

export function resetCompletedBooking(state: BookingState) {
	state.bookingCompleted = false;
	state.completedBooking = null;
	syncBookingLayoutState(state);
}

export function syncBookingLayoutState(state: BookingState) {
	state.root.dataset.bookingState = state.bookingCompleted
		? "success"
		: "active";
}

export function setBookingStep(
	state: BookingState,
	step: "availability" | "details",
	animate = true,
) {
	const previousStep = state.bookingStep;

	// Entering the contact/details form should always start clean.
	// This prevents stale validation errors from showing after navigating
	// back to availability and then returning to details.
	if (step === "details" && previousStep !== "details") {
		setBookingNotice(state, null);
	}

	if (state.stepTransitionTimer !== null) {
		window.clearTimeout(state.stepTransitionTimer);
		state.stepTransitionTimer = null;
	}

	state.root.classList.remove(
		"is-transitioning-to-details",
		"is-transitioning-to-availability",
		"is-inline-transitioning-out",
		"is-inline-transitioning-in",
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

export function attachNoticeAnimationCleanup(state: BookingState) {
	if (!state.slotsBodyEl) {
		return;
	}

	const noticeWrap = state.slotsBodyEl.querySelector<HTMLElement>(
		".hbe-booking__booking-notice-wrap.is-entering",
	);

	if (!noticeWrap) {
		return;
	}

	const noticeEl = noticeWrap.querySelector<HTMLElement>(
		".hbe-booking__booking-notice.is-entering",
	);

	const cleanup = (addWiggle: boolean) => {
		noticeWrap.classList.remove("is-entering");
		noticeEl?.classList.remove("is-entering");

		if (addWiggle && noticeEl?.classList.contains("is-error")) {
			noticeEl.classList.add("is-wiggling");
			noticeEl.addEventListener(
				"animationend",
				() => noticeEl.classList.remove("is-wiggling"),
				{ once: true },
			);
		}
	};

	// Skip animation and wiggle entirely for reduced-motion users.
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		cleanup(false);
		return;
	}

	// Measure content height at natural size before collapsing.
	const targetH = noticeWrap.scrollHeight;

	// Collapse synchronously — void offsetHeight forces the browser to commit
	// the start state so the CSS transition sees a real before → after change.
	noticeWrap.style.height = "0px";
	noticeWrap.style.overflow = "hidden";
	noticeWrap.style.opacity = "0";
	noticeWrap.style.transform = "translateY(-0.5rem)";
	void noticeWrap.offsetHeight; // force reflow

	// CSS transitions are better optimised for layout properties than WAAPI.
	noticeWrap.style.transition = [
		"height 240ms cubic-bezier(0.4, 0, 0.2, 1)",
		"opacity 180ms ease",
		"transform 200ms ease-out",
	].join(", ");

	noticeWrap.style.height = `${targetH}px`;
	noticeWrap.style.opacity = "1";
	noticeWrap.style.transform = "translateY(0)";

	// Do NOT use { once: true } — transitionend fires once per property
	// (height, opacity, transform). { once: true } removes the listener after
	// the first event (e.g. opacity), so the height event is never caught.
	const onTransitionEnd = (e: TransitionEvent) => {
		if (e.target !== noticeWrap || e.propertyName !== "height") {
			return;
		}
		noticeWrap.removeEventListener("transitionend", onTransitionEnd);
		noticeWrap.style.height = "";
		noticeWrap.style.overflow = "";
		noticeWrap.style.opacity = "";
		noticeWrap.style.transform = "";
		noticeWrap.style.transition = "";
		cleanup(true);
	};
	noticeWrap.addEventListener("transitionend", onTransitionEnd);
}
