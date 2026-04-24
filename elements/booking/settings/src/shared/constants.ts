import type { ThemeConfig } from "antd";

export const ADMIN_MODAL_Z_INDEX = 100010;
export const BOOKING_MODAL_Z_INDEX = 100010;

export const DEFAULT_PRIMARY_COLOR =
	typeof document !== "undefined"
		? getComputedStyle(document.documentElement)
				.getPropertyValue("--hbe-primary")
				.trim() || "#1677ff"
		: "#1677ff";

export const DARK_THEME_TOKENS: NonNullable<ThemeConfig["token"]> = {
	colorBgContainer: "#131c2b",
	colorBgElevated: "#192437",
	colorBgLayout: "#0f1723",
	colorFillAlter: "#1a2435",
	colorFillSecondary: "#1e2a3b",
	colorBorderSecondary: "rgba(255,255,255,0.09)",
	colorBorder: "rgba(255,255,255,0.12)",
};

export const DARK_THEME_COMPONENTS: NonNullable<ThemeConfig["components"]> = {
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
};
