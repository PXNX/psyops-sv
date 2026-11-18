import { cubicOut } from "svelte/easing";
import { writable } from "svelte/store";

/**
 * True while a view-transition page swap is in flight.
 *
 * Page-level entrance animations must not run inside a view transition: the
 * browser snapshots the DOM while the animation is still in its `from` state,
 * so the incoming page would render blank and then jump to a mid-animation
 * pose when the transition ends. Components read this once at mount (non-
 * reactively, via `get`) and skip their entrance class when it is true.
 */
export const viewTransitionActive = writable(false);

/**
 * Svelte transition for something that's gone (deleted, left, dismissed,
 * kicked): it shrinks and fades a touch, then its row folds shut so the
 * list closes up smoothly instead of jumping. Use as `out:vanish` on the
 * element of a keyed `{#each}`; off under prefers-reduced-motion.
 */
export function vanish(node: Element, { duration = 280 }: { duration?: number } = {}) {
	const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduced) return { duration: 0 };
	const style = getComputedStyle(node);
	const height = parseFloat(style.height);
	const opacity = +style.opacity;
	const props = [
		"paddingTop",
		"paddingBottom",
		"marginTop",
		"marginBottom",
		"borderTopWidth",
		"borderBottomWidth"
	] as const;
	const sizes = props.map((p) => parseFloat(style[p]) || 0);
	const css = (p: string) => p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
	return {
		duration,
		css: (t: number) => {
			// t runs 1 → 0. First half: fade and shrink in place; second half: fold shut.
			const fade = cubicOut(Math.max(0, (t - 0.5) * 2));
			const f = cubicOut(Math.min(1, t * 2));
			return [
				"overflow: hidden",
				`opacity: ${fade * opacity}`,
				`transform: scale(${0.94 + 0.06 * fade})`,
				`filter: blur(${(1 - fade) * 2}px)`,
				`height: ${f * height}px`,
				...props.map((p, i) => `${css(p)}: ${f * sizes[i]}px`)
			].join(";");
		}
	};
}
