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
	"btn gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	// Solid — one per intent. Use for the primary action of a screen or dialog.
	primary:
		"bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30 focus-visible:ring-purple-400",
	danger: "bg-red-600 hover:bg-red-500 border-0 text-white shadow-lg shadow-red-600/20 focus-visible:ring-red-400",
	success:
		"bg-emerald-600 hover:bg-emerald-500 border-0 text-white shadow-lg shadow-emerald-600/20 focus-visible:ring-emerald-400",
	info: "bg-blue-600 hover:bg-blue-500 border-0 text-white shadow-lg shadow-blue-600/20 focus-visible:ring-blue-400",
	premium:
		"bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 border-0 text-slate-900 font-semibold shadow-lg shadow-amber-500/25 focus-visible:ring-amber-300",

	// Neutral — the default for anything that is not the primary action.
	secondary:
		"bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30 text-gray-300 hover:text-white focus-visible:ring-slate-400",
	subtle:
		"bg-slate-800/60 hover:bg-slate-700/60 border border-white/5 text-gray-300 hover:text-white focus-visible:ring-slate-400",
	ghost: "btn-ghost border-0 text-gray-400 hover:text-white hover:bg-white/5 focus-visible:ring-slate-400",

	// Soft/tinted — a coloured hint without competing with the primary action.
	"soft-purple":
		"bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-300 hover:text-purple-200 focus-visible:ring-purple-400",
	"soft-blue":
		"bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-300 hover:text-blue-200 focus-visible:ring-blue-400",
	"soft-emerald":
		"bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 hover:text-emerald-200 focus-visible:ring-emerald-400",
	"soft-amber":
		"bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-300 hover:text-amber-200 focus-visible:ring-amber-400",
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
	default: "rounded-lg",
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

export type BadgeTone =
	| "neutral"
	| "purple"
	| "blue"
	| "green"
	| "amber"
	| "orange"
	| "red"
	| "cyan"
	| "pink";

export type BadgeSize = "xs" | "sm" | "md";

const BADGE_TONES: Record<BadgeTone, string> = {
	neutral: "bg-slate-700/50 text-gray-300 border-white/10",
	purple: "bg-purple-600/20 text-purple-300 border-purple-500/30",
	blue: "bg-blue-600/20 text-blue-300 border-blue-500/30",
	green: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30",
	amber: "bg-amber-600/20 text-amber-300 border-amber-500/30",
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
	return ["badge border font-medium", BADGE_TONES[tone], BADGE_SIZES[size], className]
		.filter(Boolean)
		.join(" ");
}
