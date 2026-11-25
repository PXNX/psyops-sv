// src/lib/utils/market-price.ts
// The quoted price of a tradable item is the lowest live offer on the book,
// not the price of the last trade. A listing with no units left is not an
// offer: it can't be bought. The market only ever shows (and sells) that one
// cheapest offer.

export interface Offer {
	pricePerUnit: number;
	quantity: number;
}

/** The cheapest live offer, or null when the book is empty. */
export function bestOffer<T extends Offer>(offers: T[]): T | null {
	let best: T | null = null;
	for (const offer of offers) {
		if (offer.quantity <= 0 || offer.pricePerUnit <= 0) continue;
		if (best === null || offer.pricePerUnit < best.pricePerUnit) best = offer;
	}
	return best;
}

/** Cheapest price still on offer, or null when the book is empty. */
export function bestAsk<T extends Offer>(offers: T[]): number | null {
	return bestOffer(offers)?.pricePerUnit ?? null;
}

/** Units available at the cheapest offer, or 0 when nothing is on offer. */
export function offeredQuantity<T extends Offer>(offers: T[]): number {
	return bestOffer(offers)?.quantity ?? 0;
}
