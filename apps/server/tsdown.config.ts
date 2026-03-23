import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	noExternal: [/@2026-03-22-ai-24-staff\/.*/],
});
