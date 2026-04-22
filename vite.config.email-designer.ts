import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "dist",
		emptyOutDir: false,
		rollupOptions: {
			input: {
				"email-designer": resolve(
					__dirname,
					"elements/booking/email-designer/email-designer.tsx",
				),
			},
			output: {
				entryFileNames: "[name].js",
				assetFileNames: "[name][extname]",
				format: "iife",
			},
		},
	},
});
