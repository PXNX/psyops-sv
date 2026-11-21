// src/lib/utils/market-price.ts
// The quoted price of a tradable item is the lowest live offer on the book,
// not the price of the last trade. A listing with no units left is not an
// offer: it can't be bought.

export interface Offer {
	pricePerUnit: number;
	quantity: number;
}

/** Cheapest price still on offer, or null when the book is empty. */
export function bestAsk<T extends Offer>(offers: T[]): number | null {
	let lowest: number | null = null;
	for (const offer of offers) {
		if (offer.quantity <= 0 || offer.pricePerUnit <= 0) continue;
		if (lowest === null || offer.pricePerUnit < lowest) lowest = offer.pricePerUnit;
	}
	return lowest;
}

/** Units still available across every live offer. */
export function offeredQuantity<T extends Offer>(offers: T[]): number {
	return offers.reduce((sum, o) => sum + (o.quantity > 0 ? o.quantity : 0), 0);
}
