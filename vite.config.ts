import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				booking: resolve(__dirname, "elements/booking/src/booking.ts"),
			},
			output: {
				entryFileNames: "[name].js", // → dist/booking.js
				assetFileNames: "[name][extname]", // → dist/booking.css
			},
		},
	},
});
