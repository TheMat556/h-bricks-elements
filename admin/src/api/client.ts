import type { Booking, CalendarSettings, Service } from "../types";

const adminConfig = window.hbeAdmin;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	if (!adminConfig?.restUrl) {
		throw new Error("Admin REST configuration is missing.");
	}

	const response = await fetch(`${adminConfig.restUrl}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			"X-WP-Nonce": adminConfig.nonce,
			...(options.headers ?? {}),
		},
	});

	if (!response.ok) {
		let message = `Request failed with ${response.status}`;
		try {
			const payload = (await response.json()) as { message?: string };
			if (payload.message) {
				message = payload.message;
			}
		} catch {
			// Keep the fallback message.
		}

		throw new Error(message);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

export async function getCalendars(): Promise<CalendarSettings[]> {
	return apiFetch<CalendarSettings[]>("calendars");
}

export async function createCalendar(payload: Partial<CalendarSettings> & { name: string }): Promise<CalendarSettings> {
	return apiFetch<CalendarSettings>("calendars", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function updateCalendar(id: number, payload: Partial<CalendarSettings>): Promise<CalendarSettings> {
	return apiFetch<CalendarSettings>(`calendars/${id}`, {
		method: "PUT",
		body: JSON.stringify(payload),
	});
}

export async function getServices(calendarId: number): Promise<Service[]> {
	return apiFetch<Service[]>(`calendars/${calendarId}/services`);
}

export async function createService(calendarId: number, payload: Partial<Service> & { name: string }): Promise<Service> {
	return apiFetch<Service>(`calendars/${calendarId}/services`, {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function updateService(id: number, payload: Partial<Service>): Promise<Service> {
	return apiFetch<Service>(`services/${id}`, {
		method: "PUT",
		body: JSON.stringify(payload),
	});
}

export async function deleteService(id: number): Promise<void> {
	await apiFetch<{ deleted: boolean }>(`services/${id}`, {
		method: "DELETE",
	});
}

export async function getBookings(calendarId?: number): Promise<Booking[]> {
	const params = new URLSearchParams();
	if (calendarId) {
		params.set("calendar_id", String(calendarId));
	}

	const suffix = params.toString() ? `bookings?${params.toString()}` : "bookings";
	return apiFetch<Booking[]>(suffix);
}

export async function updateBookingStatus(id: number, status: Booking["status"]): Promise<Booking> {
	return apiFetch<Booking>(`bookings/${id}`, {
		method: "PUT",
		body: JSON.stringify({ status }),
	});
}

export async function createAdminBooking(payload: {
	calendar_id: number;
	service_id?: number;
	date: string;
	time_start: string;
	customer_name: string;
	customer_email: string;
	customer_phone?: string;
	customer_notes?: string;
}): Promise<Booking> {
	return apiFetch<Booking>("bookings", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}
