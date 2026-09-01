import { paraglideVitePlugin } from "@inlang/paraglide-js";
import svg from "@poppanator/sveltekit-svg";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			strategy: ["url", "cookie", "baseLocale"]
		}),
		sveltekit(),
		Icons({
			compiler: "svelte",
			autoInstall: true,
			// Configure for separate files

			iconCustomizer(collection, icon, props) {
				props.mode = "url";
			}
		}),
		svg({
			includePaths: ["./src/assets/", "./src/lib/assets/"],
			//"./src/lib/icons/", "./src/assets/icons/",
			svgoOptions: {
				multipass: true,
				plugins: [
					{
						name: "preset-default"
						// by default svgo removes the viewBox which prevents svg icons from scaling
						// not a good idea! https://github.com/svg/svgo/pull/1461
						//	params: { removeViewBox: false }
					},
					{ name: "removeAttrs", params: { attrs: "(fill|stroke)" } }
				]
			}
		}),
		tailwindcss()
	],
	// Ensure a single instance of every ProseMirror module is used at runtime.
	// TipTap ships its own copies via @tiptap/pm while the project also depends on
	// standalone prosemirror-* packages at slightly different versions. Without
	// deduping, two copies of prosemirror-state get bundled and each mints the same
	// auto-generated plugin key ("plugin$"), causing the editor to throw
	// "RangeError: Adding different instances of a keyed plugin (plugin$)" on init.
	resolve: {
		dedupe: [
			"@tiptap/pm",
			"prosemirror-state",
			"prosemirror-model",
			"prosemirror-view",
			"prosemirror-transform",
			"prosemirror-keymap",
			"prosemirror-commands",
			"prosemirror-schema-list",
			"prosemirror-dropcursor",
			"prosemirror-gapcursor",
			"prosemirror-history",
			"prosemirror-inputrules",
			"prosemirror-tables",
			"prosemirror-collab",
			"prosemirror-menu",
			"prosemirror-markdown",
			"prosemirror-schema-basic",
			"prosemirror-trailing-node"
		]
	},
	/*server: {
		host: true
	}*/
	server: {
		allowedHosts: true
		//port: 3021
	}
});
