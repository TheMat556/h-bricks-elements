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
				settings: resolve(__dirname, "elements/booking/settings/settings.tsx"),
			},
			output: {
				entryFileNames: "[name].js",
				assetFileNames: "[name][extname]",
				format: "iife",
			},
		},
	},
});
