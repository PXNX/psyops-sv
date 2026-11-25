// src/lib/server/services/economy/net-worth.ts
// Everything a player owns, priced at what it would fetch today: cash, shares
// at the current quote, stockpiles at the cheapest live ask, and the principal
// of bonds still outstanding. One batched pass serves a profile and the
// richest-players board so both always agree.
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../db";
import {
	accounts,
	companies,
	marketListings,
	productInventory,
	resourceInventory,
	shareHoldings,
	states,
	userProfiles,
	userWallets
} from "../../schema";
import { stateBonds } from "../../schema-investments";
import { sharePrices } from "./dividends.js";

export interface Holding {
	label: string;
	quantity: number;
	unitPrice: number;
	value: number;
	href?: string;
}

export interface NetWorth {
	cash: number;
	stocks: number;
	resources: number;
	bonds: number;
	total: number;
	shareHoldings: Holding[];
	inventory: Holding[];
	bondHoldings: Holding[];
}

const empty = (): NetWorth => ({
	cash: 0,
	stocks: 0,
	resources: 0,
	bonds: 0,
	total: 0,
	shareHoldings: [],
	inventory: [],
	bondHoldings: []
});

/** Net worth for many players in a fixed number of queries. */
export async function netWorths(db: Database, userIds: string[]): Promise<Map<string, NetWorth>> {
	const ids = [...new Set(userIds)];
	const out = new Map<string, NetWorth>();
	if (!ids.length) return out;
	for (const id of ids) out.set(id, empty());
	const value = (id: string) => out.get(id)!;

	const [wallets, holdings, resources, products, asks, bonds] = await Promise.all([
		db
			.select({ userId: userWallets.userId, balance: userWallets.balance })
			.from(userWallets)
			.where(inArray(userWallets.userId, ids)),
		db
			.select({
				userId: shareHoldings.userId,
				companyId: shareHoldings.companyId,
				quantity: shareHoldings.quantity
			})
			.from(shareHoldings)
			.where(inArray(shareHoldings.userId, ids)),
		db
			.select({
				userId: resourceInventory.userId,
				name: resourceInventory.resourceType,
				quantity: resourceInventory.quantity
			})
			.from(resourceInventory)
			.where(inArray(resourceInventory.userId, ids)),
		db
			.select({
				userId: productInventory.userId,
				name: productInventory.productType,
				quantity: productInventory.quantity
			})
			.from(productInventory)
			.where(inArray(productInventory.userId, ids)),
		db
			.selectDistinctOn([marketListings.itemName], {
				itemName: marketListings.itemName,
				pricePerUnit: marketListings.pricePerUnit
			})
			.from(marketListings)
			.where(gt(marketListings.quantity, 0))
			.orderBy(marketListings.itemName, marketListings.pricePerUnit, marketListings.id),
		db
			.select({
				userId: stateBonds.userId,
				principal: stateBonds.principal,
				stateId: stateBonds.stateId,
				couponRatePercent: stateBonds.couponRatePercent
			})
			.from(stateBonds)
			.where(and(inArray(stateBonds.userId, ids), isNull(stateBonds.redeemedAt)))
	]);

	for (const w of wallets) {
		value(w.userId).cash = Math.max(0, Number(w.balance));
	}

	const prices = await sharePrices(
		db,
		holdings.map((h) => h.companyId)
	);
	const companyIds = [...new Set(holdings.map((h) => h.companyId))];
	const companyRows = companyIds.length
		? await db
				.select({ id: companies.id, name: companies.name })
				.from(companies)
				.where(inArray(companies.id, companyIds))
		: [];
	const companyNames = new Map(companyRows.map((c) => [c.id, c.name]));
	for (const h of holdings) {
		if (h.quantity <= 0) continue;
		const unitPrice = prices.get(h.companyId) ?? 0;
		const worth = Math.round(h.quantity * unitPrice);
		const row = value(h.userId);
		row.stocks += worth;
		row.shareHoldings.push({
			label: companyNames.get(h.companyId) ?? `Company #${h.companyId}`,
			quantity: h.quantity,
			unitPrice,
			value: worth,
			href: `/company/${h.companyId}`
		});
	}

	const askByItem = new Map(asks.map((a) => [a.itemName, Number(a.pricePerUnit)]));
	for (const item of [...resources, ...products]) {
		if (item.quantity <= 0) continue;
		const unitPrice = askByItem.get(item.name) ?? 0;
		const worth = Math.round(item.quantity * unitPrice);
		const row = value(item.userId);
		row.resources += worth;
		row.inventory.push({
			label: item.name,
			quantity: item.quantity,
			unitPrice,
			value: worth,
			href: unitPrice ? `/market/${item.name}` : undefined
		});
	}

	const stateIds = [...new Set(bonds.map((b) => b.stateId))];
	const stateRows = stateIds.length
		? await db.select({ id: states.id, name: states.name }).from(states).where(inArray(states.id, stateIds))
		: [];
	const stateNames = new Map(stateRows.map((s) => [s.id, s.name]));
	for (const b of bonds) {
		const principal = Math.max(0, Number(b.principal));
		value(b.userId).bonds += principal;
		value(b.userId).bondHoldings.push({
			label: `${stateNames.get(b.stateId) ?? `State #${b.stateId}`} bond (${b.couponRatePercent}%)`,
			quantity: 1,
			unitPrice: principal,
			value: principal,
			href: `/bonds`
		});
	}

	for (const row of out.values()) {
		row.total = row.cash + row.stocks + row.resources + row.bonds;
		row.shareHoldings.sort((a, b) => b.value - a.value);
		row.inventory.sort((a, b) => b.value - a.value);
		row.bondHoldings.sort((a, b) => b.value - a.value);
	}
	return out;
}

export async function netWorth(db: Database, userId: string): Promise<NetWorth> {
	return (await netWorths(db, [userId])).get(userId) ?? empty();
}

/** Richest players first, with their display names. */
export async function richestPlayers(db: Database, limit = 50) {
	const accountRows = await db.select({ id: accounts.id }).from(accounts);
	const [rows, worths] = await Promise.all([
		db
			.select({ id: accounts.id, name: userProfiles.name })
			.from(accounts)
			.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id)),
		netWorths(
			db,
			accountRows.map((a) => a.id)
		)
	]);
	return rows
		.map((row) => ({
			id: row.id,
			name: row.name || row.id,
			total: worths.get(row.id)?.total ?? 0
		}))
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
		.slice(0, limit);
}
