// src/lib/utils/celebrate.ts
// A quiet success moment instead of confetti: the element that changed lifts
// and glows once (see .animate-celebrate in app.css), with the success
// haptic/sound. Honours prefers-reduced-motion through the CSS.
import { feedback } from "./feedback";

export function celebrate(target?: Element | null) {
	feedback("success");
	if (!target) return;
	target.classList.remove("animate-celebrate");
	// Restart the animation if it's still running from a previous success.
	void (target as HTMLElement).offsetWidth;
	target.classList.add("animate-celebrate");
	target.addEventListener("animationend", () => target.classList.remove("animate-celebrate"), { once: true });
}
