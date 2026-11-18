// src/lib/component/tactical/colors.ts
// Affiliation colours for tactical symbols (APP-6: blue friend, red hostile,
// amber unknown), tuned for a near-black map.
export const TACTICAL = {
	friend: { fill: "rgba(80, 150, 255, 0.28)", stroke: "#6aa8ff", icon: "#cfe2ff", text: "#9cc7ff" },
	hostile: { fill: "rgba(255, 70, 70, 0.25)", stroke: "#ff5a5a", icon: "#ffd0d0", text: "#ff8a8a" },
	unknown: { fill: "rgba(245, 190, 60, 0.18)", stroke: "#f5be3c", icon: "#ffe08a", text: "#ffd166" }
} as const;

export const RECON_BLUE = "#4f9dff";
export const HOSTILE_RED = "#ff4d4d";
