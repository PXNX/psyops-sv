// src/routes/(authenticated)/(dock)/user/[id]/medals.ts
// Medal ribbons as worn on a uniform: each medal type has its own striped
// ribbon (used on the identity card and the service record).

export type MedalType = "honor" | "valor" | "excellence" | "service" | "leadership";

function stripes(...colors: string[]) {
	const step = 100 / colors.length;
	return `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;
}

export const MEDALS: Record<MedalType, { label: string; for: string; ribbon: string; emoji: string }> = {
	honor: {
		label: "Medal of Honor",
		for: "Outstanding achievement",
		ribbon: stripes("#7a1712", "var(--color-primary)", "#7a1712", "var(--color-primary)", "#7a1712"),
		emoji: "🏆"
	},
	valor: {
		label: "Cross of Valor",
		for: "Courage and bravery",
		ribbon: stripes(
			"var(--color-friendly-deep)",
			"var(--color-fg)",
			"#a8221a",
			"var(--color-fg)",
			"var(--color-friendly-deep)"
		),
		emoji: "🛡️"
	},
	excellence: {
		label: "Star of Excellence",
		for: "Exceptional quality",
		ribbon: stripes(
			"var(--color-politics-deep)",
			"var(--color-politics)",
			"var(--color-fg)",
			"var(--color-politics)",
			"var(--color-politics-deep)"
		),
		emoji: "⭐"
	},
	service: {
		label: "Service Medal",
		for: "Dedicated service",
		ribbon: stripes(
			"var(--color-positive-deep)",
			"var(--color-primary)",
			"var(--color-positive-deep)",
			"var(--color-positive-deep)",
			"var(--color-primary)",
			"var(--color-positive-deep)"
		),
		emoji: "🎖️"
	},
	leadership: {
		label: "Order of Leadership",
		for: "Exceptional leadership",
		ribbon: stripes(
			"#a8221a",
			"#a8221a",
			"var(--color-primary)",
			"#ffffff",
			"var(--color-primary)",
			"#a8221a",
			"#a8221a"
		),
		emoji: "👑"
	}
};

export function medalInfo(type: string) {
	return (
		MEDALS[type as MedalType] ?? {
			label: "Medal",
			for: "",
			ribbon: stripes("var(--color-surface-13)", "var(--color-line)", "var(--color-surface-13)"),
			emoji: "🏅"
		}
	);
}
