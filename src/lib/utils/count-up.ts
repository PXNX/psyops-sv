// Count-up animation for numeric stats, used through `use:countUp`.
// Respects reduced-motion and leaves the text alone when not in a browser.

export function countUp(node: HTMLElement, value: number) {
	if (typeof window === "undefined") return;
	if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
		node.textContent = String(value);
		return;
	}
	let current = 0;
	const duration = 450;
	const step = (time: number) => {
		current = value * Math.min(1, time / duration);
		node.textContent = String(value % 1 ? current.toFixed(1) : Math.round(current));
		if (time < duration) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}
