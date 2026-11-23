// Bond yields are priced from the borrowing state's ability to pay, not a
// flat number. Every input is a game-world signal the player can see on the
// state's pages, and the breakdown is returned so the UI can explain the rate.
import { and, eq, or } from "drizzle-orm";
import type { Database } from "../../db.js";
import { stateTreasury, states, wars } from "../../schema.js";
import { BOND_RISK, BOND_GRADES, bondGrade, bondYield, type BondGrade } from "#lib/config/index.js";

export interface BondRiskComponent {
	key: string;
	label: string;
	detail: string;
	points: number;
}

export interface BondRisk {
	stateId: number;
	score: number;
	grade: BondGrade;
	label: string;
	/** Annual coupon percent a new bond in this state pays. */
	ratePercent: number;
	components: BondRiskComponent[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Price the debt of a state from its books, its wars and its stability. */
export async function bondRiskFor(db: Database, stateId: number, now: Date = new Date()): Promise<BondRisk> {
	const [stateRow] = await db
		.select({
			id: states.id,
			capitulated: states.capitulated,
			blocId: states.blocId
		})
		.from(states)
		.where(eq(states.id, stateId))
		.limit(1);

	const [treasuryRows, atWarRows] = await Promise.all([
		db
			.select({ balance: stateTreasury.balance, debt: stateTreasury.debt })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, stateId))
			.limit(1),
		db
			.select({ id: wars.id })
			.from(wars)
			.where(
				and(
					eq(wars.status, "active"),
					or(eq(wars.attackerId, stateId), eq(wars.defenderId, stateId))
				)
			)
			.limit(1)
	]);

	const components: BondRiskComponent[] = [
		{ key: "base", label: "Baseline", detail: "ordinary sovereign risk", points: BOND_RISK.BASE_RISK }
	];
	let score = BOND_RISK.BASE_RISK;
	const add = (key: string, label: string, detail: string, points: number) => {
		const rounded = Math.round(points);
		if (!rounded) return;
		score += rounded;
		components.push({ key, label, detail, points: rounded });
	};

	const debt = Number(treasuryRows[0]?.debt ?? 0);
	const balance = Number(treasuryRows[0]?.balance ?? 0);
	if (debt > 0) {
		const pressure = Math.min(
			BOND_RISK.DEBT_TO_GDP_CAP,
			(debt / Math.max(1, debt + balance)) * BOND_RISK.DEBT_TO_GDP_PER_POINT * 100
		);
		add("debt", "Debt pressure", `${debt.toLocaleString()} owed against ${balance.toLocaleString()} in cash`, pressure);
		if (balance < debt * 0.1)
			add("cushion", "Thin treasury", "cash covers under a tenth of what is owed", BOND_RISK.THIN_CUSHION);
		else if (balance < debt * 0.3)
			add("cushion", "Weak cushion", "cash covers under a third of what is owed", BOND_RISK.WEAK_CUSHION);
	}

	if (!stateRow?.blocId) add("bloc", "No allies", "no bloc to lean on", BOND_RISK.NO_BLOC);

	const final = clamp(score);
	const grade = bondGrade(final);
	const label = BOND_GRADES.find((g) => g.grade === grade)?.label ?? "Unknown";
	return {
		stateId,
		score: final,
		grade,
		label,
		ratePercent: bondYield(final),
		components
	};
}
