import { defineConfig } from "@rstest/core";
import ts from "typescript";
import { compileModule } from "svelte/compiler";

export default defineConfig({
	include: ["src/**/*.test.ts", "packages/**/*.test.ts", "tools/**/*.test.ts"],
	exclude: ["node_modules", ".svelte-kit"],
	pool: { maxWorkers: 2 },
	plugins: [
		{
			// Rune modules (*.svelte.ts) need the Svelte compiler, just like in
			// Vite: strip the types, then let Svelte turn $state & co into code.
			name: "svelte-rune-modules",
			setup(api) {
				api.transform({ test: /\.svelte\.ts$/ }, ({ code, resourcePath }) => {
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
