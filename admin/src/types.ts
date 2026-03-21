export type CalendarWeekday = {
	enabled: boolean;
	from: string;
	to: string;
};

export type CalendarSettings = {
	id: number;
	name: string;
	weekdays: Record<string, CalendarWeekday>;
	slotDuration: number;
	slotBuffer: number;
	leadTimeHours: number;
	bookingWindowDays: number;
	exceptionDays: string[];
	autoConfirm: boolean;
	timezone: string;
};

export type Service = {
	id: number;
	calendarId: number;
	name: string;
	description: string;
	color: string;
	isPublic: boolean;
	sortOrder: number;
};

export type Booking = {
	id: number;
	calendarId: number;
	serviceId: number | null;
	date: string;
	timeStart: string;
	timeEnd: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string;
	customerNotes: string;
	status: "pending" | "confirmed" | "cancelled" | "completed";
	source: "frontend" | "admin";
	createdAt: string;
	updatedAt: string;
};

declare global {
	interface Window {
		hbeAdmin?: {
			nonce: string;
			restUrl: string;
		};
	}
}
