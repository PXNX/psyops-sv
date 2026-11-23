// Mermaid palette derived from the active app theme, shared by docs diagrams
// and diagrams embedded in posts.
//
// Custom properties can be aliases (`var(--color-base-200)`) or `color-mix()`
// expressions, which Mermaid cannot parse. Resolve them through a real element
// and a canvas so Mermaid receives plain hex colours.

function resolveColor(variable: string, fallback: string): string {
	if (typeof document === "undefined") return fallback;
	try {
		const probe = document.createElement("span");
		probe.style.color = `var(${variable}, ${fallback})`;
		probe.style.position = "absolute";
		probe.style.visibility = "hidden";
		document.body.appendChild(probe);
		const computed = getComputedStyle(probe).color;
		probe.remove();
		const context = document.createElement("canvas").getContext("2d");
		if (!context) return fallback;
		context.fillStyle = computed;
		const hex = context.fillStyle;
		return typeof hex === "string" && hex.startsWith("#") ? hex.slice(0, 7) : fallback;
	} catch {
		return fallback;
	}
}

export function mermaidThemeVariables() {
	return {
		primaryColor: resolveColor("--color-surface-2", "#16202e"),
		primaryTextColor: resolveColor("--color-fg", "#e6edf3"),
		primaryBorderColor: resolveColor("--color-primary", "#4d8fe0"),
		lineColor: resolveColor("--color-line", "#334155"),
		secondaryColor: resolveColor("--color-surface-4", "#1b2735"),
		tertiaryColor: resolveColor("--color-surface-1", "#111a26"),
		fontFamily: "DM Sans, Inter, system-ui, sans-serif",
		fontSize: "14px"
	};
}
