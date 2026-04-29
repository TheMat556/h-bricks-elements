import { describe, expect, it } from "vitest";
import {
	hexToRgba,
	resolveVars,
} from "../../elements/booking/settings/src/BookingEmailTemplate";
import {
	compileEmailTemplate,
	createDefaultEmailTemplate,
	markTemplateStale,
	renderTemplate,
} from "../../elements/booking/settings/src/EmailDesigner";

describe("resolveVars", () => {
	it("replaces known placeholders with values", () => {
		expect(
			resolveVars("Hi {{customerName}}", { "{{customerName}}": "Alice" }),
		).toBe("Hi Alice");
	});

	it("leaves unknown placeholders intact", () => {
		expect(
			resolveVars("Hi {{customerName}}, age {{age}}", {
				"{{customerName}}": "Alice",
			}),
		).toBe("Hi Alice, age {{age}}");
	});

	it("handles multiple occurrences of the same placeholder", () => {
		expect(resolveVars("{{x}} and {{x}}", { "{{x}}": "y" })).toBe("y and y");
	});

	it("handles empty vars object", () => {
		expect(resolveVars("No placeholders", {})).toBe("No placeholders");
	});

	it("handles special characters in replacement values", () => {
		expect(resolveVars("Note: {{msg}}", { "{{msg}}": 'A & B <C> "D"' })).toBe(
			'Note: A & B <C> "D"',
		);
	});

	it("returns empty string when text is empty", () => {
		expect(resolveVars("", { "{{x}}": "y" })).toBe("");
	});

	it("replaces different placeholders in a single pass", () => {
		const result = resolveVars("{{a}} {{b}} {{c}}", {
			"{{a}}": "1",
			"{{b}}": "2",
			"{{c}}": "3",
		});
		expect(result).toBe("1 2 3");
	});
});

describe("hexToRgba", () => {
	it("converts 6-digit hex to rgba", () => {
		expect(hexToRgba("#2563eb", 0.08)).toBe("rgba(37,99,235,0.08)");
		expect(hexToRgba("#000000", 1)).toBe("rgba(0,0,0,1)");
		expect(hexToRgba("#ffffff", 0)).toBe("rgba(255,255,255,0)");
		expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
	});

	it("does not expand 3-digit short hex (slices fixed positions)", () => {
		// Known implementation detail: slices [0:2],[2:4],[4:6] without expanding
		expect(hexToRgba("#f00", 0.5)).toBe("rgba(240,0,NaN,0.5)");
		expect(hexToRgba("#fff", 0.5)).toBe("rgba(255,15,NaN,0.5)");
	});

	it("falls back to default blue for invalid hex strings", () => {
		expect(hexToRgba("not-a-color", 0.5)).toBe("rgba(37,99,235,0.5)");
		expect(hexToRgba("#zzzzzz", 0.5)).toBe("rgba(37,99,235,0.5)");
		expect(hexToRgba("", 0.5)).toBe("rgba(37,99,235,0.5)");
	});

	it("accepts opacity values outside 0-1 range without clamping", () => {
		expect(hexToRgba("#2563eb", 1.5)).toBe("rgba(37,99,235,1.5)");
		expect(hexToRgba("#2563eb", -0.2)).toBe("rgba(37,99,235,-0.2)");
	});

	it("handles hex without leading hash", () => {
		expect(hexToRgba("2563eb", 0.08)).toBe("rgba(37,99,235,0.08)");
	});
});

describe("createDefaultEmailTemplate", () => {
	it("returns object with expected default colors and content fields", () => {
		const defaults = createDefaultEmailTemplate();

		expect(defaults.primaryColor).toBe("#2563eb");
		expect(defaults.backgroundColor).toBe("#f0f4f8");
		expect(defaults.logoUrl).toBe("");
		expect(defaults.logoAttachmentId).toBe(0);
		expect(defaults.logoWidth).toBe(136);
		expect(defaults.logoHeight).toBe(48);
		expect(defaults.greeting).toBe("Hi {{customerName}},");
		expect(defaults.body).toBe(
			"Your booking has been confirmed. We look forward to seeing you!",
		);
		expect(defaults.footer).toBe(
			"© {{calendarName}} — Please do not reply to this email.",
		);
		expect(defaults.showBookingDetails).toBe(true);
		expect(defaults.compiledHtml).toBe("");
		expect(defaults.compiledHash).toBe("");
		expect(defaults.compiledVersion).toBe(1);
		expect(defaults.compileStatus).toBe("stale");
		expect(defaults.compiledAt).toBe("");
		expect(defaults.lastError).toBe("");
	});
});

describe("markTemplateStale", () => {
	it("immutably updates field and resets compileStatus to stale", () => {
		const original = createDefaultEmailTemplate();
		original.compileStatus = "compiled";
		original.lastError = "some error";

		const updated = markTemplateStale(original, { greeting: "Hello!" });

		expect(updated).not.toBe(original);
		expect(updated.greeting).toBe("Hello!");
		expect(updated.compileStatus).toBe("stale");
		expect(updated.lastError).toBe("");
		expect(updated.primaryColor).toBe(original.primaryColor);
		expect(updated.body).toBe(original.body);
	});

	it("resets compileStatus even when patch is empty", () => {
		const original = createDefaultEmailTemplate();
		original.compileStatus = "compiled";
		original.lastError = "err";

		const updated = markTemplateStale(original, {});

		expect(updated.compileStatus).toBe("stale");
		expect(updated.lastError).toBe("");
		expect(updated).not.toBe(original);
	});

	it("overrides compileStatus in patch with stale", () => {
		const original = createDefaultEmailTemplate();
		const updated = markTemplateStale(original, {
			compileStatus: "compiled",
			lastError: "err",
		});

		expect(updated.compileStatus).toBe("stale");
		expect(updated.lastError).toBe("");
	});
});

describe("renderTemplate", () => {
	it("renders to an HTML string containing substituted variables", async () => {
		const html = await renderTemplate(
			{
				primaryColor: "#2563eb",
				backgroundColor: "#f0f4f8",
				greeting: "Hi {{customerName}},",
				body: "See you soon!",
				footer: "© {{calendarName}}",
				showBookingDetails: true,
				logoWidth: 136,
				logoHeight: 48,
			},
			{
				logoUrl: "",
				customerName: "Jane Smith",
				calendarName: "My Calendar",
				date: "Monday, 12 January 2026",
				time: "10:00 – 11:00",
				service: "Consultation",
				cancelUrl: "#cancel",
			},
		);

		expect(typeof html).toBe("string");
		expect(html.length).toBeGreaterThan(0);
		expect(html).toContain("Hi Jane Smith,");
		expect(html).toContain("See you soon!");
		expect(html).toContain("© My Calendar");
		expect(html).toContain("Monday, 12 January 2026");
		expect(html).toContain("10:00 – 11:00");
		expect(html).toContain("Consultation");
		expect(html).toContain("Cancel booking");
	});

	it("omits booking details when showBookingDetails is false", async () => {
		const html = await renderTemplate(
			{
				primaryColor: "#2563eb",
				backgroundColor: "#f0f4f8",
				greeting: "Hi {{customerName}},",
				body: "",
				footer: "",
				showBookingDetails: false,
				logoWidth: 136,
				logoHeight: 48,
			},
			{
				logoUrl: "",
				customerName: "Jane Smith",
				calendarName: "My Calendar",
				date: "Monday, 12 January 2026",
				time: "10:00 – 11:00",
				service: "Consultation",
				cancelUrl: "",
			},
		);

		expect(html).toContain("Hi Jane Smith,");
		expect(html).not.toContain("Your appointment");
		expect(html).not.toContain("Monday, 12 January 2026");
	});

	it("omits cancel button when cancelUrl is empty", async () => {
		const html = await renderTemplate(
			{
				primaryColor: "#2563eb",
				backgroundColor: "#f0f4f8",
				greeting: "Hi {{customerName}},",
				body: "",
				footer: "",
				showBookingDetails: false,
				logoWidth: 136,
				logoHeight: 48,
			},
			{
				logoUrl: "",
				customerName: "Jane Smith",
				calendarName: "My Calendar",
				date: "Monday, 12 January 2026",
				time: "10:00 – 11:00",
				service: "Consultation",
				cancelUrl: "",
			},
		);

		expect(html).not.toContain("Cancel booking");
	});

	it("preserves unknown variable placeholders in output", async () => {
		const html = await renderTemplate(
			{
				primaryColor: "#2563eb",
				backgroundColor: "#f0f4f8",
				greeting: "Hi {{customerName}},",
				body: "Ref: {{unknownVar}}",
				footer: "",
				showBookingDetails: false,
				logoWidth: 136,
				logoHeight: 48,
			},
			{
				logoUrl: "",
				customerName: "Jane Smith",
				calendarName: "My Calendar",
				date: "Monday, 12 January 2026",
				time: "10:00 – 11:00",
				service: "Consultation",
				cancelUrl: "",
			},
		);

		expect(html).toContain("Hi Jane Smith,");
		expect(html).toContain("{{unknownVar}}");
	});

	it("handles template with no placeholders", async () => {
		const html = await renderTemplate(
			{
				primaryColor: "#2563eb",
				backgroundColor: "#f0f4f8",
				greeting: "Hello there,",
				body: "Plain text.",
				footer: "Goodbye.",
				showBookingDetails: false,
				logoWidth: 136,
				logoHeight: 48,
			},
			{
				logoUrl: "",
				customerName: "Ignored",
				calendarName: "Ignored",
				date: "Ignored",
				time: "Ignored",
				service: "Ignored",
				cancelUrl: "",
			},
		);

		expect(html).toContain("Hello there,");
		expect(html).toContain("Plain text.");
		expect(html).toContain("Goodbye.");
	});
});

describe("compileEmailTemplate", () => {
	it("returns object with previewHtml, compiledHtml, compileStatus compiled", async () => {
		const template = createDefaultEmailTemplate();
		const result = await compileEmailTemplate(template, "Test Calendar");

		expect(typeof result.previewHtml).toBe("string");
		expect(typeof result.compiledHtml).toBe("string");
		expect(result.previewHtml.length).toBeGreaterThan(0);
		expect(result.compiledHtml.length).toBeGreaterThan(0);
		expect(result.compiledVersion).toBe(1);
		expect(result.compileStatus).toBe("compiled");
		expect(result.lastError).toBe("");
		expect(result.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("uses sample data in previewHtml", async () => {
		const template = createDefaultEmailTemplate();
		const result = await compileEmailTemplate(template, "Test Calendar");

		expect(result.previewHtml).toContain("Jane Smith");
		expect(result.previewHtml).toContain("Test Calendar");
	});

	it("uses placeholder data in compiledHtml", async () => {
		const template = createDefaultEmailTemplate();
		const result = await compileEmailTemplate(template, "Test Calendar");

		expect(result.compiledHtml).toContain("{{customerName}}");
		expect(result.compiledHtml).toContain("{{calendarName}}");
		expect(result.compiledHtml).toContain("{{date}}");
		expect(result.compiledHtml).toContain("{{time}}");
		expect(result.compiledHtml).toContain("{{service}}");
	});

	it("falls back to sample calendar name when calendarName is empty", async () => {
		const template = createDefaultEmailTemplate();
		const result = await compileEmailTemplate(template, "");

		expect(result.previewHtml).toContain("My Calendar");
	});
});
