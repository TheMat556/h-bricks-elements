import { createCache, StyleProvider } from "@ant-design/cssinjs";
import {
	CalendarOutlined,
	ClockCircleOutlined,
	FileAddOutlined,
	InboxOutlined,
	LayoutOutlined,
	LeftOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	PlusOutlined,
	RightOutlined,
	SaveOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Calendar,
	ConfigProvider,
	Divider,
	Flex,
	Grid,
	Input,
	Modal,
	Tooltip,
	Typography,
	theme,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	CalendarSettingsPanel,
	createDefaultCalendarSettings,
	type CalendarSettings,
} from "./CalendarSettingsPanel";
import { BookingView, type ViewOption } from "./BookingView";
import "./SettingsApp.css";

const { useBreakpoint } = Grid;
const THEME_STORAGE_KEY = "wp-react-ui-theme";
const THEME_CHANGE_EVENT = "wp-react-ui-theme-change";

type AdminTheme = "light" | "dark";
type AdminViewKey = "booking" | "settings";

interface AdminCalendar {
	id: number;
	title: string;
	slug: string;
	icon?: string;
}

interface CalendarSettingsResponse {
	item: AdminCalendar;
	settings: CalendarSettings;
}

interface HBricksWindow {
	hBricksAdmin?: {
		theme?: AdminTheme;
		initialCalendars?: AdminCalendar[];
		selectedCalendarId?: number;
		restUrl?: string;
		restNonce?: string;
	};
	__hBricksNewBooking?: () => void;
}

declare global {
	interface Window extends HBricksWindow {}
}

function isAdminTheme(value: unknown): value is AdminTheme {
	return value === "light" || value === "dark";
}

function readStoredTheme(): AdminTheme | null {
	try {
		const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
		return isAdminTheme(storedTheme) ? storedTheme : null;
	} catch {
		return null;
	}
}

function writeStoredTheme(themeMode: AdminTheme) {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, themeMode);
	} catch {
		// Ignore storage failures.
	}
}

function getInitialTheme(): AdminTheme {
	const storedTheme = readStoredTheme();
	if (storedTheme) {
		return storedTheme;
	}

	const serverTheme = window.hBricksAdmin?.theme;
	return isAdminTheme(serverTheme) ? serverTheme : "light";
}

function getInitialCalendars(): AdminCalendar[] {
	return window.hBricksAdmin?.initialCalendars ?? [];
}

function getInitialSelectedCalendarId(calendars: AdminCalendar[]): number {
	const selectedId = window.hBricksAdmin?.selectedCalendarId;

	if (
		typeof selectedId === "number" &&
		calendars.some((calendar) => calendar.id === selectedId)
	) {
		return selectedId;
	}

	return calendars[0]?.id ?? 0;
}

function applyThemeToDOM(themeMode: AdminTheme) {
	document.body.setAttribute("data-theme", themeMode);
	document.body.classList.toggle("wp-react-dark", themeMode === "dark");
	window.hBricksAdmin = { ...window.hBricksAdmin, theme: themeMode };
	document
		.getElementById("h-bricks-admin-root")
		?.setAttribute("data-theme", themeMode);
}

function applyWordPressScreenMetaButtonFix() {
	const buttons = document.querySelectorAll<HTMLButtonElement>(
		'#screen-meta-links .show-settings, button.show-settings[aria-controls="screen-options-wrap"], button.show-settings[aria-controls="contextual-help-wrap"]',
	);

	buttons.forEach((button) => {
		button.style.display = "flex";
		button.style.alignItems = "center";
	});
}

function getAdminApiConfig() {
	const rootElement = document.getElementById("h-bricks-admin-root");
	const rootDatasetUrl = rootElement?.getAttribute("data-rest-url") ?? "";
	const rootDatasetNonce = rootElement?.getAttribute("data-rest-nonce") ?? "";
	const inferredBase = window.location.pathname.split("/wp-admin/")[0] ?? "";
	const inferredRestUrl = `${window.location.origin}${inferredBase}/wp-json/hbe/v1/`;

	return {
		restUrl:
			window.hBricksAdmin?.restUrl || rootDatasetUrl || inferredRestUrl,
		restNonce: window.hBricksAdmin?.restNonce || rootDatasetNonce || "",
	};
}

async function createCalendarRequest(title: string): Promise<AdminCalendar> {
	const { restUrl, restNonce } = getAdminApiConfig();

	if (!restUrl) {
		throw new Error("REST URL missing.");
	}

	const response = await fetch(`${restUrl}admin/calendars`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-WP-Nonce": restNonce,
		},
		body: JSON.stringify({ title }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Calendar could not be created.",
		);
	}

	return data.item as AdminCalendar;
}

async function fetchCalendarsRequest(): Promise<AdminCalendar[]> {
	const { restUrl, restNonce } = getAdminApiConfig();

	const response = await fetch(`${restUrl}admin/calendars`, {
		method: "GET",
		headers: {
			"X-WP-Nonce": restNonce,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Calendars could not be loaded.",
		);
	}

	return Array.isArray(data?.items) ? (data.items as AdminCalendar[]) : [];
}

async function fetchCalendarSettingsRequest(
	calendarId: number,
): Promise<CalendarSettingsResponse> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(`${restUrl}admin/calendars/${calendarId}/settings`, {
		method: "GET",
		headers: {
			"X-WP-Nonce": restNonce,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Settings could not be loaded.",
		);
	}

	return {
		item: (data?.item as AdminCalendar) ?? {
			id: calendarId,
			title: "Calendar",
			slug: "",
		},
		settings:
			(data?.settings as CalendarSettings) ?? createDefaultCalendarSettings(),
	};
}

async function saveCalendarSettingsRequest(
	calendarId: number,
	settings: CalendarSettings,
	title: string,
): Promise<CalendarSettingsResponse> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(`${restUrl}admin/calendars/${calendarId}/settings`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-WP-Nonce": restNonce,
		},
		body: JSON.stringify({ settings, title }),
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: "Settings could not be saved.",
		);
	}

	return {
		item: (data?.item as AdminCalendar) ?? {
			id: calendarId,
			title: "Calendar",
			slug: "",
		},
		settings:
			(data?.settings as CalendarSettings) ?? createDefaultCalendarSettings(),
	};
}

function Logo({
	collapsed,
	onToggle,
}: {
	collapsed: boolean;
	onToggle: () => void;
}) {
	const { token } = theme.useToken();

	return (
		<Flex
			align="center"
			justify={collapsed ? "center" : "space-between"}
			style={{
				height: 48,
				borderBottom: `1px solid ${token.colorBorderSecondary}`,
				background: token.colorBgContainer,
				paddingLeft: collapsed ? 0 : 10,
				transition: "padding 0.2s",
				flexShrink: 0,
			}}
		>
			{!collapsed && (
				<Typography.Text
					strong
					style={{ fontSize: 15, color: token.colorPrimary }}
				>
					H-Bricks
				</Typography.Text>
			)}
			<Tooltip title={collapsed ? "Expand" : ""} placement="right">
				<Button
					type="text"
					icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
					style={{ width: 64, height: 48, borderRadius: 0, fontSize: 18 }}
					onClick={onToggle}
				/>
			</Tooltip>
		</Flex>
	);
}

function EmptyCalendarState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	const { token } = theme.useToken();

	return (
		<Flex
			vertical
			align="center"
			justify="center"
			gap={12}
			style={{
				height: "100%",
				padding: 24,
				textAlign: "center",
			}}
		>
			<InboxOutlined
				style={{
					fontSize: 52,
					color: token.colorTextQuaternary,
				}}
			/>
			<Typography.Title level={4} style={{ margin: 0 }}>
				{title}
			</Typography.Title>
			<Typography.Text type="secondary" style={{ maxWidth: 360 }}>
				{description}
			</Typography.Text>
		</Flex>
	);
}

function Sidebar({
	collapsed,
	isDark,
	activeKey,
	calendars,
	calendarDate,
	hasCalendars,
	selectedCalendarId,
	onToggle,
	onViewChange,
	onCreateCalendar,
	onCalendarChange,
	onCalendarSelect,
}: {
	collapsed: boolean;
	isDark: boolean;
	activeKey: AdminViewKey;
	calendars: AdminCalendar[];
	calendarDate: Dayjs;
	hasCalendars: boolean;
	selectedCalendarId: number;
	onToggle: () => void;
	onViewChange: (key: AdminViewKey) => void;
	onCreateCalendar: () => void;
	onCalendarChange: (calendarId: number) => void;
	onCalendarSelect: (date: Dayjs) => void;
}) {
	const { token } = theme.useToken();
	const sidebarWidth = collapsed ? 64 : 220;

	return (
		<div
			style={{
				width: sidebarWidth,
				minWidth: sidebarWidth,
				maxWidth: sidebarWidth,
				height: "100%",
				transition:
					"width 0.24s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.24s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
				borderRight: `1px solid ${token.colorBorderSecondary}`,
				background: token.colorBgContainer,
				alignSelf: "stretch",
				overflowX: "hidden",
				overflowY: "hidden",
				flexShrink: 0,
			}}
		>
			<Flex
				vertical
				style={{
					height: "100%",
					minHeight: 0,
					background: token.colorBgContainer,
				}}
			>
				<Logo collapsed={collapsed} onToggle={onToggle} />

				<div style={{ padding: collapsed ? 8 : 12 }}>
					<Flex vertical gap={8}>
						<Tooltip title={collapsed ? "Calendar" : ""} placement="right">
							<Button
								type={activeKey === "booking" ? "primary" : "default"}
								icon={<CalendarOutlined />}
								block
								disabled={!hasCalendars}
								onClick={() => onViewChange("booking")}
							>
								{!collapsed && "Calendar"}
							</Button>
						</Tooltip>
						<Tooltip title={collapsed ? "Settings" : ""} placement="right">
							<Button
								type={activeKey === "settings" ? "primary" : "default"}
								icon={<SettingOutlined />}
								block
								disabled={!hasCalendars}
								onClick={() => onViewChange("settings")}
							>
								{!collapsed && "Settings"}
							</Button>
						</Tooltip>
					</Flex>
				</div>

				{!collapsed && hasCalendars && (
					<div
						style={{
							padding: "4px 12px 12px",
							flex: 1,
							minHeight: 0,
							overflowY: "auto",
						}}
					>
						<Typography.Text
							type="secondary"
							strong
							style={{
								display: "block",
								fontSize: 11,
								letterSpacing: 0.6,
								textTransform: "uppercase",
								marginBottom: 10,
							}}
						>
							Calendars
						</Typography.Text>

						<Flex vertical gap={6}>
							{calendars.map((calendar) => {
								const isActive = calendar.id === selectedCalendarId;

								return (
									<Button
										key={calendar.id}
										type={isActive ? "primary" : "text"}
										icon={
											calendar.icon ? (
												<span
													aria-hidden="true"
													style={{
														display: "inline-flex",
														alignItems: "center",
														justifyContent: "center",
														width: 18,
														lineHeight: 1,
													}}
												>
													{calendar.icon}
												</span>
											) : (
												<CalendarOutlined />
											)
										}
										block
										style={{
											justifyContent: "flex-start",
											fontWeight: isActive ? 600 : 500,
										}}
										onClick={() => onCalendarChange(calendar.id)}
									>
										{calendar.title}
									</Button>
								);
							})}
						</Flex>
					</div>
				)}

				<div style={{ padding: collapsed ? "0 8px 12px" : "0 12px 12px" }}>
					<Tooltip title={collapsed ? "New Calendar" : ""} placement="right">
						<Button
							type="primary"
							icon={<PlusOutlined />}
							block
							onClick={onCreateCalendar}
						>
							{!collapsed && "New Calendar"}
						</Button>
					</Tooltip>
				</div>

				{!collapsed && hasCalendars && (
					<>
						<Divider style={{ margin: 0 }} />
						<ConfigProvider theme={{ token: { fontSize: 11, fontSizeSM: 10 } }}>
							<Calendar
								fullscreen={false}
								value={calendarDate}
								onSelect={onCalendarSelect}
								style={{ width: "100%" }}
							/>
						</ConfigProvider>
					</>
				)}
			</Flex>
		</div>
	);
}

function App({ themeMode }: { themeMode: AdminTheme }) {
	const screens = useBreakpoint();
	const initialCalendars = useMemo(() => getInitialCalendars(), []);

	const isSmall = screens.md === false;
	const isTiny = screens.sm === false;

	const [activeKey, setActiveKey] = useState<AdminViewKey>("booking");
	const [collapsedManual, setCollapsedManual] = useState<boolean | null>(null);
	const [rightPanelVisible, setRightPanelVisible] = useState(true);
	const [calendars, setCalendars] = useState<AdminCalendar[]>(initialCalendars);
	const [selectedCalendarId, setSelectedCalendarId] = useState<number>(() =>
		getInitialSelectedCalendarId(initialCalendars),
	);
	const [calendarDate, setCalendarDate] = useState<Dayjs>(dayjs());
	const [view, setView] = useState<ViewOption>("week");
	const [use24h, setUse24h] = useState(true);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [newCalendarTitle, setNewCalendarTitle] = useState("");
	const [createCalendarPending, setCreateCalendarPending] = useState(false);
	const [createCalendarError, setCreateCalendarError] = useState("");
	const [calendarLoadError, setCalendarLoadError] = useState("");
	const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(
		null,
	);
	const [calendarTitleDraft, setCalendarTitleDraft] = useState("");
	const [settingsLoading, setSettingsLoading] = useState(false);
	const [settingsSaving, setSettingsSaving] = useState(false);
	const [settingsError, setSettingsError] = useState("");
	const [settingsDirty, setSettingsDirty] = useState(false);
	const { token } = theme.useToken();
	const isDark = themeMode === "dark";
	const hasCalendars = calendars.length > 0;
	const displayCalendars = useMemo(
		() =>
			calendars.map((calendar) =>
				calendar.id === selectedCalendarId
					? {
							...calendar,
							title: calendarTitleDraft || calendar.title,
							icon: calendarSettings?.icon ?? calendar.icon,
						}
					: calendar,
			),
		[calendarSettings?.icon, calendarTitleDraft, calendars, selectedCalendarId],
	);
	const selectedCalendar = displayCalendars.find(
		(calendar) => calendar.id === selectedCalendarId,
	);

	const collapsed = collapsedManual ?? isSmall;

	useEffect(() => {
		setCollapsedManual((current) => {
			if (current === null) {
				return isSmall;
			}

			return current;
		});
	}, [isSmall]);

	useEffect(() => {
		if (isTiny && (view === "week" || view === "month")) {
			setView("day");
		}
	}, [isTiny, view]);

	useEffect(() => {
		if (!hasCalendars) {
			setRightPanelVisible(false);
			setSelectedCalendarId(0);
			setCalendarSettings(null);
			setCalendarTitleDraft("");
			setSettingsDirty(false);
			return;
		}

		setSelectedCalendarId((currentId) => {
			if (calendars.some((calendar) => calendar.id === currentId)) {
				return currentId;
			}

			return calendars[0]?.id ?? 0;
		});
	}, [calendars, hasCalendars]);

	useEffect(() => {
		if (hasCalendars && selectedCalendarId === 0) {
			setActiveKey("booking");
		}
	}, [hasCalendars, selectedCalendarId]);

	useEffect(() => {
		let isMounted = true;

		void fetchCalendarsRequest()
			.then((items) => {
				if (!isMounted) {
					return;
				}

				setCalendars(items);
				setCalendarLoadError("");
			})
			.catch((error) => {
				if (!isMounted) {
					return;
				}

				setCalendarLoadError(
					error instanceof Error
						? error.message
						: "Calendars could not be loaded.",
				);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		applyWordPressScreenMetaButtonFix();

		const observer = new MutationObserver(() => {
			applyWordPressScreenMetaButtonFix();
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["class", "style", "aria-expanded"],
		});

		return () => {
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		if (!hasCalendars || selectedCalendarId === 0) {
			setCalendarSettings(null);
			setSettingsLoading(false);
			setSettingsDirty(false);
			return;
		}

		let isMounted = true;

		setSettingsLoading(true);
		setSettingsError("");

		void fetchCalendarSettingsRequest(selectedCalendarId)
			.then(({ item, settings: nextSettings }) => {
				if (!isMounted) {
					return;
				}

				setCalendars((currentCalendars) =>
					currentCalendars.map((calendar) =>
						calendar.id === item.id ? { ...calendar, ...item } : calendar,
					),
				);
				setCalendarTitleDraft(item.title);
				setCalendarSettings(nextSettings);
				setSettingsDirty(false);
			})
			.catch((error) => {
				if (!isMounted) {
					return;
				}

				setCalendarTitleDraft(selectedCalendar?.title ?? "");
				setCalendarSettings(createDefaultCalendarSettings());
				setSettingsError(
					error instanceof Error
						? error.message
						: "Settings could not be loaded.",
				);
			})
			.finally(() => {
				if (isMounted) {
					setSettingsLoading(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [hasCalendars, selectedCalendar?.title, selectedCalendarId]);

	const handleNavigate = useCallback(
		(direction: "prev" | "next" | "today") => {
			if (!hasCalendars) {
				return;
			}

			setCalendarDate((dateValue) => {
				if (direction === "today") return dayjs();

				const unit =
					view === "month" ? "month" : view === "week" ? "week" : "day";

				return direction === "prev"
					? dateValue.subtract(1, unit)
					: dateValue.add(1, unit);
			});
		},
		[hasCalendars, view],
	);

	const handleOpenCreateModal = useCallback(() => {
		setCreateCalendarError("");
		setCreateModalOpen(true);
	}, []);

	const handleCloseCreateModal = useCallback(() => {
		if (createCalendarPending) {
			return;
		}

		setCreateModalOpen(false);
		setNewCalendarTitle("");
		setCreateCalendarError("");
	}, [createCalendarPending]);

	const handleCreateCalendar = useCallback(async () => {
		const title = newCalendarTitle.trim();

		if (!title || createCalendarPending) {
			return;
		}

		setCreateCalendarPending(true);
		setCreateCalendarError("");

		try {
			const nextCalendar = await createCalendarRequest(title);
			setCalendars((currentCalendars) => [...currentCalendars, nextCalendar]);
			setSelectedCalendarId(nextCalendar.id);
			setActiveKey("booking");
			setRightPanelVisible(true);
			setCalendarDate(dayjs());
			setCalendarTitleDraft(nextCalendar.title);
			setCalendarSettings(createDefaultCalendarSettings());
			setSettingsDirty(false);
			setSettingsError("");
			setCreateModalOpen(false);
			setNewCalendarTitle("");
		} catch (error) {
			setCreateCalendarError(
				error instanceof Error
					? error.message
					: "Calendar could not be created.",
			);
		} finally {
			setCreateCalendarPending(false);
		}
	}, [createCalendarPending, newCalendarTitle]);

	const handleSettingsChange = useCallback((nextSettings: CalendarSettings) => {
		setCalendarSettings(nextSettings);
		setSettingsDirty(true);
		setSettingsError("");
	}, []);

	const handleCalendarTitleChange = useCallback((nextTitle: string) => {
		setCalendarTitleDraft(nextTitle);
		setSettingsDirty(true);
		setSettingsError("");
	}, []);

	const handleSaveSettings = useCallback(async () => {
		if (!calendarSettings || !selectedCalendarId || settingsSaving) {
			return;
		}

		const trimmedTitle = calendarTitleDraft.trim();

		if (!trimmedTitle) {
			setSettingsError("Calendar name is required.");
			return;
		}

		setSettingsSaving(true);
		setSettingsError("");

		try {
			const response = await saveCalendarSettingsRequest(
				selectedCalendarId,
				calendarSettings,
				trimmedTitle,
			);
			setCalendars((currentCalendars) =>
				currentCalendars.map((calendar) =>
					calendar.id === response.item.id
						? { ...calendar, ...response.item }
						: calendar,
				),
			);
			setCalendarTitleDraft(response.item.title);
			setCalendarSettings(response.settings);
			setSettingsDirty(false);
		} catch (error) {
			setSettingsError(
				error instanceof Error
					? error.message
					: "Settings could not be saved.",
			);
		} finally {
			setSettingsSaving(false);
		}
	}, [calendarSettings, calendarTitleDraft, selectedCalendarId, settingsSaving]);

	const headerLabel = (() => {
		if (!hasCalendars || !selectedCalendar) {
			return "No calendar created";
		}

		if (view === "week") {
			const start = calendarDate.startOf("isoWeek");
			const end = calendarDate.endOf("isoWeek");
			return isSmall
				? `${start.format("MMM D")} – ${end.format("D")}`
				: `${start.format("MMM D")} – ${end.format("D, YYYY")}`;
		}

		if (view === "day") {
			return calendarDate.format(
				isSmall ? "ddd, MMM D" : "dddd, MMM D, YYYY",
			);
		}

		if (view === "month") {
			return calendarDate.format("MMMM YYYY");
		}

		return "Agenda";
	})();

	return (
		<div
			className="hbe-settings-shell"
			style={{
				display: "flex",
				height: "100%",
				overflow: "hidden",
				alignItems: "stretch",
			}}
		>
			<Sidebar
				collapsed={collapsed}
				isDark={isDark}
				activeKey={activeKey}
				calendars={displayCalendars}
				calendarDate={calendarDate}
				hasCalendars={hasCalendars}
				selectedCalendarId={selectedCalendarId}
				onToggle={() =>
					setCollapsedManual((current) => !(current ?? isSmall))
				}
				onViewChange={setActiveKey}
				onCreateCalendar={handleOpenCreateModal}
				onCalendarChange={setSelectedCalendarId}
				onCalendarSelect={setCalendarDate}
			/>

			<div
				style={{
					display: "flex",
					flex: 1,
					flexDirection: "column",
					minWidth: 0,
					height: "100%",
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						background: token.colorBgContainer,
						borderBottom: `1px solid ${token.colorBorderSecondary}`,
						padding: "0 16px",
						height: 48,
					}}
				>
					<Flex
						align="center"
						justify="space-between"
						gap={12}
						style={{ height: "100%" }}
					>
						<Flex
							align="center"
							gap={8}
							style={{ minWidth: 0, overflow: "hidden", flexShrink: 1 }}
						>
							<Button.Group size="small">
								<Button
									icon={<LeftOutlined />}
									disabled={!hasCalendars}
									onClick={() => handleNavigate("prev")}
								/>
								{!isTiny && (
									<Button
										style={{ fontWeight: 600, minWidth: 56 }}
										disabled={!hasCalendars}
										onClick={() => handleNavigate("today")}
									>
										Today
									</Button>
								)}
								<Button
									icon={<RightOutlined />}
									disabled={!hasCalendars}
									onClick={() => handleNavigate("next")}
								/>
							</Button.Group>

						{!isTiny && (
							<Typography.Text strong ellipsis style={{ fontSize: 13 }}>
								{activeKey === "settings"
									? selectedCalendar
										? `${selectedCalendar.icon ? `${selectedCalendar.icon} ` : ""}${selectedCalendar.title}`
										: "Calendar Settings"
									: headerLabel}
							</Typography.Text>
						)}
						</Flex>

						{activeKey === "booking" && (
							<Flex align="center" gap={4} style={{ flexShrink: 0 }}>
								{(["month", "week", "day", "agenda"] as ViewOption[])
									.filter((option) => !isTiny || option === "day" || option === "agenda")
									.map((option) => (
										<Button
											key={option}
											size="small"
											type={view === option ? "primary" : "default"}
											disabled={!hasCalendars}
											onClick={() => setView(option)}
											style={{ fontWeight: view === option ? 700 : 500 }}
										>
											{isSmall
												? option.charAt(0).toUpperCase()
												: option.charAt(0).toUpperCase() + option.slice(1)}
										</Button>
									))}
							</Flex>
						)}

						{activeKey === "booking" && (
							<Flex align="center" gap={6} style={{ flexShrink: 0 }}>
								{!isSmall && (
									<>
										<Tooltip
											title={`Switch to ${use24h ? "12h" : "24h"} format`}
										>
											<Button
												size="small"
												type="text"
												icon={<ClockCircleOutlined />}
												disabled={!hasCalendars}
												onClick={() => setUse24h((current) => !current)}
											>
												{use24h ? "24h" : "12h"}
											</Button>
										</Tooltip>
										<Button
											size="small"
											type="text"
											icon={<LayoutOutlined />}
											disabled={!hasCalendars}
											onClick={() => setRightPanelVisible((current) => !current)}
											style={{
												color: rightPanelVisible
													? token.colorPrimary
													: token.colorTextSecondary,
											}}
										>
											Panel
										</Button>
									</>
								)}
								<Button
									size="small"
									type="primary"
									icon={<FileAddOutlined />}
									disabled={!hasCalendars}
									onClick={() => window.__hBricksNewBooking?.()}
								>
									{!isTiny && "New Booking"}
								</Button>
							</Flex>
						)}

						{activeKey === "settings" && (
							<Flex align="center" gap={8} style={{ flexShrink: 0 }}>
								{!isTiny && hasCalendars && (
									<Typography.Text
										type={settingsDirty ? "warning" : "secondary"}
										style={{ whiteSpace: "nowrap" }}
									>
										{settingsDirty ? "Unsaved changes" : "All changes saved"}
									</Typography.Text>
								)}
								<Button
									size="small"
									type="primary"
									icon={<SaveOutlined />}
									disabled={
										!hasCalendars ||
										settingsLoading ||
										settingsSaving ||
										!settingsDirty
									}
									loading={settingsSaving}
									onClick={() => {
										void handleSaveSettings();
									}}
								>
									{!isTiny && "Save Settings"}
								</Button>
							</Flex>
						)}
					</Flex>
				</div>

				<div
					style={{
						background: token.colorBgLayout,
						overflow: "auto",
						flex: 1,
						minHeight: 0,
					}}
				>
					{activeKey === "booking" && hasCalendars && (
						<BookingView
							calendarId={selectedCalendarId}
							allowDoubleBookings={Boolean(calendarSettings?.allowDoubleBookings)}
							rightPanelVisible={isSmall ? false : rightPanelVisible}
							selectedDate={calendarDate}
							view={view}
							use24h={use24h}
							onViewChange={setView}
							onNavigate={setCalendarDate}
						/>
					)}

					{activeKey === "booking" && !hasCalendars && (
						<EmptyCalendarState
							title="No calendar created"
							description={
								calendarLoadError ||
								"Create your first calendar to unlock the booking view, date navigation and calendar-related controls."
							}
						/>
					)}

					{activeKey === "settings" &&
						(hasCalendars ? (
						<CalendarSettingsPanel
							calendarName={calendarTitleDraft || selectedCalendar?.title || "Calendar"}
							settings={calendarSettings}
							loading={settingsLoading}
							error={settingsError}
							onCalendarNameChange={handleCalendarTitleChange}
							onChange={handleSettingsChange}
						/>
						) : (
							<EmptyCalendarState
								title="No calendar created"
								description={
									calendarLoadError ||
									"Create a calendar first. Until then, all calendar-related controls stay disabled."
								}
							/>
						))}
				</div>
			</div>

			<Modal
				title="Create Calendar"
				open={createModalOpen}
				okText="Create"
				okButtonProps={{
					disabled: newCalendarTitle.trim().length === 0,
					loading: createCalendarPending,
				}}
				onOk={handleCreateCalendar}
				onCancel={handleCloseCreateModal}
				cancelButtonProps={{ disabled: createCalendarPending }}
			>
				<Flex vertical gap={8} style={{ marginTop: 12 }}>
					<Typography.Text type="secondary">
						Enter a name for the new calendar.
					</Typography.Text>
					{createCalendarError && (
						<Alert type="error" showIcon message={createCalendarError} />
					)}
					<Input
						autoFocus
						placeholder="Calendar name"
						value={newCalendarTitle}
						disabled={createCalendarPending}
						onChange={(event) => setNewCalendarTitle(event.target.value)}
						onPressEnter={() => {
							void handleCreateCalendar();
						}}
					/>
				</Flex>
			</Modal>
		</div>
	);
}

export function SettingsApp() {
	const cache = useRef(createCache());
	const [themeMode, setThemeMode] = useState<AdminTheme>(() =>
		getInitialTheme(),
	);

	useEffect(() => {
		applyThemeToDOM(themeMode);
		writeStoredTheme(themeMode);
	}, [themeMode]);

	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key !== THEME_STORAGE_KEY || !isAdminTheme(event.newValue)) {
				return;
			}
			setThemeMode(event.newValue);
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	useEffect(() => {
		const handleThemeChange = (event: Event) => {
			const nextTheme = (event as CustomEvent<{ theme?: AdminTheme }>).detail
				?.theme;
			if (!isAdminTheme(nextTheme)) return;
			setThemeMode(nextTheme);
		};

		window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
		return () =>
			window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
	}, []);

	return (
		<StyleProvider cache={cache.current}>
			<ConfigProvider
				theme={{
					algorithm:
						themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
					token: { colorPrimary: "#1677ff", borderRadius: 8 },
				}}
			>
				<App themeMode={themeMode} />
			</ConfigProvider>
		</StyleProvider>
	);
}

export function mountSettingsApp(mountEl: HTMLElement) {
	const root = createRoot(mountEl);
	root.render(<SettingsApp />);
}
