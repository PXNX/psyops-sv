// src/lib/component/ui/styles.ts
// Single source of truth for the app's interactive surface styling.
//
// Prefer the <Button>, <IconButton> and <Badge> components. Use the helpers
// below only where a component cannot be used (e.g. a <label> acting as a
// file-upload trigger, or a class on a third-party element).

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "subtle"
	| "ghost"
	| "danger"
	| "success"
	| "info"
	| "premium"
	| "soft-purple"
	| "soft-blue"
	| "soft-emerald"
	| "soft-amber"
	| "soft-red";

export type ButtonSize = "xs" | "sm" | "md" | "lg";
export type ButtonShape = "default" | "circle" | "square";

/** Shared by every button: consistent motion, focus ring and disabled treatment. */
const BUTTON_BASE =
	"btn press-spring tap-target gap-2 font-medium rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1222] disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	// Solid — one per intent. Use for the primary action of a screen or dialog.
	primary:
		"bg-gradient-to-b from-[#ffc457] to-[#f59e0b] hover:from-[#ffd27a] hover:to-[#f7a928] border-0 text-[#1a1305] font-semibold shadow-[0_8px_20px_-6px_rgba(245,165,36,0.55)] hover:shadow-[0_10px_26px_-6px_rgba(245,165,36,0.7)] focus-visible:ring-[#f5a524]",
	danger:
		"bg-gradient-to-b from-[#f2645a] to-[#d93a30] hover:from-[#f77a70] hover:to-[#e2483d] border-0 text-white font-semibold shadow-[0_8px_20px_-8px_rgba(239,68,68,0.6)] focus-visible:ring-red-400",
	success:
		"bg-gradient-to-b from-[#34c97f] to-[#16a05e] hover:from-[#46d78e] hover:to-[#1aae67] border-0 text-white font-semibold shadow-[0_8px_20px_-8px_rgba(34,197,94,0.55)] focus-visible:ring-[#4fd88a]",
	info: "bg-gradient-to-b from-[#5b8cff] to-[#3563e9] hover:from-[#6e9bff] hover:to-[#416ff0] border-0 text-white font-semibold shadow-[0_8px_20px_-8px_rgba(79,110,255,0.6)] focus-visible:ring-[#6aa8ff]",
	premium:
		"bg-gradient-to-br from-[#ffe1a6] via-[#f5a524] to-[#e07a1a] hover:from-[#ffeac0] hover:to-[#ea8a24] border-0 text-[#1a1305] font-semibold shadow-[0_8px_24px_-6px_rgba(245,165,36,0.6)] focus-visible:ring-[#ffcb6b]",

	// Neutral — the default for anything that is not the primary action.
	secondary:
		"bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-[#dbe2f4] hover:text-[#eef2ff] focus-visible:ring-[#8ea6e0]",
	subtle:
		"bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-[#c2cbe3] hover:text-[#eef2ff] focus-visible:ring-[#8ea6e0]",
	ghost: "btn-ghost border-0 text-[#a9b4d0] hover:text-[#eef2ff] hover:bg-white/[0.06] focus-visible:ring-[#8ea6e0]",

	// Soft/tinted — a coloured hint without competing with the primary action.
	"soft-purple":
		"bg-[#7451e6]/15 hover:bg-[#7451e6]/25 border border-[#b9a1ff]/30 text-[#e6dcff] hover:text-[#f4eaff] focus-visible:ring-[#b9a1ff]",
	"soft-blue":
		"bg-[#2f6be0]/18 hover:bg-[#2f6be0]/28 border border-[#6aa8ff]/30 text-[#c3dbff] hover:text-[#e6f0ff] focus-visible:ring-[#6aa8ff]",
	"soft-emerald":
		"bg-[#1f9d62]/18 hover:bg-[#1f9d62]/28 border border-[#4fd88a]/30 text-[#aef3c9] hover:text-[#e3fff0] focus-visible:ring-[#4fd88a]",
	"soft-amber":
		"bg-[#f5a524]/12 hover:bg-[#f5a524]/20 border border-[#f5a524]/35 text-[#ffcb6b] hover:text-[#ffe1a6] focus-visible:ring-[#f5a524]",
	"soft-red":
		"bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-300 hover:text-red-200 focus-visible:ring-red-400"
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
	xs: "btn-xs",
	sm: "btn-sm",
	md: "",
	lg: "btn-lg"
};

const BUTTON_SHAPES: Record<ButtonShape, string> = {
	default: "",
	circle: "btn-circle",
	square: "btn-square"
};

export interface ButtonClassOptions {
	variant?: ButtonVariant;
	size?: ButtonSize;
	shape?: ButtonShape;
	/** Stretch to the full width of the parent. */
	block?: boolean;
	/** Share the row evenly with sibling buttons (`flex-1`). */
	grow?: boolean;
	class?: string;
}

export function buttonClass({
	variant = "primary",
	size = "md",
	shape = "default",
	block = false,
	grow = false,
	class: className = ""
}: ButtonClassOptions = {}): string {
	return [
		BUTTON_BASE,
		BUTTON_VARIANTS[variant],
		BUTTON_SIZES[size],
		BUTTON_SHAPES[shape],
		block ? "w-full" : "",
		grow ? "flex-1" : "",
		className
	]
		.filter(Boolean)
		.join(" ");
}

export type BadgeTone = "neutral" | "purple" | "blue" | "green" | "amber" | "orange" | "red" | "cyan" | "pink";

export type BadgeSize = "xs" | "sm" | "md";

const BADGE_TONES: Record<BadgeTone, string> = {
	neutral: "bg-[#1b2641] text-[#c2cbe3] border-[#8ea6e0]/20",
	purple: "bg-[#7451e6]/20 text-[#e6dcff] border-[#b9a1ff]/30",
	blue: "bg-[#2f6be0]/20 text-[#c3dbff] border-[#6aa8ff]/30",
	green: "bg-[#1f9d62]/20 text-[#aef3c9] border-[#4fd88a]/30",
	amber: "bg-[#f5a524]/15 text-[#ffcb6b] border-[#f5a524]/35",
	orange: "bg-orange-600/20 text-orange-300 border-orange-500/30",
	red: "bg-red-600/20 text-red-300 border-red-500/30",
	cyan: "bg-cyan-600/20 text-cyan-300 border-cyan-500/30",
	pink: "bg-pink-600/20 text-pink-300 border-pink-500/30"
};

const BADGE_SIZES: Record<BadgeSize, string> = {
	xs: "badge-xs",
	sm: "badge-sm",
	md: ""
};

export function badgeClass({
	tone = "neutral",
	size = "sm",
	class: className = ""
}: { tone?: BadgeTone; size?: BadgeSize; class?: string } = {}): string {
	return ["badge border font-medium", BADGE_TONES[tone], BADGE_SIZES[size], className].filter(Boolean).join(" ");
}
