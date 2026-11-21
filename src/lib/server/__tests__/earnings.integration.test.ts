// The fortnightly reporting cycle: the guard that makes a weekly schedule
// run every other week, and the report snapshot written once per period.
import { afterAll, beforeAll, describe, expect, it } from "@rstest/core";
import { eq } from "drizzle-orm";
import { createMockDb, type MockDbHandle } from "../mock-db";
import { companies, companyShares } from "../schema";
import { companyEarningsReports } from "../schema-investments";
import {
	companyEarnings,
	earningsPulse,
	earningsWindow,
	generateEarningsReports,
	isBiweeklyDue
} from "../services/economy/earnings";

const DAY = 86_400_000;
const anchor = "2026-01-05T00:00:00Z";
const now = new Date("2026-03-16T12:00:00Z");

describe("biweekly guard", () => {
	it("fires on the anchor week and every second week after it", () => {
		expect(isBiweeklyDue(new Date(anchor), anchor)).toBe(true);
		expect(isBiweeklyDue(new Date("2026-01-12T00:00:00Z"), anchor)).toBe(false);
		expect(isBiweeklyDue(new Date("2026-01-19T00:00:00Z"), anchor)).toBe(true);
		expect(isBiweeklyDue(new Date("2025-12-29T00:00:00Z"), anchor)).toBe(false);
	});

	it("uses a 14-day window ending at the run time", () => {
		const window = earningsWindow(now);
		expect(window.periodEnd.getTime() - window.periodStart.getTime()).toBe(14 * DAY);
	});
});

describe("publishing earnings", () => {
	let handle: MockDbHandle;
	let companyId: number;

	beforeAll(async () => {
		handle = await createMockDb();
		const [company] = await handle.db.select().from(companies).where(eq(companies.name, "Freedonia Mining Corp"));
		companyId = company!.id;
		await handle.db
			.insert(companyShares)
			.values({ companyId, totalShares: 1000, founderLockedShares: 510, ipoPrice: 50 });
	}, 900_000);

	afterAll(async () => {
		await handle?.close();
	});

	it("publishes one report per period and never duplicates it", async () => {
		const first = await generateEarningsReports(handle.db, now);
		expect(first.published).toBe(1);
		const second = await generateEarningsReports(handle.db, now);
		expect(second.published).toBe(0);
		const reports = await handle.db.select().from(companyEarningsReports);
		expect(reports).toHaveLength(1);
		expect(reports[0]!.periodEnd.getTime()).toBe(now.getTime());
		expect(reports[0]!.sharesOutstanding).toBe(1000);

		const pulse = await earningsPulse(handle.db);
		expect(pulse[0]!.companyName).toBe("Freedonia Mining Corp");
		expect((await companyEarnings(handle.db, companyId))[0]!.id).toBe(reports[0]!.id);
	});
});
