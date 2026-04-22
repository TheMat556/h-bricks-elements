import "./booking.css";

type FirstColumnMode = "off" | "info" | "service";
type LayoutMode = "inline" | "stepper";
type StepperPanel = "first" | "calendar" | "slots" | "details" | "success";
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
	publicLabel?: string;
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
	publicBooking?: {
		displayName?: string;
		defaultServiceLabel?: string;
		locationLabel?: string;
	};
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
	customerName?: string;
	customerEmail?: string;
	timezone?: string;
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

type CompletedBookingState = {
	serviceLabel: string | null;
	whatLabel: string;
	dateHeading: string;
	timeLabel: string;
	timeZoneLabel: string;
	scheduleLabel: string;
	customerName: string;
	customerEmail: string;
	hostLabel: string | null;
	hostEmail: string | null;
	locationLabel: string | null;
	notes: string;
};

type BookingState = {
	root: HTMLElement;
	firstColumnEl: HTMLElement | null;
	calendarColumnEl: HTMLElement | null;
	slotsColumnEl: HTMLElement | null;
	calendarMetaEl: HTMLElement | null;
	statusEl: HTMLElement | null;
	firstBodyEl: HTMLElement | null;
	slotsBodyEl: HTMLElement | null;
	calendarMountEl: HTMLElement | null;
	stepperProgressEl: HTMLElement | null;
	firstColumnMode: FirstColumnMode;
	layoutMode: LayoutMode;
	showSlots: boolean;
	showStepperProgress: boolean;
	stepperAutoAdvance: boolean;
	infoTitle: string;
	infoText: string;
	firstColumnLabel: string;
	successTitle: string;
	successText: string;
	successButtonLabel: string;
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
	renderedSlots: BookingSlot[];
	selectedServiceIds: Set<string>;
	bookingForm: BookingFormState;
	bookingNotice: BookingNotice | null;
	bookingNoticeShouldAnimate: boolean;
	bookingNoticeShouldWiggle: boolean;
	bookingCompleted: boolean;
	completedBooking: CompletedBookingState | null;
	bookingStep: "availability" | "details";
	stepperPanel: StepperPanel;
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

const monthFormatter = new Intl.DateTimeFormat(undefined, {
	month: "long",
	year: "numeric",
});

const shortWeekdayDateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
});

const calendarWeekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const legacyInfoTitleDefaults = new Set(["Booking information"]);
const legacyInfoTextDefaults = new Set([
	"Use this column for a short intro, opening notes, or any calendar-specific instructions.",
]);

function bootBookingElements() {
	document
		.querySelectorAll<HTMLElement>("[data-hbe-booking]")
		.forEach((root) => {
			void initBookingElement(root);
		});
}

function createInitialBookingState(root: HTMLElement): BookingState {
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

function normalizeFirstColumnMode(mode?: string): FirstColumnMode {
	if (mode === "off" || mode === "info" || mode === "service") {
		return mode;
	}

	return "service";
}

function normalizeLayoutMode(mode?: string): LayoutMode {
	return mode === "stepper" ? "stepper" : "inline";
}

function applyResponsiveLayoutMode(
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

function isStepperMode(state: BookingState): boolean {
	return state.layoutMode === "stepper";
}

function shouldAutoAdvanceStepper(state: BookingState): boolean {
	return isStepperMode(state) && state.stepperAutoAdvance;
}

function getBookingNoticeKey(notice: BookingNotice | null): string | null {
	if (!notice) {
		return null;
	}

	return `${notice.type}:${notice.message}`;
}

function setBookingNotice(state: BookingState, notice: BookingNotice | null) {
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

function resetCompletedBooking(state: BookingState) {
	state.bookingCompleted = false;
	state.completedBooking = null;
	syncBookingLayoutState(state);
}

function syncBookingLayoutState(state: BookingState) {
	state.root.dataset.bookingState = state.bookingCompleted
		? "success"
		: "active";
}

function getInitialStepperPanel(state: BookingState): StepperPanel {
	if (state.firstColumnMode !== "off") {
		return "first";
	}

	if (state.showSlots) {
		return "calendar";
	}

	return "calendar";
}

function getStepperPanels(
	state: BookingState,
): Array<{ panel: StepperPanel; label: string }> {
	const panels: Array<{ panel: StepperPanel; label: string }> = [];

	if (state.firstColumnMode !== "off") {
		panels.push({
			panel: "first",
			label: state.firstColumnMode === "info" ? "Info" : "Service",
		});
	}

	panels.push({
		panel: "calendar",
		label: "Date",
	});

	if (state.showSlots) {
		panels.push({
			panel: "slots",
			label: "Time",
		});
		panels.push({
			panel: "details",
			label: "Details",
		});

		if (state.bookingCompleted) {
			panels.push({
				panel: "success",
				label: "Done",
			});
		}
	}

	return panels;
}

function ensureStepperProgressElement(state: BookingState) {
	if (!isStepperMode(state)) {
		state.stepperProgressEl?.remove();
		state.stepperProgressEl = null;
		state.root.removeAttribute("data-stepper-panel");
		state.root.removeAttribute("data-stepper-direction");
		return;
	}

	if (!state.showStepperProgress) {
		state.stepperProgressEl?.remove();
		state.stepperProgressEl = null;
		return;
	}

	if (!state.stepperProgressEl) {
		const progressEl = document.createElement("div");
		progressEl.className = "hbe-booking__stepper-progress";
		state.root.prepend(progressEl);
		state.stepperProgressEl = progressEl;
	}
}

function syncStepperUI(state: BookingState) {
	if (!isStepperMode(state)) {
		return;
	}

	ensureStepperProgressElement(state);

	const stepperPanels = getStepperPanels(state);
	const allowedPanels = new Set(stepperPanels.map((item) => item.panel));

	if (state.bookingCompleted) {
		state.stepperPanel = "success";
	} else if (
		state.bookingStep === "details" &&
		state.showSlots &&
		state.selectedSlot
	) {
		state.stepperPanel = "details";
	} else if (!allowedPanels.has(state.stepperPanel)) {
		state.stepperPanel = getInitialStepperPanel(state);
	} else if (
		state.stepperPanel === "details" &&
		(!state.showSlots || !state.selectedSlot)
	) {
		state.stepperPanel = "slots";
	} else if (state.stepperPanel === "success" && !state.bookingCompleted) {
		state.stepperPanel = getInitialStepperPanel(state);
	}

	state.root.dataset.stepperPanel = state.stepperPanel;

	if (!state.stepperProgressEl) {
		return;
	}

	const activeIndex = stepperPanels.findIndex(
		(item) => item.panel === state.stepperPanel,
	);
	state.stepperProgressEl.innerHTML = `
		<div class="hbe-booking__stepper-track">
			${stepperPanels
				.map((item, index) => {
					const classes = ["hbe-booking__stepper-step"];
					const isReachable = !state.bookingCompleted && index <= activeIndex;

					if (index < activeIndex) {
						classes.push("is-complete");
					}

					if (index === activeIndex) {
						classes.push("is-current");
					}

					const connectorMarkup =
						index < stepperPanels.length - 1
							? `<span class="hbe-booking__stepper-connector${index < activeIndex ? " is-active" : ""}" aria-hidden="true"></span>`
							: "";

					return `
						<button
							type="button"
							class="${classes.join(" ")}"
							${isReachable ? `data-stepper-target="${item.panel}"` : "disabled"}
						>
							<span class="hbe-booking__stepper-index">${index + 1}</span>
							<span class="hbe-booking__stepper-label">${escapeHtml(item.label)}</span>
						</button>
						${connectorMarkup}
					`;
				})
				.join("")}
		</div>
	`;
}

function goToStepperPanel(state: BookingState, panel: StepperPanel) {
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

function setStepperDirection(state: BookingState, panel: StepperPanel) {
	if (!isStepperMode(state)) {
		return;
	}

	const panels = getStepperPanels(state);
	const currentIndex = panels.findIndex(
		(item) => item.panel === state.stepperPanel,
	);
	const nextIndex = panels.findIndex((item) => item.panel === panel);

	if (nextIndex === -1) {
		return;
	}

	if (currentIndex === -1) {
		state.root.dataset.stepperDirection = "forward";
		return;
	}

	state.root.dataset.stepperDirection =
		nextIndex < currentIndex ? "back" : "forward";
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

function syncRenderedSlotSelection(
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

function renderCalendarStepperActions(state: BookingState): string {
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

function renderSlotsPanel(
	content: string,
	variant: "availability" | "details" | "success" | "empty" | "blocked",
): string {
	return `<div class="hbe-booking__slots-panel is-${variant}">${content}</div>`;
}

function getInitialServiceSelection(
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
					selectedServiceNames: getActiveServices(state).map((service) =>
						getServiceDisplayLabel(service),
					),
				},
			}),
		},
	);

	const data = (await response.json()) as {
		item?: PublicBooking;
		message?: string;
	};

	if (!response.ok || !data.item) {
		throw new Error(
			typeof data.message === "string"
				? data.message
				: "Booking could not be created.",
		);
	}

	return data.item;
}

function createContentElement<K extends keyof HTMLElementTagNameMap>(
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

function renderStatusMessage(
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

function createInfoStack({
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

function createFirstColumnSelectionElement(
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

function createFirstColumnStepperActions(
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

function createServiceButton(
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

function renderTitleCopyBlock(
	target: HTMLElement,
	title: string,
	copy: string,
) {
	target.replaceChildren(
		createContentElement("h3", "hbe-booking__title", title),
		createContentElement("p", "hbe-booking__copy", copy),
	);
}

function renderCalendarMetaBlock(
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

function renderLoadingState(state: BookingState) {
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

function renderMissingCalendar(state: BookingState) {
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

function renderErrorState(state: BookingState, message: string) {
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

function setBookingStep(
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

function transitionInlineBookingStep(
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

function transitionFromSuccessToAvailability(state: BookingState) {
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

function attachNoticeAnimationCleanup(state: BookingState) {
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

function renderCalendarMeta(state: BookingState) {
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

function renderFirstColumn(state: BookingState) {
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

function renderInfoColumn(state: BookingState) {
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

function renderServicesColumn(state: BookingState) {
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

async function toggleServiceSelection(state: BookingState, serviceId: string) {
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

function mountCalendar(state: BookingState) {
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

async function navigateCalendarMonth(state: BookingState, delta: number) {
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

function renderAdminOnlySlotsState(state: BookingState): boolean {
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

function renderUnselectedDateSlotsState(state: BookingState): boolean {
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

function renderExceptionSlotsState(
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

function renderCompletedBookingState(state: BookingState): boolean {
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

function renderDetailsSlotsState(
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

function renderNoAvailableSlotsState(
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

function syncClearedSlotSelection(
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

function renderBookingNoticeMarkup(state: BookingState): string {
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

function renderAvailableSlotsMarkup(
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

function animateRenderedSlotItems(slotsBodyEl: HTMLElement) {
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

function renderSlots(state: BookingState) {
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

function renderBookingSummaryMarkup(
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

function renderBookingFieldsMarkup(state: BookingState): string {
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

function renderBookingActionsMarkup(state: BookingState): string {
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

function renderBookingPanel(
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

function renderBookingSummaryRow(
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

function getSelectedServiceLabel(state: BookingState): string | null {
	const selectedServices = getActiveServices(state);

	return selectedServices.length > 0
		? selectedServices
				.map((service) => getServiceDisplayLabel(service))
				.join(", ")
		: null;
}

function getServiceDisplayLabel(service: Service): string {
	return service.publicLabel?.trim() || service.name.trim();
}

function getPublicDisplayName(state: BookingState): string | null {
	if (!state.calendar) {
		return null;
	}

	const publicBooking = state.calendar.settings.publicBooking;
	const explicitName = publicBooking?.displayName?.trim();
	const calendarTitle = state.calendar.title.trim();

	return explicitName || calendarTitle || null;
}

function getDefaultMeetingLabel(
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

function getTimeZoneLabel(date: Date, timeZone?: string): string {
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

function formatMeetingSchedule(
	startDate: Date,
	endDate: Date,
	timeZone?: string,
	timeFormat?: "12h" | "24h",
): string {
	return `${formatLongDate(startDate, timeZone)} ${formatTimeRange(startDate, endDate, timeFormat, timeZone)} (${getTimeZoneLabel(startDate, timeZone)})`;
}

function getMeetingDurationMinutes(startDate: Date, endDate: Date): number {
	return Math.max(
		1,
		Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
	);
}

function buildCompletedBookingWhatLabel(
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

function formatTimeRange(
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

function formatLongDate(date: Date, timeZone?: string): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone,
	}).format(date);
}

function getCompletedBookingHost(state: BookingState): {
	hostLabel: string | null;
	hostEmail: string | null;
	locationLabel: string | null;
} {
	const publicBooking = state.calendar?.settings.publicBooking;
	const mailSettings = state.calendar?.settings.mailSettings;
	const hostLabel = getPublicDisplayName(state);
	const hostEmail = mailSettings?.fromEmail?.trim() || null;
	const locationLabel = publicBooking?.locationLabel?.trim() || null;

	return {
		hostLabel,
		hostEmail,
		locationLabel,
	};
}

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join("");
}

function renderSuccessCard(completedBooking: CompletedBookingState): string {
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

function renderSuccessPanel(state: BookingState): string {
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

function renderTimeFormatToggle(state: BookingState): string {
	const is12 = state.timeFormat === "12h";
	return `
		<div class="hbe-booking__time-toggle">
			<button type="button" class="hbe-booking__time-toggle-btn${is12 ? " is-active" : ""}" data-time-format="12h">12h</button>
			<button type="button" class="hbe-booking__time-toggle-btn${!is12 ? " is-active" : ""}" data-time-format="24h">24h</button>
		</div>
	`;
}

async function submitPublicBooking(state: BookingState) {
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

function dispatchBookingEvent(
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

function getRequiredMinutes(state: BookingState): number {
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

function getActiveServices(state: BookingState): Service[] {
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

function getBookingsRangeEnd(
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

function getCalendarValidRange(
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

function getExceptionForDate(
	settings: CalendarSettings,
	dateKey: string,
): DateException | undefined {
	const exceptions = Array.isArray(settings.exceptions)
		? settings.exceptions
		: [];

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
		return Boolean(
			interval?.start && interval?.end && interval.start < interval.end,
		);
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

function formatSlotRange(
	slot: BookingSlot,
	timeFormat?: "12h" | "24h",
): string {
	return formatTimeRange(slot.startDate, slot.endDate, timeFormat);
}

function isSameSlot(left: BookingSlot, right: BookingSlot): boolean {
	return (
		left.startDate.getTime() === right.startDate.getTime() &&
		left.endDate.getTime() === right.endDate.getTime()
	);
}

function timeToMinutes(time: string): number {
	const [hours, minutes] = time
		.split(":")
		.map((part) => Number.parseInt(part, 10));

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
