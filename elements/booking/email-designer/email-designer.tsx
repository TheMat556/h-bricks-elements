import { createCache, StyleProvider } from "@ant-design/cssinjs";
import { MailOutlined, SaveOutlined } from "@ant-design/icons";
import {
	Alert,
	App,
	Button,
	ConfigProvider,
	Flex,
	Spin,
	Typography,
	theme,
} from "antd";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
	compileEmailTemplate,
	createDefaultEmailTemplate,
	EmailDesigner,
	type EmailTemplateSettings,
} from "../settings/src/EmailDesigner";
import { getAntdLocale, tr } from "../settings/src/i18n";
import "../settings/src/SettingsApp.css";
import {
	DARK_THEME_COMPONENTS,
	DARK_THEME_TOKENS,
	DEFAULT_PRIMARY_COLOR,
} from "../settings/src/shared/constants";

// ─── Theme infrastructure (mirrors SettingsApp.tsx) ────────────────────────

const THEME_STORAGE_KEY = "wp-react-ui-theme";
const THEME_CHANGE_EVENT = "wp-react-ui-theme-change";
const EMAIL_DESIGNER_ROOT_ID = "h-bricks-email-designer-root";

type AdminTheme = "light" | "dark";

interface EmailDesignerBoot {
	theme?: AdminTheme;
	restUrl?: string;
	restNonce?: string;
	siteName?: string;
	locale?: string;
}

declare global {
	interface Window {
		hBricksEmailDesigner?: EmailDesignerBoot;
		hBricksAdmin?: EmailDesignerBoot;
	}
}

// Make i18n happy — it reads window.hBricksAdmin.locale.
if (typeof window !== "undefined" && !window.hBricksAdmin) {
	window.hBricksAdmin = window.hBricksEmailDesigner ?? {};
}

function isAdminTheme(value: unknown): value is AdminTheme {
	return value === "light" || value === "dark";
}

function readStoredTheme(): AdminTheme | null {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return isAdminTheme(stored) ? stored : null;
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
	const stored = readStoredTheme();
	if (stored) return stored;
	const server = window.hBricksEmailDesigner?.theme;
	return isAdminTheme(server) ? server : "light";
}

function applyThemeToDOM(themeMode: AdminTheme) {
	document.body.setAttribute("data-theme", themeMode);
	document.body.classList.toggle("wp-react-dark", themeMode === "dark");
	window.hBricksAdmin = { ...window.hBricksAdmin, theme: themeMode };
	document
		.getElementById(EMAIL_DESIGNER_ROOT_ID)
		?.setAttribute("data-theme", themeMode);
}

function getParentShellRoot(): HTMLElement | null {
	if (window.parent === window) return null;
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
		if (value) return value;
	}
	return null;
}

function isUsablePrimaryColor(
	value: string | null | undefined,
): value is string {
	if (!value) return false;
	const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
	const unusable = new Set([
		"",
		"transparent",
		"inherit",
		"initial",
		"currentcolor",
		"#000",
		"#000000",
		"#fff",
		"#ffffff",
		"black",
		"white",
		"rgb(0, 0, 0)",
		"rgb(255, 255, 255)",
		"rgba(0, 0, 0, 0)",
		"rgba(0, 0, 0, 1)",
		"rgba(255, 255, 255, 1)",
	]);
	return !unusable.has(normalized);
}

function readShellPrimaryColor(): string {
	const candidateVars = [
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
			const shellVar = readCssVariableValue(shellStyle, candidateVars);
			if (isUsablePrimaryColor(shellVar)) return shellVar;

			const rootStyle = window.parent.getComputedStyle(
				shellRoot.ownerDocument.documentElement,
			);
			const rootVar = readCssVariableValue(rootStyle, candidateVars);
			if (isUsablePrimaryColor(rootVar)) return rootVar;

			const primaryBtn = shellRoot.querySelector<HTMLElement>(
				".ant-btn-primary, .ant-menu-item-selected, [aria-current='page']",
			);
			if (primaryBtn) {
				const btnStyle = window.parent.getComputedStyle(primaryBtn);
				const bg = btnStyle.backgroundColor.trim();
				const border = btnStyle.borderTopColor.trim();
				const color = btnStyle.color.trim();
				if (isUsablePrimaryColor(bg)) return bg;
				if (isUsablePrimaryColor(border)) return border;
				if (isUsablePrimaryColor(color)) return color;
			}
		}
	} catch {
		// Ignore cross-document access failures.
	}

	const localRoot = document.getElementById(EMAIL_DESIGNER_ROOT_ID);
	if (localRoot) {
		const localStyle = getComputedStyle(localRoot);
		const localVar = readCssVariableValue(localStyle, candidateVars);
		if (isUsablePrimaryColor(localVar)) return localVar;
	}

	return DEFAULT_PRIMARY_COLOR;
}

function applyWordPressLayoutHeightFix() {
	const fullHeightSelectors = [
		"html",
		"body",
		"#wpwrap",
		"#wpbody",
		"#wpbody-content",
		`#${EMAIL_DESIGNER_ROOT_ID}`,
	];

	for (const selector of fullHeightSelectors) {
		const el = document.querySelector<HTMLElement>(selector);
		if (!el) continue;
		el.style.setProperty("height", "100%", "important");
		el.style.setProperty("min-height", "100%", "important");
	}

	const wpContent = document.getElementById("wpcontent");
	if (wpContent) {
		wpContent.style.setProperty("height", "100vh", "important");
		wpContent.style.setProperty("min-height", "100vh", "important");
	}

	const wpBodyContent = document.getElementById("wpbody-content");
	if (wpBodyContent) {
		wpBodyContent.style.setProperty("display", "flex", "important");
		wpBodyContent.style.setProperty("flex-direction", "column", "important");
		wpBodyContent.style.setProperty("padding", "0", "important");
		wpBodyContent.style.setProperty("padding-bottom", "0", "important");
		wpBodyContent.style.setProperty("margin", "0", "important");

		const firstChild = wpBodyContent.firstElementChild;
		if (
			firstChild instanceof HTMLElement &&
			firstChild.classList.contains("wrap")
		) {
			firstChild.style.setProperty("height", "100%", "important");
			firstChild.style.setProperty("min-height", "100%", "important");
			firstChild.style.setProperty("margin", "0", "important");
			firstChild.style.setProperty("padding", "0", "important");
		}
	}
}

function getApiConfig() {
	const root = document.getElementById(EMAIL_DESIGNER_ROOT_ID);
	const datasetUrl = root?.getAttribute("data-rest-url") ?? "";
	const datasetNonce = root?.getAttribute("data-rest-nonce") ?? "";

	return {
		restUrl:
			window.hBricksEmailDesigner?.restUrl || datasetUrl || "/wp-json/hbe/v1/",
		restNonce: window.hBricksEmailDesigner?.restNonce || datasetNonce || "",
	};
}

async function fetchTemplate(): Promise<EmailTemplateSettings> {
	const { restUrl, restNonce } = getApiConfig();
	const response = await fetch(`${restUrl}admin/email-template`, {
		headers: { "X-WP-Nonce": restNonce },
	});

	const data = await response.json();
	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: tr("Email template could not be loaded."),
		);
	}

	return (
		(data?.template as EmailTemplateSettings) ?? createDefaultEmailTemplate()
	);
}

async function saveTemplate(
	template: EmailTemplateSettings,
): Promise<EmailTemplateSettings> {
	const { restUrl, restNonce } = getApiConfig();
	const response = await fetch(`${restUrl}admin/email-template`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-WP-Nonce": restNonce,
		},
		body: JSON.stringify({ template }),
	});

	const data = await response.json();
	if (!response.ok) {
		throw new Error(
			typeof data?.message === "string"
				? data.message
				: tr("Email template could not be saved."),
		);
	}
	return (data?.template as EmailTemplateSettings) ?? template;
}

function EmailDesignerShell() {
	const { token } = theme.useToken();
	const { notification } = App.useApp();
	const siteName = window.hBricksEmailDesigner?.siteName ?? "";

	// WordPress layout fixes — mirror SettingsApp behaviour.
	useEffect(() => {
		const observer = new MutationObserver(() => {
			applyWordPressLayoutHeightFix();
		});
		observer.observe(document.body, { childList: true, subtree: true });
		const handleResize = () => applyWordPressLayoutHeightFix();
		window.addEventListener("resize", handleResize);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	const [template, setTemplate] = useState<EmailTemplateSettings | null>(null);
	const [dirty, setDirty] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		fetchTemplate()
			.then((t) => {
				if (cancelled) return;
				setTemplate(t);
				setLoading(false);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(
					err instanceof Error
						? err.message
						: tr("Email template could not be loaded."),
				);
				setTemplate(createDefaultEmailTemplate());
				setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleChange = useCallback((next: EmailTemplateSettings) => {
		setTemplate(next);
		setDirty(true);
	}, []);

	const handleSave = useCallback(async () => {
		if (!template || saving) return;
		setSaving(true);
		setError("");
		try {
			let toSave = template;
			if (toSave.compileStatus !== "compiled") {
				const compiled = await compileEmailTemplate(toSave, siteName);
				toSave = {
					...toSave,
					compiledHtml: compiled.compiledHtml,
					compiledVersion: compiled.compiledVersion,
					compileStatus: compiled.compileStatus,
					compiledAt: compiled.compiledAt,
					lastError: compiled.lastError,
				};
			}
			const saved = await saveTemplate(toSave);
			setTemplate(saved);
			setDirty(false);
			notification.success({
				message: tr("Email template saved."),
				duration: 3,
				placement: "bottomRight",
			});
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: tr("Email template could not be saved."),
			);
		} finally {
			setSaving(false);
		}
	}, [template, saving, siteName, notification]);

	const shellStyle = {
		"--hbe-settings-input-bg": token.colorBgContainer,
		"--hbe-settings-input-border": token.colorBorder,
		"--hbe-settings-input-border-hover":
			token.colorPrimaryBorderHover ?? token.colorPrimary,
		"--hbe-settings-input-text": token.colorText,
		"--hbe-settings-input-placeholder": token.colorTextPlaceholder,
		display: "flex",
		flexDirection: "column",
		height: "100%",
		minHeight: "100%",
		overflow: "hidden",
	} as CSSProperties;

	return (
		<div className="hbe-settings-shell" style={shellStyle}>
			<div
				className="hbe-settings-toolbar"
				style={{
					padding: "0 24px",
					height: 64,
					flexShrink: 0,
					borderBottom: `1px solid ${token.colorBorderSecondary ?? token.colorBorder}`,
					background: token.colorBgContainer,
				}}
			>
				<Flex
					align="center"
					justify="space-between"
					gap={12}
					style={{ height: "100%" }}
				>
					<Flex align="center" gap={12} style={{ minWidth: 0 }}>
						<div
							style={{
								width: 36,
								height: 36,
								borderRadius: 10,
								background: token.colorPrimary,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#fff",
								flexShrink: 0,
								fontSize: 16,
							}}
						>
							<MailOutlined />
						</div>
						<Flex vertical style={{ minWidth: 0 }}>
							<Typography.Text
								strong
								ellipsis
								style={{ fontSize: 15, lineHeight: 1.3 }}
							>
								{tr("Email Designer")}
							</Typography.Text>
							<Typography.Text
								type="secondary"
								ellipsis
								style={{ fontSize: 12, lineHeight: 1.3 }}
							>
								{tr(
									"Design the booking confirmation email shared by all calendars.",
								)}
							</Typography.Text>
						</Flex>
					</Flex>

					<Flex align="center" gap={16} style={{ flexShrink: 0 }}>
						<Typography.Text
							type={dirty ? "warning" : "secondary"}
							style={{ whiteSpace: "nowrap", fontSize: 13 }}
						>
							{dirty ? tr("Unsaved changes") : tr("All changes saved")}
						</Typography.Text>
						<Button
							type="primary"
							icon={<SaveOutlined />}
							loading={saving}
							disabled={!dirty || loading}
							onClick={() => void handleSave()}
							size="middle"
							style={{ fontWeight: 600 }}
						>
							{tr("Save Template")}
						</Button>
					</Flex>
				</Flex>
			</div>

			<div
				style={{
					flex: 1,
					minHeight: 0,
					overflow: "auto",
					background: token.colorBgLayout,
					padding: 24,
				}}
			>
				{error ? (
					<Alert
						type="error"
						message={error}
						closable
						onClose={() => setError("")}
						style={{ marginBottom: 16 }}
					/>
				) : null}

				<div
					style={{
						background: token.colorBgContainer,
						border: `1px solid ${token.colorBorderSecondary ?? token.colorBorder}`,
						borderRadius: token.borderRadiusLG,
						padding: 24,
						minHeight: 560,
						boxShadow: token.boxShadowTertiary,
					}}
				>
					{loading || !template ? (
						<Flex align="center" justify="center" style={{ minHeight: 480 }}>
							<Spin size="large" />
						</Flex>
					) : (
						<EmailDesigner
							template={template}
							calendarName={siteName}
							isDirty={dirty}
							onChange={handleChange}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function EmailDesignerApp() {
	const cache = useRef(createCache());
	const [themeMode, setThemeMode] = useState<AdminTheme>(getInitialTheme);
	const [primaryColor, setPrimaryColor] = useState<string>(
		readShellPrimaryColor,
	);

	// Apply theme to DOM and persist on every change.
	useEffect(() => {
		applyThemeToDOM(themeMode);
		writeStoredTheme(themeMode);
	}, [themeMode]);

	// Sync primary color from the parent shell after first paint.
	useEffect(() => {
		setPrimaryColor(readShellPrimaryColor());
	}, []);

	// Live theme updates via localStorage cross-tab events.
	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key !== THEME_STORAGE_KEY || !isAdminTheme(event.newValue))
				return;
			setThemeMode(event.newValue);
		};
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	// Live theme updates via the shell's custom event.
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

	const algorithm =
		themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm;

	return (
		<StyleProvider cache={cache.current}>
			<ConfigProvider
				locale={getAntdLocale()}
				theme={{
					algorithm,
					token: {
						colorPrimary: primaryColor,
						borderRadius: 8,
						...(themeMode === "dark" ? DARK_THEME_TOKENS : {}),
					},
					components: {
						...(themeMode === "dark" ? DARK_THEME_COMPONENTS : {}),
					},
				}}
			>
				<App>
					<EmailDesignerShell />
				</App>
			</ConfigProvider>
		</StyleProvider>
	);
}

const mountEl = document.getElementById(EMAIL_DESIGNER_ROOT_ID);
if (mountEl) {
	// Apply theme to DOM before first render to prevent flash of unstyled content.
	applyThemeToDOM(getInitialTheme());
	applyWordPressLayoutHeightFix();
	const root = createRoot(mountEl);
	root.render(<EmailDesignerApp />);
}
