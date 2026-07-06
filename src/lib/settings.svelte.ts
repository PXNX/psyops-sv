import { browser } from "$app/environment";
import { themes } from "$lib/themes";

const ONE_YEAR = 60 * 60 * 24 * 365;

function persistCookie(name: string, value: string) {
	if (!browser) return;
	document.cookie = `${name}=${value}; max-age=${ONE_YEAR}; path=/; SameSite=Lax`;
}

class Settings {
	theme = $state("dark");
	loadImages = $state(true);

	setTheme(theme: string) {
		if (!themes.includes(theme)) return;
		this.theme = theme;
		if (browser) {
			window.localStorage.setItem("theme", theme);
			persistCookie("theme", theme);
		}
	}

	setLoadImages(value: boolean) {
		this.loadImages = value;
		if (browser) {
			window.localStorage.setItem("loadImages", value.toString());
			persistCookie("loadImages", value.toString());
		}
	}

	/** Initialise from persisted client storage (used on unauthenticated pages). */
	hydrateFromStorage() {
		if (!browser) return;
		const theme = window.localStorage.getItem("theme");
		if (theme && themes.includes(theme)) {
			this.theme = theme;
		}
		const loadImages = window.localStorage.getItem("loadImages");
		if (loadImages !== null) {
			this.loadImages = loadImages !== "false";
		}
	}

	/** Initialise from server-provided profile (source of truth for authenticated users). */
	hydrateFromServer(theme?: string | null, loadImages?: boolean | null) {
		if (theme && themes.includes(theme)) {
			this.theme = theme;
			if (browser) window.localStorage.setItem("theme", theme);
		}
		if (typeof loadImages === "boolean") {
			this.loadImages = loadImages;
			if (browser) window.localStorage.setItem("loadImages", loadImages.toString());
		}
	}
}

export const settings = new Settings();
