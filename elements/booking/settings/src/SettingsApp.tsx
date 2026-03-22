import { createCache, StyleProvider } from "@ant-design/cssinjs";
import {
	CalendarOutlined,
	ClockCircleOutlined,
	LayoutOutlined,
	LeftOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	PlusOutlined,
	RightOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import {
	Button,
	Calendar,
	ConfigProvider,
	Divider,
	Flex,
	Grid,
	Layout,
	Menu,
	Tooltip,
	Typography,
	theme,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookingView, type ViewOption } from "./BookingView";

const { Sider, Content, Header } = Layout;
const { useBreakpoint } = Grid;
const THEME_STORAGE_KEY = "wp-react-ui-theme";
const THEME_CHANGE_EVENT = "wp-react-ui-theme-change";

type AdminTheme = "light" | "dark";

// ── Window extension ──────────────────────────────────────────────
interface HBricksWindow {
	hBricksAdmin?: {
		theme?: AdminTheme;
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

function applyThemeToDOM(themeMode: AdminTheme) {
	document.body.setAttribute("data-theme", themeMode);
	document.body.classList.toggle("wp-react-dark", themeMode === "dark");
	window.hBricksAdmin = { ...window.hBricksAdmin, theme: themeMode };
	document
		.getElementById("h-bricks-admin-root")
		?.setAttribute("data-theme", themeMode);
}

// ── Menu items ────────────────────────────────────────────────────
function useMenuItems(collapsed: boolean): MenuProps["items"] {
	return useMemo(
		() => [
			{
				key: "booking",
				icon: <CalendarOutlined />,
				label: collapsed ? null : "Booking",
				title: "Booking",
			},
			{
				key: "settings",
				icon: <SettingOutlined />,
				label: collapsed ? null : "Settings",
				title: "Settings",
			},
		],
		[collapsed],
	);
}

// ── Logo ──────────────────────────────────────────────────────────
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

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({
	collapsed,
	isDark,
	activeKey,
	calendarDate,
	onToggle,
	onSelect,
	onCalendarSelect,
}: {
	collapsed: boolean;
	isDark: boolean;
	activeKey: string;
	calendarDate: Dayjs;
	onToggle: () => void;
	onSelect: (key: string) => void;
	onCalendarSelect: (date: Dayjs) => void;
}) {
	const { token } = theme.useToken();
	const menuItems = useMenuItems(collapsed);

	return (
		<Sider
			theme={isDark ? "dark" : "light"}
			collapsible
			collapsed={collapsed}
			trigger={null}
			width={220}
			collapsedWidth={64}
			style={{
				borderRight: `1px solid ${token.colorBorderSecondary}`,
				background: token.colorBgContainer,
				position: "sticky",
				top: 0,
				height: "100vh",
				overflow: "hidden",
				flexShrink: 0,
			}}
		>
			<Flex
				vertical
				style={{ height: "100%", background: token.colorBgContainer }}
			>
				<Logo collapsed={collapsed} onToggle={onToggle} />

				<Menu
					mode="inline"
					selectedKeys={[activeKey]}
					items={menuItems}
					inlineCollapsed={collapsed}
					onClick={({ key }) => onSelect(key)}
					style={{ borderRight: 0, padding: 8 }}
				/>

				{/* Spacer */}
				<div style={{ flex: 1 }} />

				{/* New Calendar Button */}
				<div style={{ padding: collapsed ? "0 8px 12px" : "0 12px 12px" }}>
					<Tooltip title={collapsed ? "New Calendar" : ""} placement="right">
						<Button
							type="primary"
							icon={<PlusOutlined />}
							block
							onClick={() => window.__hBricksNewBooking?.()}
						>
							{!collapsed && "New Calendar"}
						</Button>
					</Tooltip>
				</div>

				{/* Mini calendar — hidden when collapsed */}
				{!collapsed && (
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
		</Sider>
	);
}

// ── App ───────────────────────────────────────────────────────────
function App({ themeMode }: { themeMode: AdminTheme }) {
	const screens = useBreakpoint();

	// md = ≥768px, sm = ≥576px
	const isSmall = !screens.md; // < 768px → auto-collapse sidebar
	const isTiny = !screens.sm; // < 576px → hide label + panel button

	const [activeKey, setActiveKey] = useState("booking");
	const [collapsedManual, setCollapsedManual] = useState(false);
	const [rightPanelVisible, setRightPanelVisible] = useState(true);
	const [calendarDate, setCalendarDate] = useState<Dayjs>(dayjs());
	const [view, setView] = useState<ViewOption>("week");
	const [use24h, setUse24h] = useState(true);
	const { token } = theme.useToken();
	const isDark = themeMode === "dark";

	// Sidebar is collapsed when the user toggled it OR the screen is small.
	const collapsed = collapsedManual || isSmall;

	// When screen grows back to md, un-force the collapse so the user's
	// manual preference is restored.
	useEffect(() => {
		if (!isSmall) setCollapsedManual((prev) => prev);
	}, [isSmall]);

	// Switch to "day" view on tiny screens — week/month are too cramped.
	useEffect(() => {
		if (isTiny && (view === "week" || view === "month")) {
			setView("day");
		}
	}, [isTiny, view]);

	const handleNavigate = useCallback(
		(direction: "prev" | "next" | "today") => {
			setCalendarDate((d) => {
				if (direction === "today") return dayjs();
				const unit =
					view === "month" ? "month" : view === "week" ? "week" : "day";
				return direction === "prev" ? d.subtract(1, unit) : d.add(1, unit);
			});
		},
		[view],
	);

	const headerLabel = (() => {
		if (view === "week") {
			const start = calendarDate.startOf("isoWeek");
			const end = calendarDate.endOf("isoWeek");
			return isSmall
				? `${start.format("MMM D")} – ${end.format("D")}`
				: `${start.format("MMM D")} – ${end.format("D, YYYY")}`;
		}
		if (view === "day")
			return calendarDate.format(isSmall ? "ddd, MMM D" : "dddd, MMM D, YYYY");
		if (view === "month") return calendarDate.format("MMMM YYYY");
		return "Agenda";
	})();

	return (
		<Layout style={{ minHeight: "100vh" }}>
			<Sidebar
				collapsed={collapsed}
				isDark={isDark}
				activeKey={activeKey}
				calendarDate={calendarDate}
				onToggle={() => setCollapsedManual((c) => !c)}
				onSelect={setActiveKey}
				onCalendarSelect={setCalendarDate}
			/>

			<Layout>
				<Header
					style={{
						background: token.colorBgContainer,
						borderBottom: `1px solid ${token.colorBorderSecondary}`,
						padding: "0 16px",
						position: "sticky",
						top: 0,
						zIndex: 10,
						height: 48,
					}}
				>
					<Flex
						align="center"
						justify="space-between"
						gap={12}
						style={{ height: "100%" }}
					>
						{/* Left: nav + label */}
						<Flex
							align="center"
							gap={8}
							style={{ minWidth: 0, overflow: "hidden", flexShrink: 1 }}
						>
							<Button.Group size="small">
								<Button
									icon={<LeftOutlined />}
									onClick={() => handleNavigate("prev")}
								/>
								{!isTiny && (
									<Button
										style={{ fontWeight: 600, minWidth: 56 }}
										onClick={() => handleNavigate("today")}
									>
										Today
									</Button>
								)}
								<Button
									icon={<RightOutlined />}
									onClick={() => handleNavigate("next")}
								/>
							</Button.Group>

							{!isTiny && (
								<Typography.Text strong ellipsis style={{ fontSize: 13 }}>
									{headerLabel}
								</Typography.Text>
							)}
						</Flex>

						{/* Center: view switcher */}
						{activeKey === "booking" && (
							<Flex align="center" gap={4} style={{ flexShrink: 0 }}>
								{(["month", "week", "day", "agenda"] as ViewOption[])
									.filter((v) => !isTiny || v === "day" || v === "agenda")
									.map((v) => (
										<Button
											key={v}
											size="small"
											type={view === v ? "primary" : "default"}
											onClick={() => setView(v)}
											style={{ fontWeight: view === v ? 700 : 500 }}
										>
											{isSmall
												? v.charAt(0).toUpperCase()
												: v.charAt(0).toUpperCase() + v.slice(1)}
										</Button>
									))}
							</Flex>
						)}

						{/* Right: actions */}
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
												onClick={() => setUse24h((v) => !v)}
											>
												{use24h ? "24h" : "12h"}
											</Button>
										</Tooltip>
										<Button
											size="small"
											type="text"
											icon={<LayoutOutlined />}
											onClick={() => setRightPanelVisible((v) => !v)}
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
									icon={<PlusOutlined />}
									onClick={() => window.__hBricksNewBooking?.()}
								>
									{!isTiny && "New"}
								</Button>
							</Flex>
						)}
					</Flex>
				</Header>

				<Content
					style={{
						background: token.colorBgLayout,
						overflow: "hidden",
						height: "calc(100vh - 48px)",
					}}
				>
					{activeKey === "booking" && (
						<BookingView
							rightPanelVisible={isSmall ? false : rightPanelVisible}
							selectedDate={calendarDate}
							view={view}
							use24h={use24h}
							onViewChange={setView}
							onNavigate={setCalendarDate}
						/>
					)}
					{activeKey === "settings" && (
						<Typography.Text
							type="secondary"
							style={{ padding: 24, display: "block" }}
						>
							Settings content here.
						</Typography.Text>
					)}
				</Content>
			</Layout>
		</Layout>
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
