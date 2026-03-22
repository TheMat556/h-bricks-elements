import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import {
	Badge,
	Button,
	Card,
	Form,
	Input,
	List,
	Modal,
	Space,
	Typography,
	theme,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useCallback, useEffect, useState } from "react";
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

export interface BookingEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color?: string;
}

const EVENT_COLORS = [
	"#1677ff",
	"#52c41a",
	"#722ed1",
	"#fa8c16",
	"#eb2f96",
	"#13c2c2",
];

const INITIAL_EVENTS: BookingEvent[] = [
	{
		id: "1",
		title: "Project Kickoff",
		start: dayjs().isoWeekday(1).hour(9).minute(15).second(0).toDate(),
		end: dayjs().isoWeekday(1).hour(10).minute(30).second(0).toDate(),
		color: "#1677ff",
	},
	{
		id: "2",
		title: "Client Review",
		start: dayjs().isoWeekday(2).hour(10).minute(0).second(0).toDate(),
		end: dayjs().isoWeekday(2).hour(11).minute(0).second(0).toDate(),
		color: "#52c41a",
	},
	{
		id: "3",
		title: "Strategy Workshop",
		start: dayjs().isoWeekday(3).hour(11).minute(30).second(0).toDate(),
		end: dayjs().isoWeekday(3).hour(13).minute(0).second(0).toDate(),
		color: "#722ed1",
	},
	{
		id: "4",
		title: "All-Hands Meeting",
		start: dayjs().hour(9).minute(0).second(0).toDate(),
		end: dayjs().hour(10).minute(30).second(0).toDate(),
		color: "#1677ff",
	},
];

const UPCOMING = [
	{
		title: "Submit March Revenue Report",
		time: "Today, 4:00 PM",
		color: "#1677ff",
	},
	{ title: "Onboarding Call: J. Smith", time: "Tomorrow", color: "#52c41a" },
	{
		title: "Quarterly Planning Session",
		time: "Mon, Mar 22",
		color: "#8c8c8c",
	},
];

interface SlotInfo {
	start: Date;
	end: Date;
}

// ── Right Panel ───────────────────────────────────────────────────────────────
function RightPanel({
	events,
	visible,
}: {
	events: BookingEvent[];
	visible: boolean;
}) {
	const { token } = theme.useToken();
	const weekEvents = events.filter((e) =>
		dayjs(e.start).isSame(dayjs(), "week"),
	);
	const _totalHours =
		weekEvents.reduce(
			(acc, e) => acc + dayjs(e.end).diff(dayjs(e.start), "minute"),
			0,
		) / 60;

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
			{/* Inner wrapper keeps content from wrapping during animation */}
			<div
				style={{
					width: 260,
					height: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Header */}
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

				{/* Scrollable content */}
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
					{/* Today */}
					<div>
						<div
							style={{
								alignItems: "center",
								marginBottom: 12,
							}}
						>
							<Text
								strong
								style={{
									fontSize: 13,
								}}
							>
								<ClockCircleOutlined
									style={{ color: token.colorPrimary, marginRight: 12 }}
								/>
								Today
							</Text>
						</div>

						<Space direction="vertical" style={{ width: "100%" }} size={8}>
							{events
								.filter((e) => dayjs(e.start).isSame(dayjs(), "day"))
								.map((e) => (
									<Card
										key={e.id}
										size="small"
										bordered={false}
										style={{
											background: token.colorFillAlter,
											borderLeft: `3px solid ${e.color ?? token.colorPrimary}`,
											borderRadius: token.borderRadius,
										}}
									>
										<Text strong style={{ fontSize: 12, display: "block" }}>
											{e.title}
										</Text>
										<Text
											style={{
												fontSize: 11,
												color: token.colorTextTertiary,
											}}
										>
											{dayjs(e.start).format("HH:mm")} –{" "}
											{dayjs(e.end).format("HH:mm")}
										</Text>
									</Card>
								))}
							{events.filter((e) => dayjs(e.start).isSame(dayjs(), "day"))
								.length === 0 && (
								<Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
									No events today
								</Text>
							)}
						</Space>
					</div>

					{/* Upcoming */}
					<div>
						<div>
							<Text
								strong
								style={{
									fontSize: 13,
								}}
							>
								<CheckCircleOutlined
									style={{ color: token.colorPrimary, marginRight: 12 }}
								/>
								Upcoming
							</Text>
						</div>

						<List
							dataSource={UPCOMING}
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
												{item.time}
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

// ── BookingView ───────────────────────────────────────────────────────────────
export function BookingView({
	rightPanelVisible,
	selectedDate,
	view,
	use24h,
	onViewChange,
	onNavigate,
}: {
	rightPanelVisible: boolean;
	selectedDate: Dayjs;
	view: ViewOption;
	use24h: boolean;
	onViewChange: (v: ViewOption) => void;
	onNavigate: (d: Dayjs) => void;
}) {
	const { token } = theme.useToken();
	const [events, setEvents] = useState<BookingEvent[]>(INITIAL_EVENTS);
	const [modalOpen, setModalOpen] = useState(false);
	const [pendingSlot, setPendingSlot] = useState<SlotInfo | null>(null);
	const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
	const [form] = Form.useForm();

	// Expose new booking trigger for header button
	useEffect(() => {
		window.__hBricksNewBooking = () => {
			setPendingSlot({
				start: dayjs().hour(9).minute(0).toDate(),
				end: dayjs().hour(10).minute(0).toDate(),
			});
			setModalOpen(true);
		};
		return () => {
			delete window.__hBricksNewBooking;
		};
	}, []);

	// 12/24h formats
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

	const handleSelectSlot = useCallback((slot: SlotInfo) => {
		setPendingSlot(slot);
		setSelectedEvent(null);
		setModalOpen(true);
	}, []);

	const handleSelectEvent = useCallback(
		(event: BookingEvent) => {
			setSelectedEvent(event);
			setPendingSlot(null);
			form.setFieldsValue({ title: event.title });
			setModalOpen(true);
		},
		[form],
	);

	const handleEventDrop: withDragAndDropProps<BookingEvent>["onEventDrop"] =
		useCallback(({ event, start, end }) => {
			setEvents((prev) =>
				prev.map((e) =>
					e.id === event.id
						? { ...e, start: new Date(start), end: new Date(end) }
						: e,
				),
			);
		}, []);

	const handleEventResize: withDragAndDropProps<BookingEvent>["onEventResize"] =
		useCallback(({ event, start, end }) => {
			setEvents((prev) =>
				prev.map((e) =>
					e.id === event.id
						? { ...e, start: new Date(start), end: new Date(end) }
						: e,
				),
			);
		}, []);

	const handleModalOk = () => {
		form.validateFields().then((values) => {
			if (selectedEvent) {
				setEvents((prev) =>
					prev.map((e) =>
						e.id === selectedEvent.id ? { ...e, title: values.title } : e,
					),
				);
			} else if (pendingSlot) {
				const color =
					EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
				setEvents((prev) => [
					...prev,
					{
						id: Date.now().toString(),
						title: values.title,
						start: pendingSlot.start,
						end: pendingSlot.end,
						color,
					},
				]);
			}
			setModalOpen(false);
			form.resetFields();
			setPendingSlot(null);
			setSelectedEvent(null);
		});
	};

	const handleModalCancel = () => {
		setModalOpen(false);
		form.resetFields();
		setPendingSlot(null);
		setSelectedEvent(null);
	};

	const handleDelete = () => {
		if (!selectedEvent) return;
		setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
		setModalOpen(false);
		form.resetFields();
		setSelectedEvent(null);
	};

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
			{/* ── Calendar ── */}
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
				<DnDCalendar
					localizer={localizer}
					events={events}
					view={view as View}
					date={selectedDate.toDate()}
					onView={(v) => onViewChange(v as ViewOption)}
					onNavigate={(d) => onNavigate(dayjs(d))}
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
			</div>

			{/* ── Right panel with slide animation ── */}
			<RightPanel events={events} visible={rightPanelVisible} />

			{/* ── Modal ── */}
			<Modal
				title={
					selectedEvent
						? "Edit Booking"
						: pendingSlot
							? `New — ${dayjs(pendingSlot.start).format(
									use24h ? "ddd D. MMM, HH:mm" : "ddd D. MMM, h:mm A",
								)} – ${dayjs(pendingSlot.end).format(use24h ? "HH:mm" : "h:mm A")}`
							: "New Booking"
				}
				open={modalOpen}
				onOk={handleModalOk}
				onCancel={handleModalCancel}
				footer={
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						{selectedEvent ? (
							<Button danger onClick={handleDelete}>
								Delete
							</Button>
						) : (
							<span />
						)}
						<Space>
							<Button onClick={handleModalCancel}>Cancel</Button>
							<Button type="primary" onClick={handleModalOk}>
								{selectedEvent ? "Save" : "Create"}
							</Button>
						</Space>
					</div>
				}
			>
				<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
					<Form.Item
						name="title"
						label="Title"
						rules={[{ required: true, message: "Please enter a title" }]}
					>
						<Input placeholder="Booking title" autoFocus />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}
