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
	"btn gap-2 font-medium rounded-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1929] disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	// Solid — one per intent. Use for the primary action of a screen or dialog.
	primary:
			"bg-[#e6a527] hover:bg-[#f2b940] border border-[#f2c463] text-[#172a45] shadow-[0_3px_0_rgba(112,65,10,0.42)] hover:shadow-[0_5px_0_rgba(112,65,10,0.34)] focus-visible:ring-[#e6a527]",
	danger: "bg-red-600 hover:bg-red-500 border-0 text-white shadow-lg shadow-red-600/20 focus-visible:ring-red-400",
	success:
		"bg-emerald-600 hover:bg-emerald-500 border-0 text-white shadow-lg shadow-emerald-600/20 focus-visible:ring-emerald-400",
	info: "bg-blue-600 hover:bg-blue-500 border-0 text-white shadow-lg shadow-blue-600/20 focus-visible:ring-blue-400",
	premium:
		"bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 border-0 text-slate-900 font-semibold shadow-lg shadow-amber-500/25 focus-visible:ring-amber-300",

	// Neutral — the default for anything that is not the primary action.
	secondary:
		"bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8] focus-visible:ring-[#e6a527]",
	subtle:
		"bg-[#102239]/70 hover:bg-[#19304b] border border-[#dfceb0]/15 text-[#d9ccb7] hover:text-[#fff7e8] focus-visible:ring-[#e6a527]",
	ghost: "btn-ghost border-0 text-[#c7bda9] hover:text-[#fff7e8] hover:bg-[#e6a527]/10 focus-visible:ring-[#e6a527]",

	// Soft/tinted — a coloured hint without competing with the primary action.
	"soft-purple":
			"bg-[#8c709b]/15 hover:bg-[#8c709b]/25 border border-[#b7a0c5]/30 text-[#d5c4df] hover:text-[#f0e7f5] focus-visible:ring-[#b7a0c5]",
	"soft-blue":
			"bg-[#315d8d]/18 hover:bg-[#315d8d]/28 border border-[#7ba0c8]/30 text-[#b7d0e6] hover:text-[#e1effa] focus-visible:ring-[#7ba0c8]",
	"soft-emerald":
			"bg-[#587252]/18 hover:bg-[#587252]/28 border border-[#8fae88]/30 text-[#c6dfbf] hover:text-[#edfae7] focus-visible:ring-[#8fae88]",
	"soft-amber":
			"bg-[#e6a527]/12 hover:bg-[#e6a527]/20 border border-[#e6a527]/35 text-[#f7c56b] hover:text-[#ffe2a4] focus-visible:ring-[#e6a527]",
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
	neutral: "bg-[#14283f] text-[#d9ccb7] border-[#dfceb0]/20",
	purple: "bg-[#8c709b]/20 text-[#d5c4df] border-[#b7a0c5]/30",
	blue: "bg-[#315d8d]/20 text-[#b7d0e6] border-[#7ba0c8]/30",
	green: "bg-[#587252]/20 text-[#c6dfbf] border-[#8fae88]/30",
	amber: "bg-[#e6a527]/15 text-[#f7c56b] border-[#e6a527]/35",
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
