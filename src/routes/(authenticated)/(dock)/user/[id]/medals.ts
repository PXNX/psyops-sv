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
		ribbon: stripes("#7a1712", "#f5a524", "#7a1712", "#f5a524", "#7a1712"),
		emoji: "🏆"
	},
	valor: {
		label: "Cross of Valor",
		for: "Courage and bravery",
		ribbon: stripes("#2148a8", "#eef2ff", "#a8221a", "#eef2ff", "#2148a8"),
		emoji: "🛡️"
	},
	excellence: {
		label: "Star of Excellence",
		for: "Exceptional quality",
		ribbon: stripes("#4a32a6", "#b9a1ff", "#eef2ff", "#b9a1ff", "#4a32a6"),
		emoji: "⭐"
	},
	service: {
		label: "Service Medal",
		for: "Dedicated service",
		ribbon: stripes("#177a4b", "#f5a524", "#177a4b", "#177a4b", "#f5a524", "#177a4b"),
		emoji: "🎖️"
	},
	leadership: {
		label: "Order of Leadership",
		for: "Exceptional leadership",
		ribbon: stripes("#a8221a", "#a8221a", "#f5a524", "#1a1305", "#f5a524", "#a8221a", "#a8221a"),
		emoji: "👑"
	}
};

export function medalInfo(type: string) {
	return (
		MEDALS[type as MedalType] ?? {
			label: "Medal",
			for: "",
			ribbon: stripes("#33456f", "#8ea6e0", "#33456f"),
			emoji: "🏅"
		}
	);
}
