import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		outDir: "dist",
		emptyOutDir: false,
		rollupOptions: {
			input: {
				booking: resolve(__dirname, "elements/booking/src/booking.ts"),
			},
			output: {
				entryFileNames: "[name].js",
				assetFileNames: "[name][extname]",
			},
		},
	},
});
