import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const root = process.cwd();
const isWatch = process.argv.includes("--watch");

type BuildTarget = {
	outDir: string;
	input: Record<string, string>;
	format: "es" | "iife";
};

const targets: BuildTarget[] = [
	{
		outDir: "dist/booking",
		input: {
			booking: resolve(root, "elements/booking/src/booking.ts"),
			cancel: resolve(root, "elements/booking/cancel/cancel.tsx"),
		},
		format: "es",
	},
	{
		outDir: "dist/settings",
		input: {
			settings: resolve(root, "elements/booking/settings/settings.tsx"),
		},
		format: "iife",
	},
	{
		outDir: "dist/email-designer",
		input: {
			"email-designer": resolve(
				root,
				"elements/booking/email-designer/email-designer.tsx",
			),
		},
		format: "iife",
	},
];

function makeBuildConfig(target: BuildTarget, watch: boolean) {
	return {
		plugins: [react()],
		build: {
			outDir: target.outDir,
			emptyOutDir: true,
			watch: watch ? {} : undefined,
			rollupOptions: {
				input: target.input,
				output: {
					entryFileNames: "[name].js",
					assetFileNames: "[name][extname]",
					format: target.format,
				},
			},
		},
	};
}

if (isWatch) {
	await Promise.all(targets.map((t) => build(makeBuildConfig(t, true))));
} else {
	for (const target of targets) {
		await build(makeBuildConfig(target, false));
	}
}
