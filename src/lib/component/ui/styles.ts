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
	"btn press-spring gap-2 font-medium rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12150f] disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	// Solid — one per intent. Use for the primary action of a screen or dialog.
	primary:
		"bg-gradient-to-b from-[#ffc940] to-[#d99410] hover:from-[#ffd65e] hover:to-[#eaa51c] border border-[#ffe08a] text-[#1b1708] font-semibold [text-shadow:0_1px_0_rgba(255,240,190,0.5)] shadow-[inset_0_1px_0_rgba(255,250,220,0.6),inset_0_-2px_0_rgba(120,70,0,0.45),0_3px_10px_rgba(0,0,0,0.45),0_0_14px_rgba(242,176,30,0.25)] focus-visible:ring-[#f2b01e]",
	danger:
		"bg-gradient-to-b from-[#e0453a] to-[#a8221a] hover:from-[#f05a4e] hover:to-[#bd2a20] border border-[#ff8a7a]/60 text-[#fff1ec] font-semibold shadow-[inset_0_1px_0_rgba(255,244,200,0.12),inset_0_-1px_0_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.4)] focus-visible:ring-red-400",
	success:
		"bg-gradient-to-b from-[#58b032] to-[#2f7020] hover:from-[#68c63e] hover:to-[#378127] border border-[#9ef07a]/60 text-[#f0ffe6] font-semibold shadow-[inset_0_1px_0_rgba(255,244,200,0.12),inset_0_-1px_0_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.4)] focus-visible:ring-[#6fd14a]",
	info: "bg-gradient-to-b from-[#3a8ae0] to-[#1d5a9e] hover:from-[#4c9cf0] hover:to-[#2468b4] border border-[#8cc6ff]/60 text-[#eef7ff] font-semibold shadow-[inset_0_1px_0_rgba(255,244,200,0.12),inset_0_-1px_0_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.4)] focus-visible:ring-[#5eaef5]",
	premium:
		"bg-gradient-to-b from-[#ffe27a] via-[#f2b01e] to-[#b97a08] hover:from-[#fff0a8] hover:to-[#d08c0e] border border-[#fff0b0] text-[#1b1708] font-semibold shadow-[inset_0_1px_0_rgba(255,255,230,0.7),0_0_18px_rgba(255,200,60,0.4)] focus-visible:ring-[#ffd35c]",

	// Neutral — the default for anything that is not the primary action.
	secondary:
		"bg-gradient-to-b from-[#353d29] to-[#20261a] hover:from-[#414a32] hover:to-[#29301f] border border-[#c8b47a]/40 hover:border-[#f2b01e]/60 text-[#e6ddbf] hover:text-[#f5efd8] shadow-[inset_0_1px_0_rgba(255,244,200,0.12),inset_0_-1px_0_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.4)] focus-visible:ring-[#f2b01e]",
	subtle:
		"bg-[#1a1f15]/80 hover:bg-[#2e3524] border border-[#c8b47a]/25 text-[#d3caa9] hover:text-[#f5efd8] shadow-[inset_0_1px_0_rgba(255,244,200,0.06)] focus-visible:ring-[#f2b01e]",
	ghost: "btn-ghost border-0 text-[#c0b897] hover:text-[#f5efd8] hover:bg-[#f2b01e]/10 focus-visible:ring-[#f2b01e]",

	// Soft/tinted — a coloured hint without competing with the primary action.
	"soft-purple":
		"bg-[#8a4fc0]/15 hover:bg-[#8a4fc0]/25 border border-[#c08cf0]/30 text-[#e3cbfb] hover:text-[#f4eaff] focus-visible:ring-[#c08cf0]",
	"soft-blue":
		"bg-[#2369b5]/18 hover:bg-[#2369b5]/28 border border-[#5eaef5]/30 text-[#b3dcff] hover:text-[#e3f2ff] focus-visible:ring-[#5eaef5]",
	"soft-emerald":
		"bg-[#3f8a2a]/18 hover:bg-[#3f8a2a]/28 border border-[#6fd14a]/30 text-[#b9f29a] hover:text-[#eaffdd] focus-visible:ring-[#6fd14a]",
	"soft-amber":
		"bg-[#f2b01e]/12 hover:bg-[#f2b01e]/20 border border-[#f2b01e]/35 text-[#ffd35c] hover:text-[#ffe58f] focus-visible:ring-[#f2b01e]",
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
	neutral: "bg-[#242a1d] text-[#d3caa9] border-[#c8b47a]/20",
	purple: "bg-[#8a4fc0]/20 text-[#e3cbfb] border-[#c08cf0]/30",
	blue: "bg-[#2369b5]/20 text-[#b3dcff] border-[#5eaef5]/30",
	green: "bg-[#3f8a2a]/20 text-[#b9f29a] border-[#6fd14a]/30",
	amber: "bg-[#f2b01e]/15 text-[#ffd35c] border-[#f2b01e]/35",
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
