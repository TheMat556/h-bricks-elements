import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Divider,
	Empty,
	Form,
	Input,
	InputNumber,
	Layout,
	List,
	Menu,
	Row,
	Segmented,
	Select,
	Space,
	Spin,
	Switch,
	Tag,
	Typography,
} from "antd";
import type { MenuProps } from "antd";

import {
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

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const weekdayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const bookingModes = [
	{ label: "Buchungen", value: "bookings" },
	{ label: "Einstellungen", value: "settings" },
] as const;
const statusOptions: Booking["status"][] = ["pending", "confirmed", "cancelled", "completed"];

function emptyCalendarPayload(name = "Neuer Kalender") {
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

function emptyServicePayload(calendarId: number): Partial<Service> {
	return {
		calendarId,
		name: "",
		description: "",
		color: "#1f7ae0",
		isPublic: true,
		sortOrder: 0,
	};
}

function getStatusColor(status: Booking["status"]) {
	switch (status) {
		case "confirmed":
			return "green";
		case "cancelled":
			return "red";
		case "completed":
			return "blue";
		default:
			return "gold";
	}
}

function formatDateInput(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(input: string) {
	const date = new Date(`${input}T00:00:00`);
	const day = (date.getDay() + 6) % 7;
	date.setDate(date.getDate() - day);
	return date;
}

function endOfWeek(input: string) {
	const date = startOfWeek(input);
	date.setDate(date.getDate() + 6);
	return date;
}

function isDateInScope(date: string, selectedDate: string, scope: "day" | "week") {
	if (scope === "day") {
		return date === selectedDate;
	}

	const current = new Date(`${date}T00:00:00`).getTime();
	return current >= startOfWeek(selectedDate).getTime() && current <= endOfWeek(selectedDate).getTime();
}

export function App() {
	const [mode, setMode] = useState<(typeof bookingModes)[number]["value"]>("bookings");
	const [calendars, setCalendars] = useState<CalendarSettings[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(null);
	const [selectedBookingNode, setSelectedBookingNode] = useState<string>("overview");
	const [calendarForm, setCalendarForm] = useState<CalendarSettings | null>(null);
	const [serviceForm, setServiceForm] = useState<Partial<Service>>({});
	const [bookingScope, setBookingScope] = useState<"day" | "week">("day");
	const [bookingDate, setBookingDate] = useState<string>(formatDateInput());
	const [statusMessage, setStatusMessage] = useState<string>("");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const selectedCalendar = useMemo(
		() => calendars.find((calendar) => calendar.id === selectedCalendarId) ?? null,
		[calendars, selectedCalendarId],
	);

	const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

	const bookingSidebarItems = useMemo<MenuProps["items"]>(() => {
		const overviewCount = bookings.length;
		const serviceItems = services.map((service) => ({
			key: `service-${service.id}`,
			label: `${service.name} (${bookings.filter((booking) => booking.serviceId === service.id).length})`,
		}));

		return [
			{ key: "overview", label: `Alle Buchungen (${overviewCount})` },
			...serviceItems,
		];
	}, [bookings, services]);

	const settingsSidebarItems = useMemo<MenuProps["items"]>(() => {
		return calendars.map((calendar) => ({
			key: String(calendar.id),
			label: calendar.name,
		}));
	}, [calendars]);

	const visibleBookings = useMemo(() => {
		const filteredBySidebar = selectedBookingNode.startsWith("service-")
			? bookings.filter((booking) => booking.serviceId === Number(selectedBookingNode.replace("service-", "")))
			: bookings;

		return filteredBySidebar.filter((booking) => isDateInScope(booking.date, bookingDate, bookingScope));
	}, [bookingDate, bookingScope, bookings, selectedBookingNode]);

	const groupedBookings = useMemo(() => {
		return visibleBookings.reduce<Record<string, Booking[]>>((groups, booking) => {
			groups[booking.date] ??= [];
			groups[booking.date].push(booking);
			return groups;
		}, {});
	}, [visibleBookings]);

	useEffect(() => {
		void refreshAll();
	}, []);

	useEffect(() => {
		if (!selectedCalendarId) {
			setCalendarForm(null);
			setServiceForm({});
			return;
		}

		const calendar = calendars.find((entry) => entry.id === selectedCalendarId) ?? null;
		setCalendarForm(calendar ? structuredClone(calendar) : null);
		setServiceForm(emptyServicePayload(selectedCalendarId));
	}, [calendars, selectedCalendarId]);

	async function refreshAll() {
		setLoading(true);
		setErrorMessage("");
		try {
			const calendarItems = await getCalendars();
			const serviceGroups = await Promise.all(calendarItems.map((calendar) => getServices(calendar.id)));
			const bookingItems = await getBookings();
			setCalendars(calendarItems);
			setServices(serviceGroups.flat());
			setBookings(bookingItems);
			setSelectedCalendarId((current) => current ?? calendarItems[0]?.id ?? null);
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Daten konnten nicht geladen werden.");
		} finally {
			setLoading(false);
		}
	}

	async function handleCreateCalendar() {
		setSaving(true);
		setErrorMessage("");
		setStatusMessage("");
		try {
			const created = await createCalendar(emptyCalendarPayload(`Kalender ${calendars.length + 1}`));
			setCalendars((current) => [...current, created]);
			setSelectedCalendarId(created.id);
			setMode("settings");
			setStatusMessage("Kalender erstellt.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Kalender konnte nicht erstellt werden.");
		} finally {
			setSaving(false);
		}
	}

	async function handleSaveCalendar() {
		if (!calendarForm) return;
		setSaving(true);
		setErrorMessage("");
		setStatusMessage("");
		try {
			const updated = await updateCalendar(calendarForm.id, calendarForm);
			setCalendars((current) => current.map((item) => (item.id === updated.id ? updated : item)));
			setCalendarForm(updated);
			setStatusMessage("Kalendereinstellungen gespeichert.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Kalender konnte nicht gespeichert werden.");
		} finally {
			setSaving(false);
		}
	}

	async function handleSaveService() {
		if (!selectedCalendarId || !serviceForm.name) return;
		setSaving(true);
		setErrorMessage("");
		setStatusMessage("");
		try {
			let saved: Service;
			if (serviceForm.id) {
				saved = await updateService(serviceForm.id, serviceForm);
				setServices((current) => current.map((item) => (item.id === saved.id ? saved : item)));
				setStatusMessage("Service aktualisiert.");
			} else {
				saved = await createService(selectedCalendarId, serviceForm as Service & { name: string });
				setServices((current) => [...current, saved]);
				setStatusMessage("Service erstellt.");
			}

			setServiceForm(emptyServicePayload(selectedCalendarId));
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Service konnte nicht gespeichert werden.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteService(id: number) {
		setSaving(true);
		setErrorMessage("");
		setStatusMessage("");
		try {
			await deleteService(id);
			setServices((current) => current.filter((service) => service.id !== id));
			setStatusMessage("Service gelöscht.");
			if (selectedCalendarId) {
				setServiceForm(emptyServicePayload(selectedCalendarId));
			}
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Service konnte nicht gelöscht werden.");
		} finally {
			setSaving(false);
		}
	}

	async function handleStatusChange(id: number, status: Booking["status"]) {
		setErrorMessage("");
		setStatusMessage("");
		try {
			const updated = await updateBookingStatus(id, status);
			setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)));
			setStatusMessage("Buchungsstatus aktualisiert.");
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Status konnte nicht aktualisiert werden.");
		}
	}

	const currentCalendarServices = selectedCalendarId ? services.filter((service) => service.calendarId === selectedCalendarId) : [];

	return (
		<Layout className="hbe-admin-layout-root">
			<Sider width={300} className="hbe-admin-sider">
				<div className="hbe-sider-inner">
					<Segmented
						block
						size="large"
						options={bookingModes.map((item) => ({ label: item.label, value: item.value }))}
						value={mode}
						onChange={(value) => setMode(value as "bookings" | "settings")}
					/>
					<Divider className="hbe-sider-divider" />

					{mode === "settings" ? (
						<>
							<Space direction="vertical" size="middle" style={{ width: "100%" }}>
								<Button type="primary" block onClick={() => void handleCreateCalendar()} loading={saving}>
									Neuen Kalender anlegen
								</Button>
								<Menu
									mode="inline"
									selectedKeys={selectedCalendarId ? [String(selectedCalendarId)] : []}
									items={settingsSidebarItems}
									onClick={({ key }) => setSelectedCalendarId(Number(key))}
								/>
							</Space>
						</>
					) : (
						<Menu mode="inline" selectedKeys={[selectedBookingNode]} items={bookingSidebarItems} onClick={({ key }) => setSelectedBookingNode(key)} />
					)}
				</div>
			</Sider>

			<Layout>
				<Content className="hbe-admin-content">
					<div className="hbe-admin-header">
						<div>
							<Title level={2}>{mode === "settings" ? "Einstellungen" : "Buchungen"}</Title>
							<Paragraph type="secondary">
								{mode === "settings"
									? "Kalender verwalten und dazugehörige Einstellungen pflegen."
									: "Übersicht aller Buchungen mit Aufschlüsselung nach Services."}
							</Paragraph>
						</div>
						<Button onClick={() => void refreshAll()} loading={loading}>
							Aktualisieren
						</Button>
					</div>

					{errorMessage ? <Alert type="error" message={errorMessage} showIcon closable /> : null}
					{statusMessage ? <Alert type="success" message={statusMessage} showIcon closable /> : null}

					{loading ? (
						<div className="hbe-admin-spinner">
							<Spin size="large" />
						</div>
					) : mode === "settings" ? (
						selectedCalendar && calendarForm ? (
							<Space direction="vertical" size="large" style={{ width: "100%" }}>
								<Card
									title={selectedCalendar.name}
									extra={
										<Button type="primary" onClick={() => void handleSaveCalendar()} loading={saving}>
											Speichern
										</Button>
									}
								>
									<Row gutter={[16, 16]}>
										<Col xs={24} md={12}>
											<Form layout="vertical">
												<Form.Item label="Name">
													<Input value={calendarForm.name} onChange={(event) => setCalendarForm({ ...calendarForm, name: event.target.value })} />
												</Form.Item>
												<Form.Item label="Zeitzone">
													<Input value={calendarForm.timezone} onChange={(event) => setCalendarForm({ ...calendarForm, timezone: event.target.value })} />
												</Form.Item>
												<Form.Item label="Ausnahmetage (Komma-getrennt)">
													<Input
														value={calendarForm.exceptionDays.join(", ")}
														onChange={(event) =>
															setCalendarForm({
																...calendarForm,
																exceptionDays: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean),
															})
														}
													/>
												</Form.Item>
											</Form>
										</Col>
										<Col xs={24} md={12}>
											<Row gutter={[12, 12]}>
												<Col span={12}>
													<Card size="small">
														<Text type="secondary">Slot-Dauer</Text>
														<InputNumber min={5} value={calendarForm.slotDuration} onChange={(value) => setCalendarForm({ ...calendarForm, slotDuration: Number(value ?? 30) })} style={{ width: "100%" }} />
													</Card>
												</Col>
												<Col span={12}>
													<Card size="small">
														<Text type="secondary">Puffer</Text>
														<InputNumber min={0} value={calendarForm.slotBuffer} onChange={(value) => setCalendarForm({ ...calendarForm, slotBuffer: Number(value ?? 0) })} style={{ width: "100%" }} />
													</Card>
												</Col>
												<Col span={12}>
													<Card size="small">
														<Text type="secondary">Vorlauf (Std.)</Text>
														<InputNumber min={0} value={calendarForm.leadTimeHours} onChange={(value) => setCalendarForm({ ...calendarForm, leadTimeHours: Number(value ?? 0) })} style={{ width: "100%" }} />
													</Card>
												</Col>
												<Col span={12}>
													<Card size="small">
														<Text type="secondary">Buchungsfenster</Text>
														<InputNumber min={1} value={calendarForm.bookingWindowDays} onChange={(value) => setCalendarForm({ ...calendarForm, bookingWindowDays: Number(value ?? 60) })} style={{ width: "100%" }} />
													</Card>
												</Col>
												<Col span={24}>
													<Card size="small">
														<Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
															<Text>Automatisch bestätigen</Text>
															<Switch checked={calendarForm.autoConfirm} onChange={(checked) => setCalendarForm({ ...calendarForm, autoConfirm: checked })} />
														</Space>
													</Card>
												</Col>
											</Row>
										</Col>
									</Row>
								</Card>

								<Card title="Wochentage">
									<List
										dataSource={weekdayOrder as unknown as string[]}
										renderItem={(day) => {
											const config = calendarForm.weekdays[day];
											return (
												<List.Item>
													<Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
														<Space>
															<Switch
																checked={config.enabled}
																onChange={(checked) =>
																	setCalendarForm({
																		...calendarForm,
																		weekdays: { ...calendarForm.weekdays, [day]: { ...config, enabled: checked } },
																	})
																}
															/>
															<Text strong>{day}</Text>
														</Space>
														<Space>
															<Input value={config.from} style={{ width: 110 }} onChange={(event) => setCalendarForm({ ...calendarForm, weekdays: { ...calendarForm.weekdays, [day]: { ...config, from: event.target.value } } })} />
															<Input value={config.to} style={{ width: 110 }} onChange={(event) => setCalendarForm({ ...calendarForm, weekdays: { ...calendarForm.weekdays, [day]: { ...config, to: event.target.value } } })} />
														</Space>
													</Space>
												</List.Item>
											);
										}}
									/>
								</Card>

								<Card title="Services">
									<Row gutter={[16, 16]}>
										<Col xs={24} md={10}>
											<Form layout="vertical">
												<Form.Item label="Name">
													<Input value={serviceForm.name ?? ""} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} />
												</Form.Item>
												<Form.Item label="Beschreibung">
													<Input.TextArea rows={4} value={serviceForm.description ?? ""} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} />
												</Form.Item>
												<Form.Item label="Farbe">
													<Input value={serviceForm.color ?? "#1f7ae0"} onChange={(event) => setServiceForm({ ...serviceForm, color: event.target.value })} />
												</Form.Item>
												<Form.Item label="Sortierung">
													<InputNumber min={0} value={serviceForm.sortOrder ?? 0} onChange={(value) => setServiceForm({ ...serviceForm, sortOrder: Number(value ?? 0) })} style={{ width: "100%" }} />
												</Form.Item>
												<Form.Item label="Öffentlich buchbar">
													<Switch checked={Boolean(serviceForm.isPublic)} onChange={(checked) => setServiceForm({ ...serviceForm, isPublic: checked })} />
												</Form.Item>
												<Space>
													<Button type="primary" onClick={() => void handleSaveService()} loading={saving}>
														{serviceForm.id ? "Service aktualisieren" : "Service anlegen"}
													</Button>
													<Button onClick={() => setServiceForm(emptyServicePayload(selectedCalendar.id))}>Reset</Button>
												</Space>
											</Form>
										</Col>
										<Col xs={24} md={14}>
											<List
												dataSource={currentCalendarServices}
												renderItem={(service) => (
													<List.Item
														actions={[
															<Button key="edit" type="link" onClick={() => setServiceForm(service)}>
																Bearbeiten
															</Button>,
															<Button key="delete" danger type="link" onClick={() => void handleDeleteService(service.id)}>
																Löschen
															</Button>,
														]}
													>
														<List.Item.Meta
															title={
																<Space>
																	<Tag color={service.color || "blue"}>{service.name}</Tag>
																	{service.isPublic ? <Badge status="success" text="Öffentlich" /> : <Badge status="default" text="Intern" />}
																</Space>
															}
															description={service.description || "Keine Beschreibung"}
														/>
													</List.Item>
												)}
											/>
										</Col>
									</Row>
								</Card>

								<Card title="Benachrichtigungen">
									<Alert
										type="warning"
										showIcon
										message="E-Mail-Bestätigungen und Admin-Benachrichtigungen sind im UI-Konzept eingeplant, aber backendseitig noch nicht fertig verdrahtet."
									/>
								</Card>
							</Space>
						) : (
							<Card>
								<Empty description="Noch kein Kalender vorhanden" />
							</Card>
						)
					) : (
						<Space direction="vertical" size="large" style={{ width: "100%" }}>
							<Card>
								<Space align="center" wrap style={{ width: "100%", justifyContent: "space-between" }}>
									<div>
										<Title level={4} style={{ margin: 0 }}>
											{selectedBookingNode === "overview"
												? "Alle Buchungen"
												: serviceById.get(Number(selectedBookingNode.replace("service-", "")))?.name ?? "Service"}
										</Title>
										<Text type="secondary">Tages- oder Wochenansicht für Buchungen.</Text>
									</div>
									<Space wrap>
										<Segmented value={bookingScope} options={[{ label: "Tag", value: "day" }, { label: "Woche", value: "week" }]} onChange={(value) => setBookingScope(value as "day" | "week")} />
										<input type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
									</Space>
								</Space>
							</Card>

							{Object.entries(groupedBookings).length ? (
								Object.entries(groupedBookings)
									.sort(([left], [right]) => left.localeCompare(right))
									.map(([date, dayBookings]) => (
										<Card key={date} title={date} extra={<Tag>{dayBookings.length} Termine</Tag>}>
											<List
												dataSource={dayBookings.sort((left, right) => left.timeStart.localeCompare(right.timeStart))}
												renderItem={(booking) => (
													<List.Item
														actions={[
															<Select
																key="status"
																style={{ width: 150 }}
																value={booking.status}
																onChange={(value) => void handleStatusChange(booking.id, value as Booking["status"])}
																options={statusOptions.map((status) => ({ label: status, value: status }))}
															/>,
														]}
													>
														<List.Item.Meta
															title={
																<Space wrap>
																	<Text strong>
																		{booking.timeStart} - {booking.timeEnd}
																	</Text>
																	<Text>{booking.customerName}</Text>
																	<Tag color={getStatusColor(booking.status)}>{booking.status}</Tag>
																</Space>
															}
															description={
																<Space wrap>
																	<Text type="secondary">{booking.customerEmail}</Text>
																	{booking.serviceId ? <Tag>{serviceById.get(booking.serviceId)?.name ?? `Service #${booking.serviceId}`}</Tag> : <Tag>Ohne Service</Tag>}
																	<Tag>{booking.source}</Tag>
																</Space>
															}
														/>
													</List.Item>
												)}
											/>
										</Card>
									))
							) : (
								<Card>
									<Empty description="Keine Buchungen für den gewählten Zeitraum" />
								</Card>
							)}
						</Space>
					)}
				</Content>
			</Layout>
		</Layout>
	);
}
