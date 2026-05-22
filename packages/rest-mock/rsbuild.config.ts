import { defineConfig } from "@rsbuild/core";

export default defineConfig({
    source: {
        entry: {
            server: "./src/server.ts",
        },
    },
    output: {
        target: "node",
        distPath: {
            root: "dist",
        },
        filename: {
            js: "[name].js",
        },
    },
    tools: {
        rspack: {
            target: "node",
            node: {
                __dirname: false,
                __filename: false,
            },
        },
    },
});
