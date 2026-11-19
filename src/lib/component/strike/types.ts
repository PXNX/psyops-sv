// src/lib/component/strike/types.ts
// What the launchStrike form action returns, for the planner's result card.
export interface StrikeResult {
	id: number;
	outcome: "hit" | "partial" | "miss" | "intercepted";
	civilianCasualties: number;
	expectedCasualties: number;
	cost: number;
	summary: string[];
	violations: { kind: string; points: number }[];
}
