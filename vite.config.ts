import { paraglideVitePlugin } from "@inlang/paraglide-js";
import svg from "@poppanator/sveltekit-svg";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
//import { SvelteKitPWA } from "@vite-pwa/sveltekit";
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
		//	SvelteKitPWA(),
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
	/*server: {
		host: true
	}*/
	server: {
		allowedHosts: true
		//port: 3021
	}
});
