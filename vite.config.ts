import { paraglide } from "@inlang/paraglide-sveltekit/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import svg from "@poppanator/sveltekit-svg";
import Icons from "unplugin-icons/vite";
//import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [
		paraglide({ project: "./project.inlang", outdir: "./src/lib/paraglide" }),
		sveltekit(),

		//	SvelteKitPWA(),
		Icons({
			compiler: "svelte",
			autoInstall: true
		}),
		svg({
			includePaths: ["./src/assets/"],
			//"./src/lib/icons/", "./src/assets/icons/",
			svgoOptions: {
				multipass: true,
				plugins: [
					{
						name: "preset-default",
						// by default svgo removes the viewBox which prevents svg icons from scaling
						// not a good idea! https://github.com/svg/svgo/pull/1461
						params: { overrides: { removeViewBox: false } }
					},
					{ name: "removeAttrs", params: { attrs: "(fill|stroke)" } }
				]
			}
		}),
		tailwindcss()
	]
});
