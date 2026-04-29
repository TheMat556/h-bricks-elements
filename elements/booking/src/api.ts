import {
	getActiveServices,
	getBookingsRangeEnd,
	getPrimaryServiceId,
	getServiceDisplayLabel,
	startOfDay,
} from "./slots";
import type { BookingSlot, BookingState, PublicBooking } from "./types";

export async function ensureBookingsLoaded(
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

export async function createPublicBookingRequest(
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
