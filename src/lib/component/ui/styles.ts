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
	"btn press-spring tap-target gap-2 font-medium rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	// Solid — one per intent. Use for the primary action of a screen or dialog.
	primary:
		"bg-primary hover:bg-primary-mid border border-primary-hi/60 text-white font-semibold focus-visible:ring-primary",
	danger:
		"bg-[#da3633] hover:bg-[#e5534b] border border-[#f85149]/60 text-white font-semibold focus-visible:ring-red-400",
	success:
		"bg-positive-deep hover:bg-positive-bg border border-positive/50 text-white font-semibold focus-visible:ring-positive",
	info: "bg-friendly-deep hover:bg-friendly-bg border border-friendly/50 text-white font-semibold focus-visible:ring-friendly",
	premium:
		"bg-[#bb8009] hover:bg-[#d29922] border border-[#e3b341]/60 text-white font-semibold focus-visible:ring-[#e3b341]",

	// Neutral — the default for anything that is not the primary action.
	secondary:
		"bg-surface-8 hover:bg-surface-10 border border-line/20 hover:border-line/35 text-fg-body hover:text-fg focus-visible:ring-primary",
	subtle: "bg-surface-4 hover:bg-surface-7 border border-line/12 text-fg-soft hover:text-fg focus-visible:ring-primary",
	ghost: "btn-ghost border-0 text-fg-dim hover:text-fg hover:bg-surface-7 focus-visible:ring-primary",

	// Soft/tinted — a coloured hint without competing with the primary action.
	"soft-purple":
		"bg-politics-bg/15 hover:bg-politics-bg/25 border border-politics/30 text-politics-fg hover:text-[#f4eaff] focus-visible:ring-politics",
	"soft-blue":
		"bg-friendly-bg/18 hover:bg-friendly-bg/28 border border-friendly/30 text-friendly-fg hover:text-friendly-hi focus-visible:ring-friendly",
	"soft-emerald":
		"bg-positive-bg/18 hover:bg-positive-bg/28 border border-positive/30 text-positive-fg hover:text-positive-hi focus-visible:ring-positive",
	"soft-amber":
		"bg-primary/12 hover:bg-primary/20 border border-primary/35 text-primary-fg hover:text-primary-soft focus-visible:ring-primary",
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
	neutral: "bg-surface-6 text-fg-soft border-line/20",
	purple: "bg-politics-bg/20 text-politics-fg border-politics/30",
	blue: "bg-friendly-bg/20 text-friendly-fg border-friendly/30",
	green: "bg-positive-bg/20 text-positive-fg border-positive/30",
	amber: "bg-primary/15 text-primary-fg border-primary/35",
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
