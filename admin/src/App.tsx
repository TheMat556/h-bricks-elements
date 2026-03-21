import { useEffect, useMemo, useState } from "react";

import {
	createAdminBooking,
	createCalendar,
	createService,
	deleteService,
	getBookings,
	getCalendars,
	getServices,
	updateBookingStatus,
	updateCalendar,
	updateService,
} from "./api/client";
import type { Booking, CalendarSettings, Service } from "./types";

const weekdayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const statusOptions: Booking["status"][] = ["pending", "confirmed", "cancelled", "completed"];

function emptyCalendarPayload(name = "New Calendar") {
	return {
		name,
		weekdays: {
			monday: { enabled: true, from: "09:00", to: "17:00" },
			tuesday: { enabled: true, from: "09:00", to: "17:00" },
			wednesday: { enabled: true, from: "09:00", to: "17:00" },
			thursday: { enabled: true, from: "09:00", to: "17:00" },
			friday: { enabled: true, from: "09:00", to: "17:00" },
			saturday: { enabled: false, from: "09:00", to: "17:00" },
			sunday: { enabled: false, from: "09:00", to: "17:00" },
		},
		slotDuration: 30,
		slotBuffer: 0,
		leadTimeHours: 24,
		bookingWindowDays: 60,
		exceptionDays: [],
		autoConfirm: false,
		timezone: "UTC",
	};
}

function emptyServicePayload(calendarId: number) {
	return {
		calendarId,
		name: "",
		description: "",
		color: "#1f7ae0",
		isPublic: true,
		sortOrder: 0,
	};
}

export function App() {
	const [calendars, setCalendars] = useState<CalendarSettings[]>([]);
	const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
	const [calendarForm, setCalendarForm] = useState<CalendarSettings | null>(null);
	const [services, setServices] = useState<Service[]>([]);
	const [serviceForm, setServiceForm] = useState<Partial<Service>>({});
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [bookingForm, setBookingForm] = useState({
		date: "",
		time_start: "",
		customer_name: "",
		customer_email: "",
		customer_phone: "",
		customer_notes: "",
		service_id: 0,
	});
	const [statusMessage, setStatusMessage] = useState<string>("");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [loading, setLoading] = useState(true);

	const selectedCalendar = useMemo(
		() => calendars.find((calendar) => calendar.id === selectedCalendarId) ?? null,
		[calendars, selectedCalendarId],
	);

	useEffect(() => {
		void loadCalendars();
	}, []);

	useEffect(() => {
		if (!selectedCalendarId) {
			setServices([]);
			setBookings([]);
			setCalendarForm(null);
			return;
		}

		const calendar = calendars.find((entry) => entry.id === selectedCalendarId) ?? null;
		setCalendarForm(calendar ? structuredClone(calendar) : null);
		setServiceForm(emptyServicePayload(selectedCalendarId));
		void Promise.all([loadServices(selectedCalendarId), loadBookings(selectedCalendarId)]);
	}, [selectedCalendarId, calendars]);

	async function loadCalendars() {
		setLoading(true);
		setErrorMessage("");
		try {
			const items = await getCalendars();
			setCalendars(items);
			setSelectedCalendarId((current) => current ?? items[0]?.id ?? null);
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to load calendars.");
		} finally {
			setLoading(false);
		}
	}

	async function loadServices(calendarId: number) {
		try {
			setServices(await getServices(calendarId));
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to load services.");
		}
	}

	async function loadBookings(calendarId: number) {
		try {
			setBookings(await getBookings(calendarId));
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to load bookings.");
		}
	}

	async function handleCreateCalendar() {
		setErrorMessage("");
		setStatusMessage("");
		try {
			const created = await createCalendar(emptyCalendarPayload(`Calendar ${calendars.length + 1}`));
			setCalendars((current) => [...current, created]);
			setSelectedCalendarId(created.id);
			setStatusMessage("Calendar created.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to create calendar.");
		}
	}

	async function handleSaveCalendar() {
		if (!calendarForm) return;
		setErrorMessage("");
		setStatusMessage("");
		try {
			const updated = await updateCalendar(calendarForm.id, calendarForm);
			setCalendars((current) => current.map((item) => (item.id === updated.id ? updated : item)));
			setCalendarForm(updated);
			setStatusMessage("Calendar saved.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to save calendar.");
		}
	}

	async function handleCreateOrUpdateService() {
		if (!selectedCalendarId || !serviceForm.name) return;
		setErrorMessage("");
		setStatusMessage("");
		try {
			if (serviceForm.id) {
				const updated = await updateService(serviceForm.id, serviceForm);
				setServices((current) => current.map((item) => (item.id === updated.id ? updated : item)));
				setStatusMessage("Service updated.");
			} else {
				const created = await createService(selectedCalendarId, serviceForm as Service & { name: string });
				setServices((current) => [...current, created]);
				setStatusMessage("Service created.");
			}

			setServiceForm(emptyServicePayload(selectedCalendarId));
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to save service.");
		}
	}

	async function handleDeleteService(id: number) {
		setErrorMessage("");
		setStatusMessage("");
		try {
			await deleteService(id);
			setServices((current) => current.filter((service) => service.id !== id));
			if (serviceForm.id === id && selectedCalendarId) {
				setServiceForm(emptyServicePayload(selectedCalendarId));
			}
			setStatusMessage("Service deleted.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to delete service.");
		}
	}

	async function handleCreateBooking() {
		if (!selectedCalendarId) return;
		setErrorMessage("");
		setStatusMessage("");
		try {
			await createAdminBooking({
				calendar_id: selectedCalendarId,
				service_id: bookingForm.service_id || undefined,
				date: bookingForm.date,
				time_start: bookingForm.time_start,
				customer_name: bookingForm.customer_name,
				customer_email: bookingForm.customer_email,
				customer_phone: bookingForm.customer_phone,
				customer_notes: bookingForm.customer_notes,
			});
			setBookingForm({
				date: "",
				time_start: "",
				customer_name: "",
				customer_email: "",
				customer_phone: "",
				customer_notes: "",
				service_id: 0,
			});
			await loadBookings(selectedCalendarId);
			setStatusMessage("Booking created.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to create booking.");
		}
	}

	async function handleStatusChange(id: number, status: Booking["status"]) {
		setErrorMessage("");
		setStatusMessage("");
		try {
			const updated = await updateBookingStatus(id, status);
			setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)));
			setStatusMessage("Booking status updated.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to update booking status.");
		}
	}

	return (
		<div className="hbe-admin-app">
			<header className="hbe-page-header">
				<div>
					<h1>H-Booking Admin</h1>
					<p>Calendars, services, and bookings are managed here.</p>
				</div>
				<button className="hbe-button hbe-button-primary" onClick={() => void handleCreateCalendar()}>
					New Calendar
				</button>
			</header>

			{errorMessage ? <div className="hbe-notice hbe-notice-error">{errorMessage}</div> : null}
			{statusMessage ? <div className="hbe-notice hbe-notice-success">{statusMessage}</div> : null}

			<div className="hbe-layout">
				<aside className="hbe-sidebar">
					<h2>Calendars</h2>
					{loading ? <p>Loading…</p> : null}
					<div className="hbe-calendar-list">
						{calendars.map((calendar) => (
							<button
								key={calendar.id}
								className={`hbe-calendar-item ${calendar.id === selectedCalendarId ? "is-active" : ""}`}
								onClick={() => setSelectedCalendarId(calendar.id)}
							>
								<span>{calendar.name}</span>
								<small>{calendar.timezone}</small>
							</button>
						))}
					</div>
				</aside>

				<main className="hbe-content">
					{calendarForm && selectedCalendar ? (
						<>
							<section className="hbe-panel">
								<div className="hbe-panel-header">
									<h2>Calendar Settings</h2>
									<button className="hbe-button hbe-button-primary" onClick={() => void handleSaveCalendar()}>
										Save Calendar
									</button>
								</div>
								<div className="hbe-form-grid">
									<label>
										<span>Name</span>
										<input
											value={calendarForm.name}
											onChange={(event) => setCalendarForm({ ...calendarForm, name: event.target.value })}
										/>
									</label>
									<label>
										<span>Timezone</span>
										<input
											value={calendarForm.timezone}
											onChange={(event) => setCalendarForm({ ...calendarForm, timezone: event.target.value })}
										/>
									</label>
									<label>
										<span>Slot Duration</span>
										<input
											type="number"
											value={calendarForm.slotDuration}
											onChange={(event) => setCalendarForm({ ...calendarForm, slotDuration: Number(event.target.value) })}
										/>
									</label>
									<label>
										<span>Buffer</span>
										<input
											type="number"
											value={calendarForm.slotBuffer}
											onChange={(event) => setCalendarForm({ ...calendarForm, slotBuffer: Number(event.target.value) })}
										/>
									</label>
									<label>
										<span>Lead Time Hours</span>
										<input
											type="number"
											value={calendarForm.leadTimeHours}
											onChange={(event) => setCalendarForm({ ...calendarForm, leadTimeHours: Number(event.target.value) })}
										/>
									</label>
									<label>
										<span>Booking Window Days</span>
										<input
											type="number"
											value={calendarForm.bookingWindowDays}
											onChange={(event) => setCalendarForm({ ...calendarForm, bookingWindowDays: Number(event.target.value) })}
										/>
									</label>
									<label className="hbe-checkbox">
										<input
											type="checkbox"
											checked={calendarForm.autoConfirm}
											onChange={(event) => setCalendarForm({ ...calendarForm, autoConfirm: event.target.checked })}
										/>
										<span>Auto-confirm bookings</span>
									</label>
									<label className="hbe-span-2">
										<span>Exception Days</span>
										<input
											value={calendarForm.exceptionDays.join(", ")}
											onChange={(event) =>
												setCalendarForm({
													...calendarForm,
													exceptionDays: event.target.value
														.split(",")
														.map((entry) => entry.trim())
														.filter(Boolean),
												})
											}
											placeholder="2026-12-25, 2026-12-26"
										/>
									</label>
								</div>
								<div className="hbe-weekday-grid">
									{weekdayOrder.map((day) => {
										const config = calendarForm.weekdays[day];
										return (
											<div key={day} className="hbe-weekday-card">
												<label className="hbe-checkbox">
													<input
														type="checkbox"
														checked={config.enabled}
														onChange={(event) =>
															setCalendarForm({
																...calendarForm,
																weekdays: {
																	...calendarForm.weekdays,
																	[day]: { ...config, enabled: event.target.checked },
																},
															})
														}
													/>
													<span>{day}</span>
												</label>
												<input
													type="time"
													value={config.from}
													onChange={(event) =>
														setCalendarForm({
															...calendarForm,
															weekdays: {
																...calendarForm.weekdays,
																[day]: { ...config, from: event.target.value },
															},
														})
													}
												/>
												<input
													type="time"
													value={config.to}
													onChange={(event) =>
														setCalendarForm({
															...calendarForm,
															weekdays: {
																...calendarForm.weekdays,
																[day]: { ...config, to: event.target.value },
															},
														})
													}
												/>
											</div>
										);
									})}
								</div>
							</section>

							<section className="hbe-panel">
								<div className="hbe-panel-header">
									<h2>Services</h2>
									<button className="hbe-button" onClick={() => setServiceForm(emptyServicePayload(selectedCalendar.id))}>
										Reset
									</button>
								</div>
								<div className="hbe-form-grid">
									<label>
										<span>Name</span>
										<input value={serviceForm.name ?? ""} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} />
									</label>
									<label>
										<span>Color</span>
										<input value={serviceForm.color ?? "#1f7ae0"} onChange={(event) => setServiceForm({ ...serviceForm, color: event.target.value })} />
									</label>
									<label>
										<span>Sort Order</span>
										<input
											type="number"
											value={serviceForm.sortOrder ?? 0}
											onChange={(event) => setServiceForm({ ...serviceForm, sortOrder: Number(event.target.value) })}
										/>
									</label>
									<label className="hbe-checkbox">
										<input
											type="checkbox"
											checked={Boolean(serviceForm.isPublic)}
											onChange={(event) => setServiceForm({ ...serviceForm, isPublic: event.target.checked })}
										/>
										<span>Public</span>
									</label>
									<label className="hbe-span-2">
										<span>Description</span>
										<textarea value={serviceForm.description ?? ""} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} />
									</label>
								</div>
								<button className="hbe-button hbe-button-primary" onClick={() => void handleCreateOrUpdateService()}>
									{serviceForm.id ? "Update Service" : "Create Service"}
								</button>
								<div className="hbe-list-table">
									{services.map((service) => (
										<div key={service.id} className="hbe-list-row">
											<div>
												<strong>{service.name}</strong>
												<p>{service.description || "No description"}</p>
											</div>
											<div className="hbe-row-actions">
												<button className="hbe-button" onClick={() => setServiceForm(service)}>
													Edit
												</button>
												<button className="hbe-button hbe-button-danger" onClick={() => void handleDeleteService(service.id)}>
													Delete
												</button>
											</div>
										</div>
									))}
								</div>
							</section>

							<section className="hbe-panel">
								<div className="hbe-panel-header">
									<h2>Create Booking</h2>
									<button className="hbe-button" onClick={() => void loadBookings(selectedCalendar.id)}>
										Refresh Bookings
									</button>
								</div>
								<div className="hbe-form-grid">
									<label>
										<span>Date</span>
										<input type="date" value={bookingForm.date} onChange={(event) => setBookingForm({ ...bookingForm, date: event.target.value })} />
									</label>
									<label>
										<span>Time Start</span>
										<input type="time" value={bookingForm.time_start} onChange={(event) => setBookingForm({ ...bookingForm, time_start: event.target.value })} />
									</label>
									<label>
										<span>Service</span>
										<select value={bookingForm.service_id} onChange={(event) => setBookingForm({ ...bookingForm, service_id: Number(event.target.value) })}>
											<option value={0}>None</option>
											{services.map((service) => (
												<option key={service.id} value={service.id}>
													{service.name}
												</option>
											))}
										</select>
									</label>
									<label>
										<span>Customer Name</span>
										<input value={bookingForm.customer_name} onChange={(event) => setBookingForm({ ...bookingForm, customer_name: event.target.value })} />
									</label>
									<label>
										<span>Customer Email</span>
										<input value={bookingForm.customer_email} onChange={(event) => setBookingForm({ ...bookingForm, customer_email: event.target.value })} />
									</label>
									<label>
										<span>Phone</span>
										<input value={bookingForm.customer_phone} onChange={(event) => setBookingForm({ ...bookingForm, customer_phone: event.target.value })} />
									</label>
									<label className="hbe-span-2">
										<span>Notes</span>
										<textarea value={bookingForm.customer_notes} onChange={(event) => setBookingForm({ ...bookingForm, customer_notes: event.target.value })} />
									</label>
								</div>
								<button className="hbe-button hbe-button-primary" onClick={() => void handleCreateBooking()}>
									Create Booking
								</button>
							</section>

							<section className="hbe-panel">
								<h2>Bookings</h2>
								<div className="hbe-list-table">
									{bookings.map((booking) => (
										<div key={booking.id} className="hbe-list-row hbe-list-row-booking">
											<div>
												<strong>
													{booking.date} {booking.timeStart} - {booking.customerName}
												</strong>
												<p>
													{booking.customerEmail} · {booking.status} · {booking.source}
												</p>
											</div>
											<select value={booking.status} onChange={(event) => void handleStatusChange(booking.id, event.target.value as Booking["status"])}>
												{statusOptions.map((status) => (
													<option key={status} value={status}>
														{status}
													</option>
												))}
											</select>
										</div>
									))}
									{!bookings.length ? <p>No bookings yet.</p> : null}
								</div>
							</section>
						</>
					) : (
						<section className="hbe-panel">
							<h2>No Calendar Selected</h2>
							<p>Create or select a calendar to start configuring bookings.</p>
						</section>
					)}
				</main>
			</div>
		</div>
	);
}
