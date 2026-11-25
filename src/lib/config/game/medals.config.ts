// Community karma awarded for a medal, by decoration. Medals recognise service
// to the community, so they count alongside upvotes as one more karma source.
export const MEDAL_KARMA = {
	honor: 30,
	valor: 25,
	service: 15,
	excellence: 25,
	leadership: 20
} as const;

export type MedalType = keyof typeof MEDAL_KARMA;

export function medalKarma(type: string): number {
	return MEDAL_KARMA[type as MedalType] ?? 0;
}
