import { createCache, StyleProvider } from "@ant-design/cssinjs";
import {
	CalendarOutlined,
	ClockCircleOutlined,
	DeleteOutlined,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookingView, type ViewOption } from "./BookingView";
import {
	type CalendarSettings,
	CalendarSettingsPanel,
	createDefaultCalendarSettings,
} from "./CalendarSettingsPanel";
import { getAntdLocale, getDayjsLocale, tr } from "./i18n";
import "./SettingsApp.css";

const { useBreakpoint } = Grid;
const THEME_STORAGE_KEY = "wp-react-ui-theme";
const THEME_CHANGE_EVENT = "wp-react-ui-theme-change";
const ADMIN_MODAL_Z_INDEX = 100010;
const SHELL_MODAL_OVERLAY_ID = "hbe-settings-shell-modal-overlay";
const DEFAULT_PRIMARY_COLOR = "#1677ff";

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
		locale?: string;
	};
	__hBricksNewBooking?: () => void;
}

dayjs.locale(getDayjsLocale());

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

function applyWordPressLayoutHeightFix() {
	const viewportHeight = "100vh";
	const fullHeightSelectors = [
		"html",
		"body",
		"#wpwrap",
		"#wpbody",
		"#wpbody-content",
		"#h-bricks-admin-root",
	];

	for (const selector of fullHeightSelectors) {
		const element = document.querySelector<HTMLElement>(selector);
		if (!element) continue;
		element.style.setProperty("height", "100%", "important");
		element.style.setProperty("min-height", "100%", "important");
	}

	const wpContent = document.getElementById("wpcontent");
	if (wpContent) {
		wpContent.style.setProperty("height", viewportHeight, "important");
		wpContent.style.setProperty("min-height", viewportHeight, "important");
	}

	const wpBodyContent = document.getElementById("wpbody-content");
	if (wpBodyContent) {
		wpBodyContent.style.setProperty("display", "flex", "important");
		wpBodyContent.style.setProperty("flex-direction", "column", "important");
		wpBodyContent.style.setProperty("padding", "0", "important");
		wpBodyContent.style.setProperty("padding-bottom", "0", "important");
		wpBodyContent.style.setProperty("margin", "0", "important");
	}

	const firstBodyChild = wpBodyContent?.firstElementChild;
	const wrapElement =
		firstBodyChild instanceof HTMLElement &&
		firstBodyChild.classList.contains("wrap")
			? firstBodyChild
			: null;
	if (wrapElement) {
		wrapElement.style.setProperty("height", "100%", "important");
		wrapElement.style.setProperty("min-height", "100%", "important");
		wrapElement.style.setProperty("margin", "0", "important");
		wrapElement.style.setProperty("padding", "0", "important");
	}

	const adminRoot = document.getElementById("h-bricks-admin-root");
	if (adminRoot) {
		adminRoot.style.setProperty("min-height", viewportHeight, "important");
	}
}

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

function getAdminModalContainer(): HTMLElement {
	return (
		document.getElementById("react-shell-root") ??
		document.getElementById("h-bricks-admin-root") ??
		document.body
	);
}

function getParentShellRoot(): HTMLElement | null {
	if (window.parent === window) {
		return null;
	}

	try {
		return window.parent.document.getElementById("react-shell-root");
	} catch {
		return null;
	}
}

function readCssVariableValue(
	style: CSSStyleDeclaration,
	names: string[],
): string | null {
	for (const name of names) {
		const value = style.getPropertyValue(name).trim();
		if (value) {
			return value;
		}
	}

	return null;
}

function normalizeColorCandidate(value: string): string {
	return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isUsablePrimaryColor(
	value: string | null | undefined,
): value is string {
	if (!value) {
		return false;
	}

	const normalized = normalizeColorCandidate(value);

	if (
		normalized === "" ||
		normalized === "transparent" ||
		normalized === "inherit" ||
		normalized === "initial" ||
		normalized === "currentcolor" ||
		normalized === "#000" ||
		normalized === "#000000" ||
		normalized === "#fff" ||
		normalized === "#ffffff" ||
		normalized === "black" ||
		normalized === "white" ||
		normalized === "rgb(0, 0, 0)" ||
		normalized === "rgb(255, 255, 255)" ||
		normalized === "rgba(0, 0, 0, 0)" ||
		normalized === "rgba(0, 0, 0, 1)" ||
		normalized === "rgba(255, 255, 255, 1)"
	) {
		return false;
	}

	return true;
}

function readShellPrimaryColor(): string {
	const candidateVariableNames = [
		"--shell-color-primary",
		"--wp-react-ui-color-primary",
		"--color-accent-primary",
		"--ant-color-primary",
		"--ant-primary-color",
	];
	const shellRoot = getParentShellRoot();

	try {
		if (shellRoot) {
			const shellStyle = window.parent.getComputedStyle(shellRoot);
			const shellVariable = readCssVariableValue(
				shellStyle,
				candidateVariableNames,
			);

			if (isUsablePrimaryColor(shellVariable)) {
				return shellVariable;
			}

			const rootStyle = window.parent.getComputedStyle(
				shellRoot.ownerDocument.documentElement,
			);
			const rootVariable = readCssVariableValue(
				rootStyle,
				candidateVariableNames,
			);

			if (isUsablePrimaryColor(rootVariable)) {
				return rootVariable;
			}

			const primaryButton = shellRoot.querySelector<HTMLElement>(
				".ant-btn-primary, .ant-menu-item-selected, [aria-current='page']",
			);

			if (primaryButton) {
				const buttonStyle = window.parent.getComputedStyle(primaryButton);
				const buttonBackground = buttonStyle.backgroundColor.trim();
				const buttonBorder = buttonStyle.borderTopColor.trim();
				const buttonColor = buttonStyle.color.trim();

				if (isUsablePrimaryColor(buttonBackground)) {
					return buttonBackground;
				}

				if (isUsablePrimaryColor(buttonBorder)) {
					return buttonBorder;
				}

				if (isUsablePrimaryColor(buttonColor)) {
					return buttonColor;
				}
			}
		}
	} catch {
		// Ignore cross-document style access failures.
	}

	const localRoot = document.getElementById("h-bricks-admin-root");
	if (localRoot) {
		const localStyle = getComputedStyle(localRoot);
		const localVariable = readCssVariableValue(
			localStyle,
			candidateVariableNames,
		);

		if (isUsablePrimaryColor(localVariable)) {
			return localVariable;
		}
	}

	return DEFAULT_PRIMARY_COLOR;
}

async function createCalendarRequest(title: string): Promise<AdminCalendar> {
	const { restUrl, restNonce } = getAdminApiConfig();

	if (!restUrl) {
		throw new Error(tr("REST URL missing."));
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
				: tr("Calendar could not be created."),
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
				: tr("Calendars could not be loaded."),
		);
	}

	return Array.isArray(data?.items) ? (data.items as AdminCalendar[]) : [];
}

async function fetchCalendarSettingsRequest(
	calendarId: number,
): Promise<CalendarSettingsResponse> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/settings`,
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
				: tr("Settings could not be loaded."),
		);
	}

	return {
		item: (data?.item as AdminCalendar) ?? {
			id: calendarId,
			title: tr("Calendar"),
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
	const response = await fetch(
		`${restUrl}admin/calendars/${calendarId}/settings`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-WP-Nonce": restNonce,
			},
			body: JSON.stringify({ settings, title }),
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: tr("Settings could not be saved."),
		);
	}

	return {
		item: (data?.item as AdminCalendar) ?? {
			id: calendarId,
			title: tr("Calendar"),
			slug: "",
		},
		settings:
			(data?.settings as CalendarSettings) ?? createDefaultCalendarSettings(),
	};
}

async function deleteCalendarRequest(calendarId: number): Promise<void> {
	const { restUrl, restNonce } = getAdminApiConfig();
	const response = await fetch(`${restUrl}admin/calendars/${calendarId}`, {
		method: "DELETE",
		headers: {
			"X-WP-Nonce": restNonce,
		},
	});

	if (response.ok) {
		return;
	}

	const data = await response.json();
	throw new Error(
		typeof data?.message === "string"
			? data.message
			: tr("Calendar could not be deleted."),
	);
}

function Logo({ collapsed }: { collapsed: boolean }) {
	const { token } = theme.useToken();

	return (
		<Flex
			align="center"
			gap={12}
			style={{
				height: 64,
				borderBottom: "1px solid var(--hbe-chrome-border)",
				background: "var(--hbe-chrome-bg)",
				padding: "0 18px",
				flexShrink: 0,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					width: 32,
					height: 32,
					borderRadius: 10,
					background: token.colorPrimary,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 13,
					fontWeight: 700,
					color: "#fff",
					flexShrink: 0,
					letterSpacing: -0.5,
				}}
			>
				HB
			</div>
			{!collapsed && (
				<Typography.Text
					strong
					style={{
						fontSize: 15,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					H-Bricks
				</Typography.Text>
			)}
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
	activeKey,
	calendars,
	calendarDate,
	hasCalendars,
	selectedCalendarId,
	onViewChange,
	onCreateCalendar,
	onCalendarChange,
	onCalendarSelect,
}: {
	collapsed: boolean;
	activeKey: AdminViewKey;
	calendars: AdminCalendar[];
	calendarDate: Dayjs;
	hasCalendars: boolean;
	selectedCalendarId: number;
	onViewChange: (key: AdminViewKey) => void;
	onCreateCalendar: () => void;
	onCalendarChange: (calendarId: number) => void;
	onCalendarSelect: (date: Dayjs) => void;
}) {
	const sidebarWidth = collapsed ? 64 : 220;

	return (
		<div
			style={{
				width: sidebarWidth,
				minWidth: sidebarWidth,
				maxWidth: sidebarWidth,
				height: "100%",
				minHeight: "100%",
				transition:
					"width 0.24s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.24s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
				borderRight: "1px solid var(--hbe-chrome-border)",
				background: "var(--hbe-chrome-bg)",
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
					background: "var(--hbe-chrome-bg)",
				}}
			>
				<Logo collapsed={collapsed} />

				<div style={{ padding: collapsed ? 8 : 12 }}>
					<Flex vertical gap={8}>
						<Tooltip title={collapsed ? tr("Calendar") : ""} placement="right">
							<Button
								type={activeKey === "booking" ? "primary" : "default"}
								icon={<CalendarOutlined />}
								block
								disabled={!hasCalendars}
								style={{
									justifyContent: collapsed ? "center" : "flex-start",
									fontWeight: activeKey === "booking" ? 700 : 600,
									height: 40,
								}}
								onClick={() => onViewChange("booking")}
							>
								{!collapsed && tr("Calendar")}
							</Button>
						</Tooltip>
						<Tooltip title={collapsed ? tr("Settings") : ""} placement="right">
							<Button
								type={activeKey === "settings" ? "primary" : "default"}
								icon={<SettingOutlined />}
								block
								disabled={!hasCalendars}
								style={{
									justifyContent: collapsed ? "center" : "flex-start",
									fontWeight: activeKey === "settings" ? 700 : 600,
									height: 40,
								}}
								onClick={() => onViewChange("settings")}
							>
								{!collapsed && tr("Settings")}
							</Button>
						</Tooltip>
					</Flex>
				</div>

				{!collapsed && hasCalendars && (
					<div
						style={{
							padding: "4px 12px 12px",
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
							{tr("Calendars")}
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

				<div style={{ padding: collapsed ? "0 8px 8px" : "0 12px 8px", marginTop: "auto" }}>
					<Tooltip
						title={collapsed ? tr("New Calendar") : ""}
						placement="right"
					>
						<Button
							type="primary"
							icon={<PlusOutlined />}
							block
							onClick={onCreateCalendar}
							style={{
								justifyContent: collapsed ? "center" : "flex-start",
								height: 40,
							}}
						>
							{!collapsed && tr("New Calendar")}
						</Button>
					</Tooltip>
				</div>
				{!collapsed && hasCalendars && (
					<>
						<Divider style={{ margin: 0 }} />
						<div
							style={{
		
								padding: 0,
								display: "flex",
								flexDirection: "column",
							}}
						>
							<ConfigProvider
								theme={{ token: { fontSize: 11, fontSizeSM: 10 } }}
							>
								<Calendar
									className="hbe-settings-sidebar-calendar"
									fullscreen={false}
									value={calendarDate}
									onSelect={onCalendarSelect}
									style={{ width: "100%" }}
								/>
							</ConfigProvider>
						</div>
					</>
				)}
			</Flex>
		</div>
	);
}

function App() {
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
	const [calendarSettings, setCalendarSettings] =
		useState<CalendarSettings | null>(null);
	const [calendarTitleDraft, setCalendarTitleDraft] = useState("");
	const [settingsLoading, setSettingsLoading] = useState(false);
	const [settingsSaving, setSettingsSaving] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deletingCalendar, setDeletingCalendar] = useState(false);
	const [settingsError, setSettingsError] = useState("");
	const [settingsDirty, setSettingsDirty] = useState(false);
	const { token } = theme.useToken();
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
	const getViewLabel = useCallback(
		(option: ViewOption) => {
			const translated = tr(option.charAt(0).toUpperCase() + option.slice(1));

			return isSmall ? translated.charAt(0).toUpperCase() : translated;
		},
		[isSmall],
	);

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
						: tr("Calendars could not be loaded."),
				);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		applyWordPressScreenMetaButtonFix();
		applyWordPressLayoutHeightFix();

		const observer = new MutationObserver(() => {
			applyWordPressScreenMetaButtonFix();
			applyWordPressLayoutHeightFix();
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		const handleResize = () => {
			applyWordPressLayoutHeightFix();
		};
		window.addEventListener("resize", handleResize);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", handleResize);
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
						: tr("Settings could not be loaded."),
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
					: tr("Calendar could not be created."),
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
			setSettingsError(tr("Calendar name is required."));
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
					: tr("Settings could not be saved."),
			);
		} finally {
			setSettingsSaving(false);
		}
	}, [
		calendarSettings,
		calendarTitleDraft,
		selectedCalendarId,
		settingsSaving,
	]);

	const handleDeleteCalendar = useCallback(async () => {
		if (!selectedCalendarId || deletingCalendar) {
			return;
		}

		setDeletingCalendar(true);
		setSettingsError("");

		try {
			await deleteCalendarRequest(selectedCalendarId);
			const remainingCalendars = calendars.filter(
				(calendar) => calendar.id !== selectedCalendarId,
			);

			setCalendars(remainingCalendars);
			setSelectedCalendarId(remainingCalendars[0]?.id ?? 0);
			setCalendarSettings(null);
			setCalendarTitleDraft("");
			setSettingsDirty(false);
			setDeleteModalOpen(false);
			setActiveKey("booking");
		} catch (error) {
			setSettingsError(
				error instanceof Error
					? error.message
					: tr("Calendar could not be deleted."),
			);
		} finally {
			setDeletingCalendar(false);
		}
	}, [calendars, deletingCalendar, selectedCalendarId]);

	const handleCloseDeleteModal = useCallback(() => {
		if (deletingCalendar) {
			return;
		}

		setDeleteModalOpen(false);
	}, [deletingCalendar]);


	const isSettingsModalOpen = createModalOpen || deleteModalOpen;

	const handleCloseSettingsModal = useCallback(() => {
		if (deleteModalOpen) {
			handleCloseDeleteModal();
			return;
		}
		if (createModalOpen) {
			handleCloseCreateModal();
		}
	}, [
		createModalOpen,
		deleteModalOpen,
		handleCloseCreateModal,
		handleCloseDeleteModal,
	]);

	useEffect(() => {
		const shellRoot = getParentShellRoot();

		if (!isSettingsModalOpen || !shellRoot) {
			shellRoot?.querySelector(`#${SHELL_MODAL_OVERLAY_ID}`)?.remove();
			return;
		}

		const parentDocument = shellRoot.ownerDocument;
		shellRoot.querySelector(`#${SHELL_MODAL_OVERLAY_ID}`)?.remove();

		const overlay = parentDocument.createElement("div");
		overlay.id = SHELL_MODAL_OVERLAY_ID;
		overlay.setAttribute("aria-hidden", "true");
		Object.assign(overlay.style, {
			position: "fixed",
			inset: "0",
			display: "grid",
			gridTemplateColumns: "var(--sidebar-width, 240px) minmax(0, 1fr)",
			gridTemplateRows: "var(--shell-navbar-height, 64px) 1fr",
			gridTemplateAreas: '"sidebar navbar" "sidebar content"',
			pointerEvents: "none",
			zIndex: String(ADMIN_MODAL_Z_INDEX - 1),
		} satisfies Partial<CSSStyleDeclaration>);

		const sidebarBackdrop = parentDocument.createElement("button");
		sidebarBackdrop.type = "button";
		sidebarBackdrop.tabIndex = -1;
		sidebarBackdrop.setAttribute("aria-label", tr("Close dialog"));
		Object.assign(sidebarBackdrop.style, {
			gridArea: "sidebar",
			background: "rgba(0, 0, 0, 0.45)",
			border: "0",
			padding: "0",
			margin: "0",
			cursor: "default",
			pointerEvents: "auto",
		} satisfies Partial<CSSStyleDeclaration>);
		sidebarBackdrop.addEventListener("click", handleCloseSettingsModal);

		const navbarBackdrop = parentDocument.createElement("button");
		navbarBackdrop.type = "button";
		navbarBackdrop.tabIndex = -1;
		navbarBackdrop.setAttribute("aria-label", tr("Close dialog"));
		Object.assign(navbarBackdrop.style, {
			gridArea: "navbar",
			background: "rgba(0, 0, 0, 0.45)",
			border: "0",
			padding: "0",
			margin: "0",
			cursor: "default",
			pointerEvents: "auto",
		} satisfies Partial<CSSStyleDeclaration>);
		navbarBackdrop.addEventListener("click", handleCloseSettingsModal);

		overlay.append(sidebarBackdrop, navbarBackdrop);
		shellRoot.appendChild(overlay);

		return () => {
			sidebarBackdrop.removeEventListener("click", handleCloseSettingsModal);
			navbarBackdrop.removeEventListener("click", handleCloseSettingsModal);
			overlay.remove();
		};
	}, [handleCloseSettingsModal, isSettingsModalOpen]);

	const headerLabel = (() => {
		if (!hasCalendars || !selectedCalendar) {
			return tr("No calendar created");
		}

		if (view === "week") {
			const start = calendarDate.startOf("isoWeek");
			const end = calendarDate.endOf("isoWeek");
			return isSmall
				? `${start.format("MMM D")} – ${end.format("D")}`
				: `${start.format("MMM D")} – ${end.format("D, YYYY")}`;
		}

		if (view === "day") {
			return calendarDate.format(isSmall ? "ddd, MMM D" : "dddd, MMM D, YYYY");
		}

		if (view === "month") {
			return calendarDate.format("MMMM YYYY");
		}

		return tr("Agenda");
	})();

	return (
		<>
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
					activeKey={activeKey}
					calendars={displayCalendars}
					calendarDate={calendarDate}
					hasCalendars={hasCalendars}
					selectedCalendarId={selectedCalendarId}
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
						className="hbe-settings-toolbar"
						style={{
							background: "var(--hbe-chrome-bg)",
							borderBottom: "1px solid var(--hbe-chrome-border)",
							padding: "0 16px",
							height: 64,
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
								<Tooltip
									title={
										collapsed
											? tr("Expand sidebar")
											: tr("Collapse sidebar")
									}
								>
									<Button
										type="default"
										size="large"
										icon={
											collapsed ? (
												<MenuUnfoldOutlined />
											) : (
												<MenuFoldOutlined />
											)
										}
										style={{
											flexShrink: 0,
											borderColor: "var(--hbe-chrome-border)",
											background: "var(--hbe-chrome-surface)",
										}}
										onClick={() =>
											setCollapsedManual(
												(current) => !(current ?? isSmall),
											)
										}
									/>
								</Tooltip>
								<Button.Group size="small">
									<Button
										icon={<LeftOutlined />}
										disabled={!hasCalendars}
										onClick={() => handleNavigate("prev")}
									/>
									{!isTiny && (
										<Button
											style={{
												minWidth: 64,
												fontWeight: 600,
											}}
											disabled={!hasCalendars}
											onClick={() => handleNavigate("today")}
										>
											{tr("Today")}
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
												: tr("Calendar Settings")
											: headerLabel}
									</Typography.Text>
								)}
							</Flex>

							{activeKey === "booking" && (
								<Flex align="center" gap={4} style={{ flexShrink: 0 }}>
									{(["month", "week", "day", "agenda"] as ViewOption[])
										.filter(
											(option) =>
												!isTiny || option === "day" || option === "agenda",
										)
										.map((option) => (
											<Button
												key={option}
												size="small"
												type={view === option ? "primary" : "default"}
												disabled={!hasCalendars}
												onClick={() => setView(option)}
												style={{
													fontWeight: view === option ? 700 : 500,
												}}
											>
												{getViewLabel(option)}
											</Button>
										))}
								</Flex>
							)}

							{activeKey === "booking" && (
								<Flex align="center" gap={6} style={{ flexShrink: 0 }}>
									{!isSmall && (
										<>
											<Tooltip
												title={`${tr("Switch to")} ${use24h ? "12h" : "24h"} ${tr("format")}`}
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
												onClick={() =>
													setRightPanelVisible((current) => !current)
												}
												style={{
													color: rightPanelVisible
														? token.colorPrimary
														: token.colorTextSecondary,
												}}
											>
												{tr("Panel")}
											</Button>
										</>
									)}
									<Button
										type="primary"
										icon={<FileAddOutlined />}
										disabled={!hasCalendars}
										onClick={() => window.__hBricksNewBooking?.()}
									>
										{!isTiny && tr("New Booking")}
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
											{settingsDirty
												? tr("Unsaved changes")
												: tr("All changes saved")}
										</Typography.Text>
									)}
									<Tooltip title={tr("Delete Calendar")}>
										<Button
											size="small"
											danger
											type="text"
											icon={<DeleteOutlined />}
											disabled={
												!hasCalendars ||
												settingsLoading ||
												settingsSaving ||
												deletingCalendar
											}
											onClick={() => setDeleteModalOpen(true)}
										/>
									</Tooltip>
									<Button
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
										{!isTiny && tr("Save Settings")}
									</Button>
								</Flex>
							)}
						</Flex>
					</div>

					<div
						className={
							activeKey === "booking"
								? "hbe-settings-booking-workspace"
								: undefined
						}
						style={{
							background: token.colorBgLayout,
							overflow: activeKey === "booking" ? "hidden" : "auto",
							display: "flex",
							flexDirection: "column",
							flex: 1,
							minHeight: 0,
							padding: 0,
						}}
					>
						{activeKey === "booking" && hasCalendars && (
							<BookingView
								calendarId={selectedCalendarId}
								allowDoubleBookings={Boolean(
									calendarSettings?.allowDoubleBookings,
								)}
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
								title={tr("No calendar created")}
								description={
									calendarLoadError ||
									tr(
										"Create your first calendar to unlock the booking view, date navigation and calendar-related controls.",
									)
								}
							/>
						)}

						{activeKey === "settings" &&
							(hasCalendars ? (
								<CalendarSettingsPanel
									calendarId={selectedCalendarId}
									calendarName={
										calendarTitleDraft ||
										selectedCalendar?.title ||
										tr("Calendar")
									}
									settings={calendarSettings}
									loading={settingsLoading}
									error={settingsError}
									onCalendarNameChange={handleCalendarTitleChange}
									onChange={handleSettingsChange}
								/>
							) : (
								<EmptyCalendarState
									title={tr("No calendar created")}
									description={
										calendarLoadError ||
										tr(
											"Create a calendar first. Until then, all calendar-related controls stay disabled.",
										)
									}
								/>
							))}
					</div>
				</div>
			</div>

		{isSettingsModalOpen && (
			<div
				aria-hidden="true"
				onClick={handleCloseSettingsModal}
				style={{
					position: "fixed",
					inset: 0,
					background: "rgba(0, 0, 0, 0.45)",
					zIndex: ADMIN_MODAL_Z_INDEX - 1,
				}}
			/>
		)}

		<Modal
			title={tr("Create Calendar")}
			getContainer={getAdminModalContainer}
			destroyOnHidden
			mask={false}
			open={createModalOpen}
			zIndex={ADMIN_MODAL_Z_INDEX}
				okText={tr("Create")}
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
						{tr("Enter a name for the new calendar.")}
					</Typography.Text>
					{createCalendarError && (
						<Alert type="error" showIcon message={createCalendarError} />
					)}
					<Input
						autoFocus
						placeholder={tr("Calendar name")}
						value={newCalendarTitle}
						disabled={createCalendarPending}
						onChange={(event) => setNewCalendarTitle(event.target.value)}
						onPressEnter={() => {
							void handleCreateCalendar();
						}}
					/>
				</Flex>
			</Modal>

			<Modal
				title={tr("Delete Calendar")}
				getContainer={getAdminModalContainer}
				destroyOnHidden
				mask={false}
				open={deleteModalOpen}
				zIndex={ADMIN_MODAL_Z_INDEX}
				okText={tr("Delete")}
				okButtonProps={{
					danger: true,
					loading: deletingCalendar,
					icon: <DeleteOutlined />,
				}}
				onOk={() => {
					void handleDeleteCalendar();
				}}
				onCancel={handleCloseDeleteModal}
				cancelButtonProps={{ disabled: deletingCalendar }}
			>
				<Flex vertical gap={8} style={{ marginTop: 12 }}>
					<Typography.Text>
						{tr("Are you sure you want to delete this calendar?")}
					</Typography.Text>
					<Typography.Text type="secondary">
						{tr(
							"This permanently removes the calendar and all bookings assigned to it.",
						)}
					</Typography.Text>
				</Flex>
			</Modal>
		</>
	);
}

export function SettingsApp() {
	const cache = useRef(createCache());
	const [themeMode, setThemeMode] = useState<AdminTheme>(() =>
		getInitialTheme(),
	);
	const [primaryColor, setPrimaryColor] = useState<string>(() =>
		readShellPrimaryColor(),
	);

	useEffect(() => {
		applyThemeToDOM(themeMode);
		writeStoredTheme(themeMode);
	}, [themeMode]);

	useEffect(() => {
		setPrimaryColor(readShellPrimaryColor());
	}, []);

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
				locale={getAntdLocale()}
				theme={{
					algorithm:
						themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
					token: {
						colorPrimary: primaryColor,
						borderRadius: 8,
						...(themeMode === "dark" && {
							colorBgContainer: "#131c2b",
							colorBgElevated: "#192437",
							colorBgLayout: "#0f1723",
							colorFillAlter: "#1a2435",
							colorFillSecondary: "#1e2a3b",
							colorBorderSecondary: "rgba(255,255,255,0.09)",
							colorBorder: "rgba(255,255,255,0.12)",
						}),
					},
					components: {
						...(themeMode === "dark" && {
							Button: {
								defaultBg: "rgba(255,255,255,0.06)",
								defaultBorderColor: "rgba(255,255,255,0.18)",
								defaultColor: "#e2e8f0",
								defaultHoverBg: "rgba(255,255,255,0.10)",
								defaultHoverBorderColor: "rgba(255,255,255,0.28)",
								defaultHoverColor: "#f8fafc",
								defaultActiveBg: "rgba(255,255,255,0.13)",
								defaultActiveBorderColor: "rgba(255,255,255,0.32)",
							},
						}),
					},
				}}
			>
				<App />
			</ConfigProvider>
		</StyleProvider>
	);
}

export function mountSettingsApp(mountEl: HTMLElement) {
	// Apply theme to DOM synchronously before first render to avoid flash of
	// unstyled content when a dark theme is stored from a previous session.
	applyThemeToDOM(getInitialTheme());
	const root = createRoot(mountEl);
	root.render(<SettingsApp />);
}
