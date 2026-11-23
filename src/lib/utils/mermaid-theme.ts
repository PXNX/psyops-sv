// Mermaid palette derived from the active app theme, shared by docs diagrams
// and diagrams embedded in posts.

export function mermaidThemeVariables() {
	const css = getComputedStyle(document.documentElement);
	const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
	return {
		primaryColor: read("--color-surface-2", "#16202e"),
		primaryTextColor: read("--color-fg", "#e6edf3"),
		primaryBorderColor: read("--color-primary", "#4d8fe0"),
		lineColor: read("--color-line", "#334155"),
		secondaryColor: read("--color-surface-4", "#1b2735"),
		tertiaryColor: read("--color-surface-1", "#111a26"),
		fontFamily: "DM Sans, Inter, system-ui, sans-serif",
		fontSize: "14px"
	};
}
