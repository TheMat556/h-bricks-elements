import {
	DeleteOutlined,
	DownOutlined,
	PlusOutlined,
	UpOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	DatePicker,
	Flex,
	Grid,
	Input,
	InputNumber,
	Select,
	Segmented,
	Spin,
	Switch,
	TimePicker,
	Typography,
	theme,
} from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

const { TextArea } = Input;

export type WeekdayKey =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

export interface WorkingHourInterval {
	start: string;
	end: string;
}

export interface WorkingDaySettings {
	enabled: boolean;
	intervals: WorkingHourInterval[];
}

export interface CalendarServiceSettings {
	id: string;
	name: string;
	duration: number;
	prepTime: number;
	cleanupTime: number;
	price: string;
	description: string;
}

export interface CalendarExceptionSettings {
	id: string;
	date: string;
	reason: string;
}

export interface CalendarSettings {
	icon: string;
	allowDoubleBookings: boolean;
	adminOnly: boolean;
	slotSettings: {
		sessionDuration: number;
		prepTime: number;
		cleanupTime: number;
		maxAdvanceDays: number;
	};
	mailSettings: {
		enabled: boolean;
		host: string;
		port: number;
		encryption: "none" | "ssl" | "tls";
		username: string;
		password: string;
		fromName: string;
		fromEmail: string;
		subject: string;
	};
	workingHours: Record<WeekdayKey, WorkingDaySettings>;
	services: CalendarServiceSettings[];
	exceptions: CalendarExceptionSettings[];
	selectionMode: "single" | "multi";
}

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
	monday: "Monday",
	tuesday: "Tuesday",
	wednesday: "Wednesday",
	thursday: "Thursday",
	friday: "Friday",
	saturday: "Saturday",
	sunday: "Sunday",
};

const CALENDAR_ICON_OPTIONS = [
	"📅",
	"💇",
	"💼",
	"🦷",
	"🏥",
	"🏋️",
	"🍽️",
	"🎓",
	"🧘",
	"🎨",
	"🛠️",
	"🚗",
];

export const WEEKDAY_ORDER: WeekdayKey[] = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

function createClientId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}

export function createDefaultCalendarSettings(): CalendarSettings {
	return {
		icon: "",
		allowDoubleBookings: false,
		adminOnly: false,
		slotSettings: {
			sessionDuration: 60,
			prepTime: 0,
			cleanupTime: 0,
			maxAdvanceDays: 0,
		},
		mailSettings: {
			enabled: false,
			host: "",
			port: 587,
			encryption: "tls",
			username: "",
			password: "",
			fromName: "",
			fromEmail: "",
			subject: "Booking confirmation",
		},
		workingHours: {
			monday: { enabled: true, intervals: [{ start: "09:00", end: "17:00" }] },
			tuesday: { enabled: true, intervals: [{ start: "09:00", end: "17:00" }] },
			wednesday: {
				enabled: true,
				intervals: [{ start: "09:00", end: "17:00" }],
			},
			thursday: {
				enabled: true,
				intervals: [{ start: "09:00", end: "17:00" }],
			},
			friday: { enabled: true, intervals: [{ start: "09:00", end: "17:00" }] },
			saturday: { enabled: false, intervals: [] },
			sunday: { enabled: false, intervals: [] },
		},
		services: [],
		exceptions: [],
		selectionMode: "single",
	};
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	const { token } = theme.useToken();

	return (
		<div
			style={{
				background: token.colorBgContainer,
				border: `1px solid ${token.colorBorderSecondary}`,
				borderRadius: token.borderRadiusLG,
				padding: 20,
			}}
		>
			<Flex vertical gap={4} style={{ marginBottom: 18 }}>
				<Typography.Title level={5} style={{ margin: 0 }}>
					{title}
				</Typography.Title>
				<Typography.Text type="secondary">{description}</Typography.Text>
			</Flex>
			{children}
		</div>
	);
}

export function CalendarSettingsPanel({
	calendarName,
	settings,
	loading,
	error,
	onCalendarNameChange,
	onChange,
}: {
	calendarName: string;
	settings: CalendarSettings | null;
	loading: boolean;
	error: string;
	onCalendarNameChange: (nextName: string) => void;
	onChange: (nextSettings: CalendarSettings) => void;
}) {
	const { token } = theme.useToken();
	const screens = Grid.useBreakpoint();

	if (loading || !settings) {
		return (
			<Flex align="center" justify="center" style={{ height: "100%" }}>
				<Spin size="large" />
			</Flex>
		);
	}

	const setWorkingDay = (weekday: WeekdayKey, nextDay: WorkingDaySettings) => {
		onChange({
			...settings,
			workingHours: {
				...settings.workingHours,
				[weekday]: nextDay,
			},
		});
	};

	const addWorkingInterval = (weekday: WeekdayKey) => {
		const day = settings.workingHours[weekday];

		setWorkingDay(weekday, {
			...day,
			enabled: true,
			intervals: [...day.intervals, { start: "09:00", end: "17:00" }],
		});
	};

	const updateWorkingInterval = (
		weekday: WeekdayKey,
		index: number,
		field: "start" | "end",
		value: string,
	) => {
		const day = settings.workingHours[weekday];

		setWorkingDay(weekday, {
			...day,
			intervals: day.intervals.map((interval, intervalIndex) =>
				intervalIndex === index ? { ...interval, [field]: value } : interval,
			),
		});
	};

	const removeWorkingInterval = (weekday: WeekdayKey, index: number) => {
		const day = settings.workingHours[weekday];

		setWorkingDay(weekday, {
			...day,
			intervals: day.intervals.filter((_, intervalIndex) => intervalIndex !== index),
		});
	};

	const addService = () => {
		onChange({
			...settings,
			services: [
				...settings.services,
				{
					id: createClientId("service"),
					name: "",
					duration: 30,
					prepTime: 0,
					cleanupTime: 0,
					price: "",
					description: "",
				},
			],
		});
	};

	const updateService = (
		index: number,
		patch: Partial<CalendarServiceSettings>,
	) => {
		onChange({
			...settings,
			services: settings.services.map((service, serviceIndex) =>
				serviceIndex === index ? { ...service, ...patch } : service,
			),
		});
	};

	const moveService = (index: number, direction: -1 | 1) => {
		const nextIndex = index + direction;

		if (nextIndex < 0 || nextIndex >= settings.services.length) {
			return;
		}

		const services = [...settings.services];
		const [service] = services.splice(index, 1);
		services.splice(nextIndex, 0, service);

		onChange({ ...settings, services });
	};

	const removeService = (index: number) => {
		onChange({
			...settings,
			services: settings.services.filter((_, serviceIndex) => serviceIndex !== index),
		});
	};

	const addException = () => {
		onChange({
			...settings,
			exceptions: [
				...settings.exceptions,
				{
					id: createClientId("exception"),
					date: dayjs().format("YYYY-MM-DD"),
					reason: "",
				},
			],
		});
	};

	const updateException = (
		index: number,
		patch: Partial<CalendarExceptionSettings>,
	) => {
		onChange({
			...settings,
			exceptions: settings.exceptions.map((exception, exceptionIndex) =>
				exceptionIndex === index ? { ...exception, ...patch } : exception,
			),
		});
	};

	const removeException = (index: number) => {
		onChange({
			...settings,
			exceptions: settings.exceptions.filter(
				(_, exceptionIndex) => exceptionIndex !== index,
			),
		});
	};

	const updateMailSettings = (
		patch: Partial<CalendarSettings["mailSettings"]>,
	) => {
		onChange({
			...settings,
			mailSettings: {
				...settings.mailSettings,
				...patch,
			},
		});
	};

	const updateSlotSettings = (
		patch: Partial<CalendarSettings["slotSettings"]>,
	) => {
		onChange({
			...settings,
			slotSettings: {
				...settings.slotSettings,
				...patch,
			},
		});
	};

	const totalDefaultSlotDuration =
		settings.slotSettings.sessionDuration +
		settings.slotSettings.prepTime +
		settings.slotSettings.cleanupTime;

	return (
		<div
			style={{
				minHeight: "100%",
				padding: 24,
			}}
		>
			<Flex vertical gap={16}>
				<Flex
					align="center"
					gap={16}
					style={{
						background: token.colorBgContainer,
						border: `1px solid ${token.colorBorderSecondary}`,
						borderRadius: token.borderRadiusLG,
						padding: 20,
					}}
				>
					<div>
						<Typography.Title level={4} style={{ margin: 0 }}>
							{settings.icon ? `${settings.icon} ${calendarName}` : calendarName}
						</Typography.Title>
						<Typography.Text type="secondary">
							Manage working hours, services, booking rules and blocked dates.
						</Typography.Text>
					</div>
				</Flex>

				{error && <Alert type="error" showIcon message={error} />}

				<Section
					title="Calendar Identity"
					description="Change the calendar name and add a small icon or emoji to help distinguish calendars in the sidebar and future frontend views."
				>
					<Flex vertical gap={12}>
						<div>
							<Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
								Calendar Name
							</Typography.Text>
							<Input
								placeholder="Calendar name"
								value={calendarName}
								onChange={(event) => onCalendarNameChange(event.target.value)}
							/>
						</div>
						<div>
							<Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
								Icon Selection
							</Typography.Text>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: screens.lg
										? "repeat(6, minmax(0, 1fr))"
										: "repeat(4, minmax(0, 1fr))",
									gap: 8,
									marginBottom: 10,
								}}
							>
								{CALENDAR_ICON_OPTIONS.map((icon) => (
									<Button
										key={icon}
										type={settings.icon === icon ? "primary" : "default"}
										onClick={() =>
											onChange({
												...settings,
												icon,
											})
										}
										style={{ height: 44, fontSize: 20 }}
									>
										{icon}
									</Button>
								))}
								<Button
									type={!settings.icon ? "primary" : "default"}
									onClick={() =>
										onChange({
											...settings,
											icon: "",
										})
									}
									style={{ height: 44 }}
								>
									None
								</Button>
							</div>
							<Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
								Or enter a custom icon / emoji.
							</Typography.Text>
							<Input
								maxLength={12}
								placeholder="e.g. 💇, 🦷, A"
								value={settings.icon}
								onChange={(event) =>
									onChange({
										...settings,
										icon: event.target.value,
									})
								}
							/>
						</div>
						<Typography.Text type="secondary">
							Leave the icon empty if you only want to show the calendar name.
						</Typography.Text>
					</Flex>
				</Section>

				<Section
					title="Booking Rules"
					description="Define how visitors may select services and whether the calendar allows overlapping or admin-only bookings."
				>
					<Flex vertical gap={18}>
						<div>
							<Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
								Service Selection
							</Typography.Text>
							<Segmented
								options={[
									{ label: "Single Select", value: "single" },
									{ label: "Multi Select", value: "multi" },
								]}
								value={settings.selectionMode}
								onChange={(value) =>
									onChange({
										...settings,
										selectionMode: value as CalendarSettings["selectionMode"],
									})
								}
							/>
						</div>

						<Flex
							align="center"
							justify="space-between"
							gap={16}
							wrap="wrap"
						>
							<div style={{ maxWidth: 460 }}>
								<Typography.Text strong style={{ display: "block" }}>
									Allow Double Bookings
								</Typography.Text>
								<Typography.Text type="secondary">
									If enabled, overlapping bookings may exist in the same calendar.
								</Typography.Text>
							</div>
							<Switch
								checked={settings.allowDoubleBookings}
								onChange={(checked) =>
									onChange({
										...settings,
										allowDoubleBookings: checked,
									})
								}
							/>
						</Flex>

						<Flex
							align="center"
							justify="space-between"
							gap={16}
							wrap="wrap"
						>
							<div style={{ maxWidth: 460 }}>
								<Typography.Text strong style={{ display: "block" }}>
									Admin Only Bookings
								</Typography.Text>
								<Typography.Text type="secondary">
									Reserve this calendar for admin-managed bookings only.
								</Typography.Text>
							</div>
							<Switch
								checked={settings.adminOnly}
								onChange={(checked) =>
									onChange({
										...settings,
										adminOnly: checked,
									})
								}
							/>
						</Flex>
					</Flex>
				</Section>

				<Section
					title="Default Slot Timing"
					description="Define the base slot footprint and how far ahead customers are allowed to book."
				>
					<Flex vertical gap={16}>
						<Flex gap={12} wrap="wrap">
							<InputNumber
								min={1}
								value={settings.slotSettings.sessionDuration}
								addonBefore="Session"
								addonAfter="min"
								onChange={(value) =>
									updateSlotSettings({
										sessionDuration: Number(value ?? 60),
									})
								}
							/>
							<InputNumber
								min={0}
								value={settings.slotSettings.prepTime}
								addonBefore="Prep"
								addonAfter="min"
								onChange={(value) =>
									updateSlotSettings({
										prepTime: Number(value ?? 0),
									})
								}
							/>
							<InputNumber
								min={0}
								value={settings.slotSettings.cleanupTime}
								addonBefore="Cleanup"
								addonAfter="min"
								onChange={(value) =>
									updateSlotSettings({
										cleanupTime: Number(value ?? 0),
									})
								}
							/>
							<InputNumber
								min={0}
								value={settings.slotSettings.maxAdvanceDays}
								addonBefore="Book ahead"
								addonAfter="days"
								onChange={(value) =>
									updateSlotSettings({
										maxAdvanceDays: Number(value ?? 0),
									})
								}
							/>
						</Flex>
						<Alert
							type="info"
							showIcon
							message={`Total slot footprint: ${totalDefaultSlotDuration} minutes`}
							description={
								settings.slotSettings.maxAdvanceDays > 0
									? `Customers can book up to ${settings.slotSettings.maxAdvanceDays} day${settings.slotSettings.maxAdvanceDays === 1 ? "" : "s"} ahead.`
									: "Set “Book ahead” to 0 to allow booking without an advance-day limit."
							}
						/>
					</Flex>
				</Section>

				<Section
					title="Working Hours"
					description="Configure availability per weekday. Multiple intervals per day allow lunch breaks and split shifts."
				>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: screens.lg
								? "repeat(2, minmax(0, 1fr))"
								: "minmax(0, 1fr)",
							gap: 16,
						}}
					>
						{WEEKDAY_ORDER.map((weekday) => {
							const day = settings.workingHours[weekday];

							return (
								<div
									key={weekday}
									style={{
										border: `1px solid ${token.colorBorderSecondary}`,
										borderRadius: token.borderRadius,
										padding: 16,
									}}
								>
									<Flex
										align="center"
										justify="space-between"
										wrap="wrap"
										gap={12}
										style={{ marginBottom: 12 }}
									>
										<Typography.Text strong>{WEEKDAY_LABELS[weekday]}</Typography.Text>
										<Switch
											checked={day.enabled}
											checkedChildren="Open"
											unCheckedChildren="Closed"
											onChange={(enabled) =>
												setWorkingDay(weekday, {
													...day,
													enabled,
												})
											}
										/>
									</Flex>

									<Flex vertical gap={10}>
										{day.intervals.map((interval, index) => (
											<Flex key={`${weekday}-${index}`} align="center" gap={10} wrap="wrap">
												<TimePicker
													format="HH:mm"
													minuteStep={15}
													disabled={!day.enabled}
													value={dayjs(`2000-01-01T${interval.start}:00`)}
													onChange={(_, value) =>
														updateWorkingInterval(weekday, index, "start", value)
													}
												/>
												<Typography.Text type="secondary">to</Typography.Text>
												<TimePicker
													format="HH:mm"
													minuteStep={15}
													disabled={!day.enabled}
													value={dayjs(`2000-01-01T${interval.end}:00`)}
													onChange={(_, value) =>
														updateWorkingInterval(weekday, index, "end", value)
													}
												/>
												<Button
													danger
													type="text"
													icon={<DeleteOutlined />}
													disabled={!day.enabled}
													onClick={() => removeWorkingInterval(weekday, index)}
												/>
											</Flex>
										))}

										{day.intervals.length === 0 && (
											<Typography.Text type="secondary">
												No time intervals configured.
											</Typography.Text>
										)}

										<Button
											type="dashed"
											icon={<PlusOutlined />}
											disabled={!day.enabled}
											onClick={() => addWorkingInterval(weekday)}
										>
											Add Interval
										</Button>
									</Flex>
								</div>
							);
						})}
					</div>
				</Section>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: screens.lg
							? "repeat(2, minmax(0, 1fr))"
							: "minmax(0, 1fr)",
						gap: 16,
						alignItems: "start",
					}}
				>
					<Section
						title="Services"
						description="Add the services available for this calendar, including duration and optional prep / cleanup times."
					>
						<Flex vertical gap={14}>
							{settings.services.map((service, index) => (
								<div
									key={service.id}
									style={{
										border: `1px solid ${token.colorBorderSecondary}`,
										borderRadius: token.borderRadius,
										padding: 16,
									}}
								>
									<Flex justify="space-between" align="center" gap={12} style={{ marginBottom: 16 }}>
										<Typography.Text strong>
											{service.name || `Service ${index + 1}`}
										</Typography.Text>
										<Flex gap={4}>
											<Button
												type="text"
												icon={<UpOutlined />}
												disabled={index === 0}
												onClick={() => moveService(index, -1)}
											/>
											<Button
												type="text"
												icon={<DownOutlined />}
												disabled={index === settings.services.length - 1}
												onClick={() => moveService(index, 1)}
											/>
											<Button
												type="text"
												danger
												icon={<DeleteOutlined />}
												onClick={() => removeService(index)}
											/>
										</Flex>
									</Flex>

									<Flex vertical gap={12}>
										<Input
											placeholder="Service name"
											value={service.name}
											onChange={(event) =>
												updateService(index, { name: event.target.value })
											}
										/>
										<Flex gap={12} wrap="wrap">
											<InputNumber
												min={1}
												value={service.duration}
												addonBefore="Duration"
												addonAfter="min"
												onChange={(value) =>
													updateService(index, { duration: Number(value ?? 30) })
												}
											/>
											<InputNumber
												min={0}
												value={service.prepTime}
												addonBefore="Prep"
												addonAfter="min"
												onChange={(value) =>
													updateService(index, { prepTime: Number(value ?? 0) })
												}
											/>
											<InputNumber
												min={0}
												value={service.cleanupTime}
												addonBefore="Cleanup"
												addonAfter="min"
												onChange={(value) =>
													updateService(index, { cleanupTime: Number(value ?? 0) })
												}
											/>
										</Flex>
										<Input
											placeholder="Price, e.g. 59 EUR"
											value={service.price}
											onChange={(event) =>
												updateService(index, { price: event.target.value })
											}
										/>
										<TextArea
											rows={3}
											placeholder="Short description"
											value={service.description}
											onChange={(event) =>
												updateService(index, { description: event.target.value })
											}
										/>
									</Flex>
								</div>
							))}

							<Button type="dashed" icon={<PlusOutlined />} onClick={addService}>
								Add Service
							</Button>
						</Flex>
					</Section>

					<Section
						title="Blocked Dates"
						description="Add holidays or exception days that should be unavailable despite normal working hours."
					>
						<Flex vertical gap={12}>
							{settings.exceptions.map((exception, index) => (
								<Flex
									key={exception.id}
									align="center"
									gap={10}
									wrap="wrap"
									style={{
										border: `1px solid ${token.colorBorderSecondary}`,
										borderRadius: token.borderRadius,
										padding: 14,
									}}
								>
									<DatePicker
										format="YYYY-MM-DD"
										value={exception.date ? dayjs(exception.date) : null}
										onChange={(_, value) =>
											updateException(index, { date: value })
										}
									/>
									<Input
										placeholder="Reason"
										value={exception.reason}
										style={{ minWidth: 240, flex: 1 }}
										onChange={(event) =>
											updateException(index, { reason: event.target.value })
										}
									/>
									<Button
										danger
										type="text"
										icon={<DeleteOutlined />}
										onClick={() => removeException(index)}
									/>
								</Flex>
							))}

							<Button type="dashed" icon={<PlusOutlined />} onClick={addException}>
								Add Blocked Date
							</Button>
						</Flex>
					</Section>
				</div>

				<Section
					title="Mail Service"
					description="Dummy SMTP configuration for future booking confirmation emails. This stores settings only and does not send emails yet."
				>
					<Flex vertical gap={16}>
						<Flex
							align="center"
							justify="space-between"
							gap={16}
							wrap="wrap"
						>
							<div style={{ maxWidth: 520 }}>
								<Typography.Text strong style={{ display: "block" }}>
									Enable SMTP Mailer
								</Typography.Text>
								<Typography.Text type="secondary">
									Prepared for future booking confirmation emails. No mail logic is active yet.
								</Typography.Text>
							</div>
							<Switch
								checked={settings.mailSettings.enabled}
								onChange={(checked) => updateMailSettings({ enabled: checked })}
							/>
						</Flex>

						<Flex gap={12} wrap="wrap">
							<Input
								placeholder="SMTP host"
								value={settings.mailSettings.host}
								style={{ minWidth: 220, flex: 1 }}
								onChange={(event) =>
									updateMailSettings({ host: event.target.value })
								}
							/>
							<InputNumber
								min={1}
								max={65535}
								value={settings.mailSettings.port}
								addonBefore="Port"
								style={{ minWidth: 150 }}
								onChange={(value) =>
									updateMailSettings({ port: Number(value ?? 587) })
								}
							/>
							<Select
								value={settings.mailSettings.encryption}
								style={{ minWidth: 160 }}
								options={[
									{ label: "TLS", value: "tls" },
									{ label: "SSL", value: "ssl" },
									{ label: "None", value: "none" },
								]}
								onChange={(value) =>
									updateMailSettings({
										encryption: value as CalendarSettings["mailSettings"]["encryption"],
									})
								}
							/>
						</Flex>

						<Flex gap={12} wrap="wrap">
							<Input
								placeholder="SMTP username"
								value={settings.mailSettings.username}
								style={{ minWidth: 220, flex: 1 }}
								onChange={(event) =>
									updateMailSettings({ username: event.target.value })
								}
							/>
							<Input.Password
								placeholder="SMTP password"
								value={settings.mailSettings.password}
								style={{ minWidth: 220, flex: 1 }}
								onChange={(event) =>
									updateMailSettings({ password: event.target.value })
								}
							/>
						</Flex>

						<Flex gap={12} wrap="wrap">
							<Input
								placeholder="From name"
								value={settings.mailSettings.fromName}
								style={{ minWidth: 220, flex: 1 }}
								onChange={(event) =>
									updateMailSettings({ fromName: event.target.value })
								}
							/>
							<Input
								placeholder="From email"
								value={settings.mailSettings.fromEmail}
								style={{ minWidth: 220, flex: 1 }}
								onChange={(event) =>
									updateMailSettings({ fromEmail: event.target.value })
								}
							/>
						</Flex>

						<Input
							placeholder="Confirmation email subject"
							value={settings.mailSettings.subject}
							onChange={(event) =>
								updateMailSettings({ subject: event.target.value })
							}
						/>
					</Flex>
				</Section>
			</Flex>
		</div>
	);
}
