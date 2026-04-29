import { Alert, Form, Spin, theme } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import {
	Calendar,
	dayjsLocalizer,
	type Formats,
	type View,
} from "react-big-calendar";
import withDragAndDrop, {
	type withDragAndDropProps,
} from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { getCalendarCulture, getDayjsLocale, tr } from "./i18n";
import "./BookingCalendar.css";
import type { BookingFormValues } from "./BookingForm";
import { BookingModal } from "./BookingModal";
import {
	buildFormValues,
	createBookingRequest,
	deleteBookingRequest,
	fetchBookingsRequest,
	getClientTimezone,
	getFetchRange,
	getOverviewRange,
	hasBookingConflict,
	mergeRanges,
	toBookingEvent,
	toBookingPayload,
	updateBookingRequest,
	upsertEvent,
} from "./bookingApi";
import { type BookingEvent, RightPanel } from "./RightPanel";
import { BOOKING_MODAL_Z_INDEX, useModalOverlay } from "./useModalOverlay";

dayjs.extend(isoWeek);
dayjs.locale(getDayjsLocale());

const localizer = dayjsLocalizer(dayjs);
const DnDCalendar = withDragAndDrop(Calendar);

export type ViewOption = "week" | "day" | "month" | "agenda";

interface SlotInfo {
	start: Date;
	end: Date;
}

export function BookingView({
	calendarId,
	allowDoubleBookings,
	rightPanelVisible,
	selectedDate,
	view,
	use24h,
	onViewChange,
	onNavigate,
}: {
	calendarId: number;
	allowDoubleBookings: boolean;
	rightPanelVisible: boolean;
	selectedDate: Dayjs;
	view: ViewOption;
	use24h: boolean;
	onViewChange: (v: ViewOption) => void;
	onNavigate: (d: Dayjs) => void;
}) {
	const { token } = theme.useToken();
	const [events, setEvents] = useState<BookingEvent[]>([]);
	const [loading, setLoading] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [pendingSlot, setPendingSlot] = useState<SlotInfo | null>(null);
	const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [form] = Form.useForm<BookingFormValues>();
	const fetchRange = useMemo(() => {
		const calendarRange = getFetchRange(selectedDate, view);
		const overviewRange = getOverviewRange();
		return mergeRanges(calendarRange, overviewRange);
	}, [selectedDate, view]);

	const loadBookings = useCallback(async () => {
		if (!calendarId) {
			setEvents([]);
			setLoading(false);
			return;
		}

		setLoading(true);

		try {
			const items = await fetchBookingsRequest(calendarId, fetchRange);
			setEvents(
				items
					.map(toBookingEvent)
					.sort((left, right) => left.start.getTime() - right.start.getTime()),
			);
			setError("");
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: tr("Bookings could not be loaded."),
			);
		} finally {
			setLoading(false);
		}
	}, [calendarId, fetchRange]);

	const closeModal = useCallback(() => {
		setModalOpen(false);
		setPendingSlot(null);
		setSelectedEvent(null);
		form.resetFields();
	}, [form]);

	const openNewBooking = useCallback(
		(slot: SlotInfo) => {
			if (
				!allowDoubleBookings &&
				hasBookingConflict(events, slot.start, slot.end)
			) {
				setError(tr("This timeslot conflicts with an existing booking."));
				return;
			}

			setPendingSlot(slot);
			setSelectedEvent(null);
			form.setFieldsValue(buildFormValues(slot.start, slot.end));
			setModalOpen(true);
			setError("");
		},
		[allowDoubleBookings, events, form],
	);

	// Synchronously reset events and show loading when the calendar changes
	// so stale bookings never flash before the overlay appears.
	useLayoutEffect(() => {
		if (calendarId) {
			setEvents([]);
			setLoading(true);
			setError("");
		}
	}, [calendarId]);

	useEffect(() => {
		void loadBookings();
	}, [loadBookings]);

	useEffect(() => {
		closeModal();
	}, [closeModal]);

	useEffect(() => {
		window.__hBricksNewBooking = () => {
			openNewBooking({
				start: selectedDate.hour(9).minute(0).second(0).millisecond(0).toDate(),
				end: selectedDate.hour(10).minute(0).second(0).millisecond(0).toDate(),
			});
		};

		return () => {
			delete window.__hBricksNewBooking;
		};
	}, [openNewBooking, selectedDate]);

	useModalOverlay(modalOpen, closeModal, token.colorBgMask);

	const formats: Formats = use24h
		? {
				timeGutterFormat: "HH:mm",
				eventTimeRangeFormat: ({ start, end }) =>
					`${dayjs(start).format("HH:mm")} – ${dayjs(end).format("HH:mm")}`,
				agendaTimeRangeFormat: ({ start, end }) =>
					`${dayjs(start).format("HH:mm")} – ${dayjs(end).format("HH:mm")}`,
				agendaTimeFormat: "HH:mm",
			}
		: {
				timeGutterFormat: "h:mm A",
				eventTimeRangeFormat: ({ start, end }) =>
					`${dayjs(start).format("h:mm A")} – ${dayjs(end).format("h:mm A")}`,
				agendaTimeRangeFormat: ({ start, end }) =>
					`${dayjs(start).format("h:mm A")} – ${dayjs(end).format("h:mm A")}`,
				agendaTimeFormat: "h:mm A",
			};

	const handleSelectSlot = useCallback(
		(slot: SlotInfo) => {
			openNewBooking(slot);
		},
		[openNewBooking],
	);

	const handleSelectEvent = useCallback(
		(event: BookingEvent) => {
			setSelectedEvent(event);
			setPendingSlot(null);
			form.setFieldsValue(
				buildFormValues(
					event.start,
					event.end,
					event.title,
					event.description ?? "",
				),
			);
			setModalOpen(true);
		},
		[form],
	);

	const persistEvent = useCallback(
		async (event: BookingEvent, start: Date, end: Date) => {
			if (
				!allowDoubleBookings &&
				hasBookingConflict(events, start, end, event.id)
			) {
				setError(tr("This timeslot conflicts with an existing booking."));
				return;
			}

			try {
				const updatedItem = await updateBookingRequest(
					calendarId,
					Number(event.id),
					{
						title: event.title,
						description: event.description ?? "",
						start: start.toISOString(),
						end: end.toISOString(),
						timezone: event.timezone ?? getClientTimezone(),
					},
				);
				setEvents((currentEvents) =>
					upsertEvent(currentEvents, toBookingEvent(updatedItem)),
				);
				setError("");
			} catch (saveError) {
				setError(
					saveError instanceof Error
						? saveError.message
						: tr("Booking could not be updated."),
				);
				void loadBookings();
			}
		},
		[allowDoubleBookings, calendarId, events, loadBookings],
	);

	const handleEventDrop: withDragAndDropProps<BookingEvent>["onEventDrop"] =
		useCallback(
			({ event, start, end }) => {
				void persistEvent(event, new Date(start), new Date(end));
			},
			[persistEvent],
		);

	const handleEventResize: withDragAndDropProps<BookingEvent>["onEventResize"] =
		useCallback(
			({ event, start, end }) => {
				void persistEvent(event, new Date(start), new Date(end));
			},
			[persistEvent],
		);

	const handleModalOk = useCallback(async () => {
		try {
			const values = await form.validateFields();
			const payload = toBookingPayload(values);

			if (!dayjs(payload.end).isAfter(dayjs(payload.start))) {
				form.setFields([
					{
						name: "endTime",
						errors: [tr("End time must be after start time.")],
					},
				]);
				return;
			}

			const nextStart = new Date(payload.start);
			const nextEnd = new Date(payload.end);

			if (
				!allowDoubleBookings &&
				hasBookingConflict(
					events,
					nextStart,
					nextEnd,
					selectedEvent ? selectedEvent.id : undefined,
				)
			) {
				form.setFields([
					{
						name: "endTime",
						errors: [tr("This timeslot conflicts with an existing booking.")],
					},
				]);
				setError(tr("This timeslot conflicts with an existing booking."));
				return;
			}

			setSaving(true);

			if (selectedEvent) {
				const updatedItem = await updateBookingRequest(
					calendarId,
					Number(selectedEvent.id),
					payload,
				);
				setEvents((currentEvents) =>
					upsertEvent(currentEvents, toBookingEvent(updatedItem)),
				);
			} else {
				const createdItem = await createBookingRequest(calendarId, payload);
				setEvents((currentEvents) =>
					upsertEvent(currentEvents, toBookingEvent(createdItem)),
				);
			}

			setError("");
			closeModal();
		} catch (saveError) {
			if (
				saveError &&
				typeof saveError === "object" &&
				"errorFields" in saveError
			) {
				return;
			}

			setError(
				saveError instanceof Error
					? saveError.message
					: tr("Booking could not be saved."),
			);
		} finally {
			setSaving(false);
		}
	}, [
		allowDoubleBookings,
		calendarId,
		closeModal,
		events,
		form,
		selectedEvent,
	]);

	const handleDelete = useCallback(async () => {
		if (!selectedEvent) {
			return;
		}

		try {
			setDeleting(true);
			await deleteBookingRequest(calendarId, Number(selectedEvent.id));
			setEvents((currentEvents) =>
				currentEvents.filter((event) => event.id !== selectedEvent.id),
			);
			setError("");
			closeModal();
		} catch (deleteError) {
			setError(
				deleteError instanceof Error
					? deleteError.message
					: tr("Booking could not be deleted."),
			);
		} finally {
			setDeleting(false);
		}
	}, [calendarId, closeModal, selectedEvent]);

	const eventPropGetter = useCallback(
		(event: BookingEvent) => ({
			style: {
				backgroundColor: event.color ?? token.colorPrimary,
				borderColor: "transparent",
				borderRadius: "0",
				color: "#fff",
				fontSize: "12px",
				fontWeight: 600,
				boxShadow: token.boxShadowSecondary,
				padding: "2px 6px",
			},
		}),
		[token.boxShadowSecondary, token.colorPrimary],
	);

	const EmptyToolbar = useCallback(() => null, []);
	const calendarThemeStyle = useMemo(
		() =>
			({
				"--hbe-calendar-bg": token.colorBgContainer,
				"--hbe-calendar-bg-subtle": token.colorBgLayout,
				"--hbe-calendar-bg-muted": token.colorFillAlter,
				"--hbe-calendar-bg-emphasis": token.colorBgElevated,
				"--hbe-calendar-border": token.colorBorderSecondary,
				"--hbe-calendar-text": token.colorText,
				"--hbe-calendar-text-secondary": token.colorTextSecondary,
				"--hbe-calendar-text-tertiary": token.colorTextTertiary,
				"--hbe-calendar-primary": token.colorPrimary,
				"--hbe-calendar-primary-soft": token.colorPrimaryBg,
				"--hbe-calendar-primary-soft-strong": token.colorPrimaryBorder,
				"--hbe-calendar-event-shadow": token.boxShadowSecondary,
				"--hbe-calendar-overlay":
					token.colorBgMask && token.colorBgMask !== "rgba(0, 0, 0, 0.45)"
						? token.colorBgMask
						: "rgba(0, 0, 0, 0.55)",
			}) as CSSProperties,
		[token],
	);

	return (
		<div
			className="hbe-settings-booking-view hbe-settings-calendar-theme"
			style={{
				...calendarThemeStyle,
				display: "flex",
				flex: 1,
				minHeight: 0,
				overflow: "hidden",
			}}
		>
			<div
				className="hbe-settings-booking-main"
				style={{
					flex: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: token.colorBgContainer,
				}}
			>
				{error && (
					<div style={{ padding: 16, paddingBottom: 0 }}>
						<Alert type="error" showIcon message={error} />
					</div>
				)}

				<div style={{ position: "relative", flex: 1, minHeight: 0 }}>
					<DnDCalendar
						localizer={localizer}
						events={events}
						view={view as View}
						date={selectedDate.toDate()}
						onView={(nextView) => onViewChange(nextView as ViewOption)}
						onNavigate={(nextDate) => onNavigate(dayjs(nextDate))}
						selectable
						resizable
						onSelectSlot={handleSelectSlot}
						onSelectEvent={handleSelectEvent}
						onEventDrop={handleEventDrop}
						onEventResize={handleEventResize}
						eventPropGetter={eventPropGetter}
						formats={formats}
						step={30}
						timeslots={2}
						min={new Date(0, 0, 0, 5, 0)}
						max={new Date(0, 0, 0, 21, 0)}
						culture={getCalendarCulture()}
						components={{ toolbar: EmptyToolbar }}
						style={{ flex: 1, minHeight: 0 }}
					/>

					{loading && (
						<FlexOverlay>
							<Spin size="large" />
						</FlexOverlay>
					)}
				</div>
			</div>

			<RightPanel events={events} visible={rightPanelVisible} />

			{modalOpen && (
				<div
					aria-hidden="true"
					onClick={closeModal}
					style={{
						position: "fixed",
						inset: 0,
						background: token.colorBgMask,
						zIndex: BOOKING_MODAL_Z_INDEX - 1,
					}}
				/>
			)}

			<BookingModal
				open={modalOpen}
				confirmLoading={saving}
				deleting={deleting}
				selectedEvent={selectedEvent}
				hasPendingSlot={!!pendingSlot}
				use24h={use24h}
				form={form}
				onOk={handleModalOk}
				onCancel={closeModal}
				onDelete={handleDelete}
			/>
		</div>
	);
}

function FlexOverlay({ children }: { children: ReactNode }) {
	return (
		<div
			className="hbe-settings-calendar-overlay"
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "var(--hbe-calendar-overlay)",
				backdropFilter: "blur(3px)",
				zIndex: 2,
				transition: "opacity 200ms ease",
			}}
		>
			{children}
		</div>
	);
}
