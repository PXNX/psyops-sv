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
		ribbon: stripes("#7a1712", "#f2b01e", "#7a1712", "#f2b01e", "#7a1712"),
		emoji: "🏆"
	},
	valor: {
		label: "Cross of Valor",
		for: "Courage and bravery",
		ribbon: stripes("#1d4f8a", "#f5efd8", "#a8221a", "#f5efd8", "#1d4f8a"),
		emoji: "🛡️"
	},
	excellence: {
		label: "Star of Excellence",
		for: "Exceptional quality",
		ribbon: stripes("#5a2f86", "#c08cf0", "#f5efd8", "#c08cf0", "#5a2f86"),
		emoji: "⭐"
	},
	service: {
		label: "Service Medal",
		for: "Dedicated service",
		ribbon: stripes("#2f7020", "#f2b01e", "#2f7020", "#2f7020", "#f2b01e", "#2f7020"),
		emoji: "🎖️"
	},
	leadership: {
		label: "Order of Leadership",
		for: "Exceptional leadership",
		ribbon: stripes("#a8221a", "#a8221a", "#f2b01e", "#1b1708", "#f2b01e", "#a8221a", "#a8221a"),
		emoji: "👑"
	}
};

export function medalInfo(type: string) {
	return (
		MEDALS[type as MedalType] ?? {
			label: "Medal",
			for: "",
			ribbon: stripes("#4a5238", "#c8b47a", "#4a5238"),
			emoji: "🏅"
		}
	);
}
