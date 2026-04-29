export type FirstColumnMode = "off" | "info" | "service";
export type LayoutMode = "inline" | "stepper";
export type StepperPanel =
	| "first"
	| "calendar"
	| "slots"
	| "details"
	| "success";
export type WeekdayKey =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

export type Service = {
	id: string;
	name: string;
	publicLabel?: string;
	description?: string;
	duration?: number;
	prepTime?: number;
	cleanupTime?: number;
	price?: string;
};

export type DateException = {
	id: string;
	date: string;
	reason?: string;
};

export type WorkingInterval = {
	start: string;
	end: string;
};

export type WorkingDay = {
	enabled?: boolean;
	intervals?: WorkingInterval[];
};

export type MailSettings = {
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

export type CalendarSettings = {
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

export type PublicCalendar = {
	id: number;
	title: string;
	slug: string;
	settings: CalendarSettings;
};

export type PublicBooking = {
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

export type BookingSlot = {
	start: string;
	end: string;
	startDate: Date;
	endDate: Date;
};

export type BookingFormState = {
	name: string;
	email: string;
	phone: string;
	notes: string;
};

export type BookingNotice = {
	type: "success" | "error" | "info";
	message: string;
};

export type CompletedBookingState = {
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

export type BookingState = {
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

export const weekdayKeys: WeekdayKey[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];

export const longDateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
});

export const monthFormatter = new Intl.DateTimeFormat(undefined, {
	month: "long",
	year: "numeric",
});

export const shortWeekdayDateFormatter = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	month: "short",
	day: "numeric",
});

export const calendarWeekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const legacyInfoTitleDefaults = new Set(["Booking information"]);
export const legacyInfoTextDefaults = new Set([
	"Use this column for a short intro, opening notes, or any calendar-specific instructions.",
]);
