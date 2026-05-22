import { defineConfig } from "@rstest/core";

export default defineConfig({
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: ["node_modules", ".svelte-kit"],
});
