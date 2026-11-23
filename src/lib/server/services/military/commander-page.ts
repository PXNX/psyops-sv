// src/lib/server/services/military/commander-page.ts
// Form actions and page data for the officer academy and unit groups.
import { fail } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import { commanders, commanderTrainings, militaryUnits } from "#lib/server/schema.js";
import { navalAuthority } from "./naval.js";
import { loadUnitGroups } from "./commanders.js";
import {
	assignCommander,
	CommanderError,
	disbandUnitGroup,
	formUnitGroup,
	resolveCommanderTrainings,
	setUnitGroup,
	startCommanderTraining
} from "./commanders.js";

function message(err: unknown) {
	return err instanceof CommanderError || err instanceof Error ? err.message : "Something went wrong.";
}

export const commanderActions: import("@sveltejs/kit").Actions = {
	startTraining: async ({ locals }) => {
		try {
			await resolveCommanderTrainings(db);
			await startCommanderTraining(db, locals.account!.id);
			return { success: true, message: "Officer academy course started — 24 hours to graduation." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	formUnitGroup: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const group = await formUnitGroup(db, locals.account!.id, {
				kind: String(f.get("kind")) === "division" ? "division" : "airgroup",
				name: String(f.get("name") ?? ""),
				unitIds: f.getAll("unitIds").map(Number)
			});
			return { success: true, message: `${group.name} formed.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	setUnitGroup: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const raw = String(f.get("groupId") ?? "");
			await setUnitGroup(db, locals.account!.id, f.getAll("unitIds").map(Number), raw ? Number(raw) : null);
			return { success: true, message: "Units reassigned." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	disbandUnitGroup: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await disbandUnitGroup(db, locals.account!.id, Number(f.get("groupId")));
			return { success: true, message: "Group disbanded." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	assignCommander: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const raw = String(f.get("commanderId") ?? "");
			await assignCommander(db, locals.account!.id, {
				kind: String(f.get("kind")) as "fleet" | "airgroup" | "division",
				id: Number(f.get("id")),
				commanderId: raw ? Number(raw) : null
			});
			return { success: true, message: "Commander assigned." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	}
};

/** Commanders, pending courses and groups for one account/state. */
export async function commanderPageLoad(userId: string) {
	await resolveCommanderTrainings(db);
	const stateId = (await navalAuthority(db, userId).catch(() => null))?.stateId;
	const [officers, trainings] = await Promise.all([
		stateId ? db.select().from(commanders).where(eq(commanders.stateId, stateId)).orderBy(commanders.id) : Promise.resolve([]),
		db
			.select()
			.from(commanderTrainings)
			.where(and(eq(commanderTrainings.ownerId, userId), isNull(commanderTrainings.completedAt)))
			.orderBy(commanderTrainings.completesAt)
	]);
	const groups = stateId ? await loadUnitGroups(db, stateId) : [];
	const units = await db.select().from(militaryUnits).where(eq(militaryUnits.ownerId, userId));
	return { officers, trainings, groups, units: units.map((u) => ({ ...u })) };
}
