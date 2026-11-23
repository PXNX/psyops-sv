import { defineConfig } from "@rstest/core";
import ts from "typescript";
import { compileModule } from "svelte/compiler";

export default defineConfig({
	include: ["src/**/*.test.ts", "packages/**/*.test.ts", "tools/**/*.test.ts"],
	exclude: ["node_modules", ".svelte-kit"],
	pool: { maxWorkers: 2 },
	// PGlite boot/teardown and the seeded world can take well over the 5 s / 10 s
	// defaults on a loaded CI runner. Keep workers bounded but allow the slow
	// integration setup to finish instead of failing with a spurious timeout.
	testTimeout: 30_000,
	hookTimeout: 60_000,
	plugins: [
		{
			// Rune modules (*.svelte.ts) need the Svelte compiler, just like in
			// Vite: strip the types, then let Svelte turn $state & co into code.
			name: "svelte-rune-modules",
			setup(api) {
				api.transform({ test: /\.svelte(?:\.ts)?(?:\?|$)/ }, ({ code, resourcePath }) => {
					const js = ts.transpileModule(code, {
						fileName: resourcePath,
						compilerOptions: {
							target: ts.ScriptTarget.ES2022,
							module: ts.ModuleKind.ESNext,
							verbatimModuleSyntax: false
						}
					}).outputText;
					return compileModule(js, { filename: resourcePath, generate: "client", dev: false }).js.code;
				});
			}
		}
	]
});
