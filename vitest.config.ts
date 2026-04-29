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
				"elements/**/settings/src/**",
			],
			exclude: [
				// Mount / entry points (wiring, no logic)
				"**/cancel/cancel.tsx",
				"**/email-designer/email-designer.tsx",
				"**/settings/settings.tsx",
				"**/booking/src/booking.ts",
				// Config / i18n wrappers
				"**/i18n.ts",
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
