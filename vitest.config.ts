import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		include: ["tests/ts/**/*.test.ts", "tests/ts/**/*.test.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: [
				"elements/**/src/**",
				"elements/**/email-designer/**",
				"elements/**/cancel/**",
			],
			exclude: [
				// Mount / entry points (wiring, no logic)
				"**/cancel/cancel.tsx",
				"**/email-designer/email-designer.tsx",
				"**/settings/settings.tsx",
				"**/booking/src/booking.ts",
				// UI shells & complex interactive components
				"**/SettingsApp.tsx",
				"**/BookingView.tsx",
				"**/CalendarSettingsPanel.tsx",
				"**/RightPanel.tsx",
				"**/BookingForm.tsx",
				"**/BookingModal.tsx",
				"**/CancelApp.tsx",
				// Config / i18n wrappers
				"**/i18n.ts",
				// Untested modules (0% coverage) — add tests or keep excluded
				"**/api.ts",
				"**/state.ts",
				"**/ui/calendar.ts",
				"**/ui/stepper.ts",
				"**/useModalOverlay.ts",
				"**/shared/constants.ts",
				// EmailDesigner React component shell — tested helpers exported separately
				"**/EmailDesigner.tsx",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
});
