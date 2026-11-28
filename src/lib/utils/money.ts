// src/lib/utils/money.ts
// Standard money formatting for the whole app. Compact notation (e.g. $1.2M)
// keeps big balances readable instead of overflowing cards and tables.

/** Formats a number as currency with compact notation, e.g. 1234567 -> "$1.2M". */
export function formatMoney(amount: number, locale = "en-US"): string {
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency: "USD",
		notation: "compact",
		maximumFractionDigits: 1
	}).format(amount);
}
