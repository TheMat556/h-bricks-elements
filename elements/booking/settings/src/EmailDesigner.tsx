import { render } from "@react-email/render";
import {
	Button,
	ColorPicker,
	Divider,
	Flex,
	Input,
	InputNumber,
	Switch,
	Tag,
	theme,
	Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	BookingEmailTemplate,
	type BookingEmailTemplateProps,
} from "./BookingEmailTemplate";
import { tr } from "./i18n";

const { TextArea } = Input;
export const EMAIL_TEMPLATE_VERSION = 1;
export type EmailTemplateCompileStatus = "stale" | "compiled" | "invalid";

export interface EmailTemplateSettings {
	primaryColor: string;
	backgroundColor: string;
	logoUrl: string;
	logoAttachmentId: number;
	logoWidth: number;
	logoHeight: number;
	greeting: string;
	body: string;
	footer: string;
	showBookingDetails: boolean;
	compiledHtml: string;
	compiledHash: string;
	compiledVersion: number;
	compileStatus: EmailTemplateCompileStatus;
	compiledAt: string;
	lastError: string;
}

export function createDefaultEmailTemplate(): EmailTemplateSettings {
	return {
		primaryColor: "#2563eb",
		backgroundColor: "#f0f4f8",
		logoUrl: "",
		logoAttachmentId: 0,
		logoWidth: 136,
		logoHeight: 48,
		greeting: "Hi {{customerName}},",
		body: "Your booking has been confirmed. We look forward to seeing you!",
		footer: "© {{calendarName}} — Please do not reply to this email.",
		showBookingDetails: true,
		compiledHtml: "",
		compiledHash: "",
		compiledVersion: EMAIL_TEMPLATE_VERSION,
		compileStatus: "stale",
		compiledAt: "",
		lastError: "",
	};
}

const SAMPLE_DATA: Omit<
	BookingEmailTemplateProps,
	| "primaryColor"
	| "backgroundColor"
	| "greeting"
	| "body"
	| "footer"
	| "showBookingDetails"
	| "logoWidth"
	| "logoHeight"
> = {
	logoUrl: "",
	customerName: "Jane Smith",
	calendarName: "My Calendar",
	date: "Monday, 12 January 2026",
	time: "10:00 – 11:00",
	service: "Consultation",
	cancelUrl: "#cancel-preview",
};

const PLACEHOLDER_DATA: typeof SAMPLE_DATA = {
	logoUrl: "{{logoUrl}}",
	customerName: "{{customerName}}",
	calendarName: "{{calendarName}}",
	date: "{{date}}",
	time: "{{time}}",
	service: "{{service}}",
	cancelUrl: "{{cancelUrl}}",
};

export { PLACEHOLDER_DATA, renderTemplate };

export async function compileEmailTemplate(
	template: EmailTemplateSettings,
	calendarName: string,
): Promise<{
	previewHtml: string;
	compiledHtml: string;
	compiledVersion: number;
	compileStatus: EmailTemplateCompileStatus;
	compiledAt: string;
	lastError: string;
}> {
	const preview = await renderTemplate(template, {
		...SAMPLE_DATA,
		logoUrl: template.logoUrl,
		calendarName: calendarName || SAMPLE_DATA.calendarName,
	});
	const compiled = await renderTemplate(template, {
		...PLACEHOLDER_DATA,
	});

	return {
		previewHtml: preview,
		compiledHtml: compiled,
		compiledVersion: EMAIL_TEMPLATE_VERSION,
		compileStatus: "compiled",
		compiledAt: new Date().toISOString(),
		lastError: "",
	};
}

const VARIABLES = [
	{ label: "{{customerName}}", value: "{{customerName}}" },
	{ label: "{{calendarName}}", value: "{{calendarName}}" },
	{ label: "{{date}}", value: "{{date}}" },
	{ label: "{{time}}", value: "{{time}}" },
	{ label: "{{service}}", value: "{{service}}" },
];

function LogoPicker({
	value,
	logoWidth,
	logoHeight,
	onChange,
}: {
	value: string;
	attachmentId: number;
	logoWidth: number;
	logoHeight: number;
	onChange: (next: { url: string; attachmentId: number; logoWidth?: number; logoHeight?: number }) => void;
}) {
	const { token } = theme.useToken();
	const openMedia = () => {
		// wp.media is provided by WordPress in the admin context
		const wpMedia = (
			window as Window & {
				wp?: {
					media?: (args: object) => {
						open: () => void;
						on: (ev: string, cb: () => void) => void;
						state: () => {
							get: (k: string) => {
								first: () => { toJSON: () => { url: string } };
							};
						};
					};
				};
			}
		).wp?.media;
		if (!wpMedia) return;
		const frame = wpMedia({
			title: "Select Logo Image",
			multiple: false,
			library: { type: "image" },
			button: { text: "Use this image" },
		});
		frame.on("select", () => {
			const attachment = frame.state().get("selection").first().toJSON() as {
				id?: number;
				url?: string;
				sizes?: Record<string, { url?: string }>;
			};
			const sizes = attachment.sizes ?? {};
			const url =
				sizes.medium_large?.url ??
				sizes.large?.url ??
				sizes.medium?.url ??
				sizes.thumbnail?.url ??
				attachment.url ??
				"";
			onChange({
				url,
				attachmentId: typeof attachment.id === "number" ? attachment.id : 0,
			});
		});
		frame.open();
	};

	return (
		<div>
			<Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
				{tr("Email logo")}
			</Typography.Text>
			{value ? (
				<div style={{ marginBottom: 10 }}>
					<img
						src={value}
						alt="Logo preview"
						style={{
							height: 48,
							maxWidth: 160,
							objectFit: "contain",
							border: `1px solid ${token.colorBorder}`,
							borderRadius: token.borderRadius,
							padding: 4,
							background: token.colorFillQuaternary,
							display: "block",
						}}
					/>
				</div>
			) : null}
			<Flex align="center" gap={8} wrap="wrap">
				<Button onClick={openMedia}>
					{value ? tr("Change logo") : tr("Select logo")}
				</Button>
				{value ? (
					<Button
						danger
						onClick={() => onChange({ url: "", attachmentId: 0 })}
					>
						{tr("Remove")}
					</Button>
				) : null}
			</Flex>
			{value ? (
				<Flex gap={12} align="center" style={{ marginTop: 12 }} wrap="wrap">
					<div>
						<Typography.Text style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
							{tr("Width (px)")}
						</Typography.Text>
						<InputNumber
							min={20}
							max={800}
							value={logoWidth}
							style={{ width: 90 }}
							onChange={(v) =>
								onChange({ url: value, attachmentId: 0, logoWidth: v ?? 136 })
							}
						/>
					</div>
					<div>
						<Typography.Text style={{ display: "block", marginBottom: 4, fontSize: 12 }}>
							{tr("Height (px)")}
						</Typography.Text>
						<InputNumber
							min={10}
							max={400}
							value={logoHeight}
							style={{ width: 90 }}
							onChange={(v) =>
								onChange({ url: value, attachmentId: 0, logoHeight: v ?? 48 })
							}
						/>
					</div>
				</Flex>
			) : null}
			<Typography.Text
				type="secondary"
				style={{ display: "block", marginTop: 8, fontSize: 12 }}
			>
				{tr(
					"Use PNG, JPG, or WebP. SVG is often blocked by mail clients like Gmail.",
				)}
			</Typography.Text>
			{value.toLowerCase().includes(".svg") ? (
				<Typography.Text
					type="warning"
					style={{ display: "block", marginTop: 4, fontSize: 12 }}
				>
					{tr(
						"SVG detected — many email clients will not render it. Use PNG, JPG, or WebP instead.",
					)}
				</Typography.Text>
			) : null}
		</div>
	);
}

function SectionLabel({
	children,
	style,
}: {
	children: React.ReactNode;
	style?: React.CSSProperties;
}) {
	return (
		<Typography.Text
			type="secondary"
			strong
			style={{
				display: "block",
				fontSize: 11,
				letterSpacing: 0.6,
				textTransform: "uppercase",
				marginBottom: 12,
				...style,
			}}
		>
			{children}
		</Typography.Text>
	);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
	return (
		<Typography.Text
			strong
			style={{ display: "block", marginBottom: 6, fontSize: 13 }}
		>
			{children}
		</Typography.Text>
	);
}

function VariableChips({ onInsert }: { onInsert: (variable: string) => void }) {
	return (
		<Flex gap={6} wrap="wrap" style={{ marginBottom: 8 }}>
			{VARIABLES.map((v) => (
				<Button
					key={v.value}
					size="small"
					style={{ fontFamily: "monospace", fontSize: 12 }}
					onClick={() => onInsert(v.value)}
				>
					{v.label}
				</Button>
			))}
		</Flex>
	);
}

function insertAtCursor(
	ref: React.RefObject<HTMLTextAreaElement | null>,
	variable: string,
	value: string,
	onChange: (next: string) => void,
) {
	const el = ref.current;
	if (!el) {
		onChange(value + variable);
		return;
	}
	const start = el.selectionStart ?? value.length;
	const end = el.selectionEnd ?? value.length;
	const next = value.slice(0, start) + variable + value.slice(end);
	onChange(next);
	// restore cursor after React re-render
	requestAnimationFrame(() => {
		el.setSelectionRange(start + variable.length, start + variable.length);
		el.focus();
	});
}

function markTemplateStale(
	template: EmailTemplateSettings,
	patch: Partial<EmailTemplateSettings>,
): EmailTemplateSettings {
	return {
		...template,
		...patch,
		compileStatus: "stale",
		lastError: "",
	};
}

async function renderTemplate(
	template: Pick<
		EmailTemplateSettings,
		| "primaryColor"
		| "backgroundColor"
		| "greeting"
		| "body"
		| "footer"
		| "showBookingDetails"
		| "logoWidth"
		| "logoHeight"
	>,
	data: typeof SAMPLE_DATA,
): Promise<string> {
	return render(
		<BookingEmailTemplate
			primaryColor={template.primaryColor}
			backgroundColor={template.backgroundColor}
			greeting={template.greeting}
			body={template.body}
			footer={template.footer}
			showBookingDetails={template.showBookingDetails}
			logoWidth={template.logoWidth}
			logoHeight={template.logoHeight}
			{...data}
		/>,
	);
}

export function EmailDesigner({
	template,
	calendarName,
	isDirty,
	onChange,
}: {
	template: EmailTemplateSettings;
	calendarName: string;
	isDirty: boolean;
	onChange: (next: EmailTemplateSettings) => void;
}) {
	const { token } = theme.useToken();
	const [previewHtml, setPreviewHtml] = useState("");
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const greetingRef = useRef<HTMLTextAreaElement>(null);
	const bodyRef = useRef<HTMLTextAreaElement>(null);

	const update = useCallback(
		(patch: Partial<EmailTemplateSettings>) => {
			onChange(markTemplateStale(template, patch));
		},
		[template, onChange],
	);

	// Rebuild preview + compiledHtml whenever template changes (debounced)
	useEffect(() => {
		if (debounceTimer.current) clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(async () => {
			try {
				const compiled = await compileEmailTemplate(template, calendarName);
				setPreviewHtml(compiled.previewHtml);
				if (
					compiled.compiledHtml === template.compiledHtml &&
					template.compileStatus === "compiled" &&
					!template.lastError
				) {
					return;
				}
				onChange({
					...template,
					compiledHtml: compiled.compiledHtml,
					compiledVersion: compiled.compiledVersion,
					compileStatus: compiled.compileStatus,
					compiledAt: compiled.compiledAt,
					lastError: compiled.lastError,
				});
			} catch (error) {
				const nextError =
					error instanceof Error
						? error.message
						: tr("Email template could not be compiled.");
				if (
					template.compileStatus === "invalid" &&
					template.lastError === nextError
				) {
					return;
				}
				onChange({
					...template,
					compileStatus: "invalid",
					lastError: nextError,
				});
			}
		}, 150);
		return () => {
			if (debounceTimer.current) clearTimeout(debounceTimer.current);
		};
	}, [template, calendarName, onChange]);

	const statusMeta =
		template.compileStatus === "invalid"
			? {
					color: "error" as const,
					label: tr("Invalid"),
					help:
						template.lastError ||
						tr("The designer could not compile this template."),
				}
			: template.compileStatus === "stale"
				? {
						color: "warning" as const,
						label: tr("Stale"),
						help: tr("Template changes are waiting to be compiled."),
					}
				: isDirty
					? {
							color: "processing" as const,
							label: tr("Compiled"),
							help: tr(
								"Compiled locally. Save settings to make outgoing emails use this version.",
							),
						}
					: {
							color: "success" as const,
							label: tr("Compiled"),
							help: tr("Saved template is ready for test and live emails."),
						};

	return (
		<Flex
			gap={20}
			style={{
				minHeight: 560,
				alignItems: "stretch",
			}}
		>
			{/* Left pane — controls */}
			<div
				style={{
					flex: "1 1 0",
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					gap: 0,
					overflowY: "auto",
					paddingRight: 4,
				}}
			>
				{/* ── Branding ── */}
				<SectionLabel>{tr("Branding")}</SectionLabel>

				<LogoPicker
					value={template.logoUrl}
					attachmentId={template.logoAttachmentId}
					logoWidth={template.logoWidth}
					logoHeight={template.logoHeight}
					onChange={({ url, attachmentId, logoWidth, logoHeight }) =>
						update({
							logoUrl: url,
							logoAttachmentId: attachmentId,
							...(logoWidth !== undefined && { logoWidth }),
							...(logoHeight !== undefined && { logoHeight }),
						})
					}
				/>

				<Divider style={{ margin: "20px 0" }} />

				<Flex gap={20} wrap="wrap" style={{ marginBottom: 20 }}>
					<div>
						<FieldLabel>{tr("Accent colour")}</FieldLabel>
						<ColorPicker
							value={template.primaryColor}
							onChange={(_, hex) => update({ primaryColor: hex })}
							showText
						/>
					</div>
					<div>
						<FieldLabel>{tr("Background colour")}</FieldLabel>
						<ColorPicker
							value={template.backgroundColor}
							onChange={(_, hex) => update({ backgroundColor: hex })}
							showText
						/>
					</div>
				</Flex>

				{/* ── Content ── */}
				<Divider style={{ margin: "0 0 20px 0" }} />
				<SectionLabel>{tr("Content")}</SectionLabel>

				<div style={{ marginBottom: 16 }}>
					<FieldLabel>{tr("Greeting")}</FieldLabel>
					<VariableChips
						onInsert={(v) =>
							insertAtCursor(greetingRef, v, template.greeting, (next) =>
								update({ greeting: next }),
							)
						}
					/>
					<TextArea
						ref={greetingRef}
						rows={2}
						value={template.greeting}
						onChange={(e) => update({ greeting: e.target.value })}
					/>
				</div>

				<div style={{ marginBottom: 16 }}>
					<FieldLabel>{tr("Message")}</FieldLabel>
					<VariableChips
						onInsert={(v) =>
							insertAtCursor(bodyRef, v, template.body, (next) =>
								update({ body: next }),
							)
						}
					/>
					<TextArea
						ref={bodyRef}
						rows={4}
						value={template.body}
						onChange={(e) => update({ body: e.target.value })}
					/>
				</div>

				<div style={{ marginBottom: 20 }}>
					<FieldLabel>{tr("Footer text")}</FieldLabel>
					<Input
						value={template.footer}
						onChange={(e) => update({ footer: e.target.value })}
					/>
				</div>

				{/* ── Options ── */}
				<Divider style={{ margin: "0 0 20px 0" }} />
				<SectionLabel>{tr("Options")}</SectionLabel>

				{/* Show booking details toggle */}
				<Flex
					align="center"
					justify="space-between"
					gap={12}
					style={{
						padding: "14px 16px",
						borderRadius: 8,
						border: `1px solid ${token.colorBorder}`,
						background: token.colorFillAlter,
					}}
				>
					<div>
						<Typography.Text strong style={{ display: "block" }}>
							{tr("Show booking details")}
						</Typography.Text>
						<Typography.Text type="secondary" style={{ fontSize: 12 }}>
							{tr("Include a details block with date, time, and service.")}
						</Typography.Text>
					</div>
					<Switch
						checked={template.showBookingDetails}
						onChange={(checked) => update({ showBookingDetails: checked })}
					/>
				</Flex>
			</div>

			{/* Right pane — live preview */}
			<div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" }}>
				<Flex
					align="center"
					justify="space-between"
					gap={12}
					style={{ marginBottom: 4 }}
				>
					<SectionLabel style={{ margin: 0 }}>{tr("Live Preview")}</SectionLabel>
					<Tag color={statusMeta.color} style={{ marginBottom: 12 }}>{statusMeta.label}</Tag>
				</Flex>
				<Typography.Text
					type="secondary"
					style={{ display: "block", marginBottom: 12, fontSize: 12 }}
				>
					{statusMeta.help}
				</Typography.Text>
				<iframe
					srcDoc={previewHtml}
					title="Email preview"
					style={{
						flex: 1,
						width: "100%",
						minHeight: 500,
						border: `1px solid ${token.colorBorder}`,
						borderRadius: 8,
						background: "#fff",
					}}
					sandbox="allow-same-origin"
				/>
			</div>
		</Flex>
	);
}
