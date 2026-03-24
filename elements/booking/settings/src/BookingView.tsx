import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	DatePicker,
	Form,
	Input,
	List,
	Modal,
	Space,
	Spin,
	TimePicker,
	Typography,
	theme,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import "./BookingCalendar.css";

dayjs.extend(isoWeek);

const { Text } = Typography;
const localizer = dayjsLocalizer(dayjs);
const DnDCalendar = withDragAndDrop(Calendar);

export type ViewOption = "week" | "day" | "month" | "agenda";

interface HBricksWindow {
	hBricksAdmin?: {
		restUrl?: string;
		restNonce?: string;
	};
	__hBricksNewBooking?: () => void;
}

declare global {
	interface Window extends HBricksWindow {}
}

export interface BookingEvent {
	id: string;
	title: string;
	description?: string;
	start: Date;
	end: Date;
	color?: string;
	status?: string;
	calendarId?: number;
	timezone?: string;
}

interface BookingApiItem {
	id: number;
	calendarId: number;
	title: string;
	description?: string;
	start: string;
	end: string;
	status: string;
	timezone?: string;
}

interface BookingPayload {
	title: string;
	description: string;
	start: string;
	end: string;
	timezone: string;
}

interface SlotInfo {
	start: Date;
	end: Date;
}

interface BookingFormValues {
	name: string;
	description: string;
	date: Dayjs;
	startTime: Dayjs;
	endTime: Dayjs;
}

interface FetchRange {
	start: string;
	end: string;
}

const EVENT_COLORS = [
	"#1677ff",
	"#52c41a",
	"#722ed1",
	"#fa8c16",
	"#eb2f96",
	"#13c2c2",
];

function getAdminApiConfig() {
	const rootElement = document.getElementById("h-bricks-admin-root");
	const rootDatasetUrl = rootElement?.getAttribute("data-rest-url") ?? "";
	const rootDatasetNonce = rootElement?.getAttribute("data-rest-nonce") ?? "";
	const inferredBase = window.location.pathname.split("/wp-admin/")[0] ?? "";
	const inferredRestUrl = `${window.location.origin}${inferredBase}/wp-json/hbe/v1/`;

	return {
		restUrl: window.hBricksAdmin?.restUrl || rootDatasetUrl || inferredRestUrl,
		restNonce: window.hBricksAdmin?.restNonce || rootDatasetNonce || "",
	};
}

function getClientTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}

function buildFormValues(
	start: Date,
	end: Date,
	name = "",
	description = "",
): BookingFormValues {
	return {
		name,
		description,
		date: dayjs(start),
		startTime: dayjs(start),
		endTime: dayjs(end),
	};
}

function combineDateAndTime(dateValue: Dayjs, timeValue: Dayjs): Date {
	return dateValue
		.hour(timeValue.hour())
		.minute(timeValue.minute())
		.second(0)
		.millisecond(0)
		.toDate();
}

function getFetchRange(selectedDate: Dayjs, view: ViewOption): FetchRange {
	if (view === "day") {
		return {
			start: selectedDate.startOf("day").subtract(1, "day").toISOString(),
			end: selectedDate.endOf("day").add(1, "day").toISOString(),
		};
	}

	if (view === "week") {
		return {
			start: selectedDate.startOf("isoWeek").subtract(7, "day").toISOString(),
			end: selectedDate.endOf("isoWeek").add(7, "day").toISOString(),
		};
	}

	if (view === "month") {
		return {
			start: selectedDate
				.startOf("month")
				.startOf("week")
				.subtract(7, "day")
				.toISOString(),
			end: selectedDate.endOf("month").endOf("week").add(7, "day").toISOString(),
		};
	}

	return {
		start: selectedDate.startOf("day").subtract(14, "day").toISOString(),
		end: selectedDate.endOf("day").add(30, "day").toISOString(),
	};
}

function mergeRanges(primaryRange: FetchRange, secondaryRange: FetchRange): FetchRange {
	const primaryStart = dayjs(primaryRange.start);
	const primaryEnd = dayjs(primaryRange.end);
	const secondaryStart = dayjs(secondaryRange.start);
	const secondaryEnd = dayjs(secondaryRange.end);

	return {
		start: (primaryStart.isBefore(secondaryStart) ? primaryStart : secondaryStart).toISOString(),
		end: (primaryEnd.isAfter(secondaryEnd) ? primaryEnd : secondaryEnd).toISOString(),
	};
}

function getOverviewRange(): FetchRange {
	return {
		start: dayjs().startOf("day").toISOString(),
		end: dayjs().add(1, "week").endOf("isoWeek").toISOString(),
	};
}

function getEventColor(id: string | number): string {
	const stringValue = String(id);
	const hash = Array.from(stringValue).reduce(
		(total, character) => total + character.charCodeAt(0),
		0,
	);

	return EVENT_COLORS[hash % EVENT_COLORS.length];
}

function toBookingEvent(item: BookingApiItem): BookingEvent {
	return {
		id: String(item.id),
		title: item.title,
		description: item.description ?? "",
		start: new Date(item.start),
		end: new Date(item.end),
		color: getEventColor(item.id),
		status: item.status,
		calendarId: item.calendarId,
		timezone: item.timezone ?? "UTC",
	};
}

function sortEvents(events: BookingEvent[]): BookingEvent[] {
	return [...events].sort((left, right) => left.start.getTime() - right.start.getTime());
}

function upsertEvent(events: BookingEvent[], nextEvent: BookingEvent): BookingEvent[] {
	return sortEvents([
		...events.filter((event) => event.id !== nextEvent.id),
		nextEvent,
	]);
}

function toBookingPayload(values: BookingFormValues): BookingPayload {
	const start = combineDateAndTime(values.date, values.startTime);
	const end = combineDateAndTime(values.date, values.endTime);

	return {
		title: values.name.trim(),
		description: values.description.trim(),
		start: start.toISOString(),
		end: end.toISOString(),
		timezone: getClientTimezone(),
	};
}

async function fetchBookingsRequest(
	calendarId: number,
	range: FetchRange,
): Promise<BookingApiItem[]> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const query = new URLSearchParams({
		start: range.start,
		end: range.end,
	});
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings?${query.toString()}`,
		{
			method: "GET",
			headers: {
				"X-WP-Nonce": restNonce,
			},
		},
	);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Bookings could not be loaded.",
		);
	}

	return Array.isArray(data?.items) ? (data.items as BookingApiItem[]) : [];
}

async function createBookingRequest(
	calendarId: number,
	payload: BookingPayload,
): Promise<BookingApiItem> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(`${restUrl}admin/calendars/${calendarId}/bookings`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-WP-Nonce": restNonce,
		},
		body: JSON.stringify(payload),
	});
	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Booking could not be created.",
		);
	}

	return data.item as BookingApiItem;
}

async function updateBookingRequest(
	calendarId: number,
	bookingId: number,
	payload: BookingPayload,
): Promise<BookingApiItem> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings/${bookingId}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-WP-Nonce": restNonce,
			},
			body: JSON.stringify(payload),
		},
	);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Booking could not be updated.",
		);
	}

	return data.item as BookingApiItem;
}

async function deleteBookingRequest(
	calendarId: number,
	bookingId: number,
): Promise<void> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/bookings/${bookingId}`,
		{
			method: "DELETE",
			headers: {
				"X-WP-Nonce": restNonce,
			},
		},
	);

	if (response.ok) {
		return;
	}

	const data = await response.json();
	throw new Error(
		typeof data?.message === "string"
			? data.message
			: "Booking could not be deleted.",
	);
}

function RightPanel({
	events,
	visible,
}: {
	events: BookingEvent[];
	visible: boolean;
}) {
	const { token } = theme.useToken();
	const todayEvents = sortEvents(
		events.filter((event) => dayjs(event.start).isSame(dayjs(), "day")),
	);
	const nextWeekBoundary = dayjs().add(1, "week").endOf("isoWeek");
	const upcomingEvents = sortEvents(
		events.filter(
			(event) =>
				dayjs(event.start).isAfter(dayjs().endOf("day")) &&
				(dayjs(event.start).isBefore(nextWeekBoundary) ||
					dayjs(event.start).isSame(nextWeekBoundary, "minute")),
		),
	);

	return (
		<div
			style={{
				width: visible ? 260 : 0,
				flexShrink: 0,
				height: "100%",
				borderLeft: visible
					? `1px solid ${token.colorBorderSecondary}`
					: "none",
				background: token.colorBgContainer,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		>
			<div
				style={{
					width: 260,
					height: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div
					style={{
						padding: "14px 16px",
						borderBottom: `1px solid ${token.colorBorderSecondary}`,
						flexShrink: 0,
					}}
				>
					<Text strong style={{ fontSize: 14 }}>
						Overview
					</Text>
				</div>

				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: 16,
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<div>
						<div style={{ marginBottom: 12 }}>
							<Text strong style={{ fontSize: 13 }}>
								<ClockCircleOutlined
									style={{ color: token.colorPrimary, marginRight: 12 }}
								/>
								Today
							</Text>
						</div>

						<Space direction="vertical" style={{ width: "100%" }} size={8}>
							{todayEvents.map((event) => (
								<Card
									key={event.id}
									size="small"
									bordered={false}
									style={{
										background: token.colorFillAlter,
										borderLeft: `3px solid ${event.color ?? token.colorPrimary}`,
										borderRadius: token.borderRadius,
									}}
								>
									<Text strong style={{ fontSize: 12, display: "block" }}>
										{event.title}
									</Text>
									<Text
										style={{
											fontSize: 11,
											color: token.colorTextTertiary,
										}}
									>
										{dayjs(event.start).format("HH:mm")} –{" "}
										{dayjs(event.end).format("HH:mm")}
									</Text>
									{event.description && (
										<Text
											style={{
												display: "block",
												fontSize: 11,
												marginTop: 4,
												color: token.colorTextSecondary,
											}}
										>
											{event.description}
										</Text>
									)}
								</Card>
							))}
							{todayEvents.length === 0 && (
								<Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
									No bookings today
								</Text>
							)}
						</Space>
					</div>

					<div>
						<div>
							<Text strong style={{ fontSize: 13 }}>
								<CheckCircleOutlined
									style={{ color: token.colorPrimary, marginRight: 12 }}
								/>
								Upcoming
							</Text>
						</div>

						<List
							dataSource={upcomingEvents}
							locale={{ emptyText: "No upcoming bookings" }}
							renderItem={(item) => (
								<List.Item
									style={{
										padding: "8px 0",
										borderBottom: `1px solid ${token.colorBorderSecondary}`,
									}}
								>
									<List.Item.Meta
										avatar={<Badge color={item.color} />}
										title={
											<Text style={{ fontSize: 12, fontWeight: 600 }}>
												{item.title}
											</Text>
										}
										description={
											<Text
												style={{
													fontSize: 11,
													color: token.colorTextTertiary,
												}}
											>
												{dayjs(item.start).format("ddd, DD.MM. HH:mm")}
											</Text>
										}
									/>
								</List.Item>
							)}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export function BookingView({
	calendarId,
	rightPanelVisible,
	selectedDate,
	view,
	use24h,
	onViewChange,
	onNavigate,
}: {
	calendarId: number;
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
			return;
		}

		setLoading(true);

		try {
			const items = await fetchBookingsRequest(calendarId, fetchRange);
			setEvents(sortEvents(items.map(toBookingEvent)));
			setError("");
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Bookings could not be loaded.",
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
			setPendingSlot(slot);
			setSelectedEvent(null);
			form.setFieldsValue(buildFormValues(slot.start, slot.end));
			setModalOpen(true);
		},
		[form],
	);

	useEffect(() => {
		void loadBookings();
	}, [loadBookings]);

	useEffect(() => {
		closeModal();
	}, [calendarId, closeModal]);

	useEffect(() => {
		window.__hBricksNewBooking = () => {
			openNewBooking({
				start: selectedDate
					.hour(9)
					.minute(0)
					.second(0)
					.millisecond(0)
					.toDate(),
				end: selectedDate
					.hour(10)
					.minute(0)
					.second(0)
					.millisecond(0)
					.toDate(),
			});
		};

		return () => {
			delete window.__hBricksNewBooking;
		};
	}, [openNewBooking, selectedDate]);

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
			try {
				const updatedItem = await updateBookingRequest(calendarId, Number(event.id), {
					title: event.title,
					description: event.description ?? "",
					start: start.toISOString(),
					end: end.toISOString(),
					timezone: event.timezone ?? getClientTimezone(),
				});
				setEvents((currentEvents) =>
					upsertEvent(currentEvents, toBookingEvent(updatedItem)),
				);
				setError("");
			} catch (saveError) {
				setError(
					saveError instanceof Error
						? saveError.message
						: "Booking could not be updated.",
				);
				void loadBookings();
			}
		},
		[calendarId, loadBookings],
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
						errors: ["End time must be after start time."],
					},
				]);
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
			if (saveError && typeof saveError === "object" && "errorFields" in saveError) {
				return;
			}

			setError(
				saveError instanceof Error
					? saveError.message
					: "Booking could not be saved.",
			);
		} finally {
			setSaving(false);
		}
	}, [calendarId, closeModal, form, selectedEvent]);

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
					: "Booking could not be deleted.",
			);
		} finally {
			setDeleting(false);
		}
	}, [calendarId, closeModal, selectedEvent]);

	const eventPropGetter = useCallback(
		(event: BookingEvent) => ({
			style: {
				backgroundColor: event.color ?? "#1677ff",
				borderColor: "transparent",
				borderRadius: "6px",
				color: "#fff",
				fontSize: "12px",
				fontWeight: 600,
				boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
				padding: "2px 6px",
			},
		}),
		[],
	);

	const EmptyToolbar = useCallback(() => null, []);

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				minHeight: 0,
				overflow: "hidden",
			}}
		>
			<div
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
						culture="de"
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

			<Modal
				title={selectedEvent ? "Edit Booking" : "New Booking"}
				open={modalOpen}
				onOk={() => void handleModalOk()}
				onCancel={closeModal}
				confirmLoading={saving}
				footer={
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						{selectedEvent ? (
							<Button danger onClick={() => void handleDelete()} loading={deleting}>
								Delete
							</Button>
						) : (
							<span />
						)}
						<Space>
							<Button onClick={closeModal} disabled={saving || deleting}>
								Cancel
							</Button>
							<Button
								type="primary"
								onClick={() => void handleModalOk()}
								loading={saving}
							>
								{selectedEvent ? "Save" : "Create"}
							</Button>
						</Space>
					</div>
				}
			>
				<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
					<Form.Item
						name="name"
						label="Name"
						rules={[{ required: true, message: "Please enter a name." }]}
					>
						<Input placeholder="Booking name" autoFocus />
					</Form.Item>

					<Form.Item
						name="description"
						label="Short Description"
						rules={[
							{ required: true, message: "Please enter a short description." },
						]}
					>
						<Input.TextArea
							placeholder="Short description"
							autoSize={{ minRows: 2, maxRows: 4 }}
							maxLength={180}
							showCount
						/>
					</Form.Item>

					<Form.Item
						name="date"
						label="Date"
						rules={[{ required: true, message: "Please choose a date." }]}
					>
						<DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
					</Form.Item>

					<Space direction="horizontal" size={12} wrap style={{ width: "100%" }}>
						<Form.Item
							name="startTime"
							label="From"
							rules={[{ required: true, message: "Please choose a start time." }]}
							style={{ minWidth: 160, flex: 1 }}
						>
							<TimePicker
								format={use24h ? "HH:mm" : "h:mm A"}
								use12Hours={!use24h}
								minuteStep={15}
								style={{ width: "100%" }}
							/>
						</Form.Item>

						<Form.Item
							name="endTime"
							label="To"
							rules={[{ required: true, message: "Please choose an end time." }]}
							style={{ minWidth: 160, flex: 1 }}
						>
							<TimePicker
								format={use24h ? "HH:mm" : "h:mm A"}
								use12Hours={!use24h}
								minuteStep={15}
								style={{ width: "100%" }}
							/>
						</Form.Item>
					</Space>

					{(selectedEvent || pendingSlot) && (
						<Text type="secondary" style={{ display: "block" }}>
							{selectedEvent
								? "Adjust time or details directly here."
								: "You can fine-tune the date and time before creating the booking."}
						</Text>
					)}
				</Form>
			</Modal>
		</div>
	);
}

function FlexOverlay({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(255,255,255,0.55)",
				backdropFilter: "blur(1px)",
				zIndex: 2,
			}}
		>
			{children}
		</div>
	);
}
