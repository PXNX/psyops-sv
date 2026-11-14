// src/lib/utils/confetti.ts
// Physics-tuned celebration bursts. Centralises the palette and the motion
// settings so every success moment in the app feels the same, and honours
// prefers-reduced-motion via canvas-confetti's built-in switch.
import confetti from "canvas-confetti";

/** Amber + party palette, matching the app's interaction accents. */
export const PARTY_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#a78bfa", "#ec4899"];

interface BurstOptions {
	/** Where the burst starts; defaults to the lower middle of the screen. */
	origin?: { x?: number; y?: number };
	particleCount?: number;
	spread?: number;
	colors?: string[];
}

/** Fire a confetti burst with gravity, drag and tumbling shapes. */
export function burst({
	origin = { x: 0.5, y: 0.6 },
	particleCount = 150,
	spread = 80,
	colors = PARTY_COLORS
}: BurstOptions = {}) {
	confetti({
		particleCount,
		spread,
		startVelocity: 45,
		gravity: 0.9,
		ticks: 220,
		scalar: 1,
		shapes: ["square", "circle"],
		disableForReducedMotion: true,
		zIndex: 10000,
		origin,
		colors
	});
}
