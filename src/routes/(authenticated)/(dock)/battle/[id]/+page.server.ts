// src/routes/(authenticated)/(dock)/battle/[id]/+page.server.ts
// Battle overview: both sides' forces, the course of the fight and, for
// players who can fight here, deploying units. Combat itself runs hourly in
// the battle job (services/military/battle-engine.ts).
import { error, fail } from "@sveltejs/kit";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { battleParticipants, battleRounds, battles, militaryUnits } from "#lib/server/schema.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { MILITARY_UNIT_TEMPLATES, regionConditions } from "#lib/config/index.js";
import {
	battleIntel,
	isFresh,
	resolveReconMissions,
	sideReports,
	viewerSide,
	type IntelPicture
} from "#lib/server/services/military/recon.js";
import { imageryInputs } from "#lib/server/services/military/imagery.js";
import { getRegionName } from "#lib/utils/formatting.js";
import { battleStrikeModifiers, strikeLog } from "#lib/server/services/military/strike.js";
import {
	PREPARATION_HOURS,
	TERRAIN_DATA,
	battleSide,
	fortificationReduction,
	processCombatRound,
	type Terrain
} from "#lib/server/services/military/battle-engine.js";

/** A unit can be sent into battle if it is trained, rested and still has men. */
const isDeployable = (u: typeof militaryUnits.$inferSelect) =>
	!u.isTraining && !u.isExercising && u.health > 0 && u.organization > 5;

const HOUR = 60 * 60 * 1000;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const battleId = Number(params.id);
	if (!Number.isInteger(battleId)) error(400, "Invalid battle ID");

	const battle = await db.query.battles.findFirst({
		where: eq(battles.id, battleId),
		with: {
			region: true,
			attackerState: true,
			defenderState: true,
			participants: {
				with: { unit: { with: { owner: { with: { profile: true } } } } },
				orderBy: asc(battleParticipants.joinedAt)
			},
			rounds: { orderBy: desc(battleRounds.roundNumber), limit: 48 }
		}
	});
	if (!battle) error(404, "Battle not found");

	const preparationEndsAt = new Date(battle.startedAt.getTime() + PREPARATION_HOURS * HOUR);
	// Rounds are fought on the hour by the battle job.
	const now = Date.now();
	const nextRoundAt =
		battle.phase === "ended"
			? null
			: new Date(
					Math.max(
						Math.ceil(now / HOUR) * HOUR,
						battle.phase === "active" ? 0 : Math.ceil(preparationEndsAt.getTime() / HOUR) * HOUR
					)
				);

	const [attackerLogo, defenderLogo, eligibility] = await Promise.all([
		getLogoUrl(battle.attackerState.logo),
		getLogoUrl(battle.defenderState.logo),
		battle.phase === "ended"
			? Promise.resolve({ side: null, reason: "This battle is over.", deployFromRegionId: null })
			: battleSide(db, account.id, battle)
	]);

	// Avatars of everyone with a unit in the fight, for the force lists.
	const ownerAvatars = new Map(
		await Promise.all(
			[...new Map(battle.participants.map((p) => [p.unit.ownerId, p.unit.owner?.profile?.logo])).entries()].map(
				async ([id, logo]) => [id, logo ? await getLogoUrl(logo) : null] as const
			)
		)
	);

	const width = TERRAIN_DATA[battle.terrain as Terrain]?.combatWidth ?? TERRAIN_DATA.plains.combatWidth;

	const forces = (side: "attacker" | "defender") => {
		const units = battle.participants
			.filter((p) => p.side === side)
			.map((p) => {
				const template = MILITARY_UNIT_TEMPLATES[p.unit.unitType];
				return {
					id: p.id,
					name: p.unit.name,
					unitType: p.unit.unitType,
					ownerId: p.unit.ownerId,
					ownerName: p.unit.owner?.profile?.name ?? "Unknown",
					ownerAvatar: ownerAvatars.get(p.unit.ownerId) ?? null,
					isMine: p.unit.ownerId === account.id,
					strength: p.currentStrength,
					maxStrength: p.maxStrength,
					organization: p.currentOrganization,
					damageDealt: p.damageDealt,
					damageTaken: p.damageTaken,
					isEngaged: p.isEngaged && p.currentStrength > 0,
					destroyed: p.currentStrength <= 0,
					attack: template?.baseAttack ?? 0,
					defense: template?.baseDefense ?? 0,
					combatWidth: template?.combatWidth ?? 1
				};
			});
		const standing = units.filter((u) => !u.destroyed);
		return {
			units,
			strength: standing.reduce((s, u) => s + u.strength, 0),
			maxStrength: units.reduce((s, u) => s + u.maxStrength, 0),
			usedWidth: units.filter((u) => u.isEngaged).reduce((s, u) => s + u.combatWidth, 0),
			maxWidth: width,
			damageDealt: units.reduce((s, u) => s + u.damageDealt, 0),
			standing: standing.length,
			destroyed: units.length - standing.length
		};
	};

	// Units the player could still send in, from the region they'd fight from.
	let deployable: {
		id: number;
		name: string;
		unitType: string;
		health: number;
		organization: number;
		experience: number;
		attack: number;
		defense: number;
	}[] = [];
	if (eligibility.side && eligibility.deployFromRegionId) {
		const inBattle = new Set(battle.participants.map((p) => p.unitId));
		const units = await db.query.militaryUnits.findMany({
			where: and(eq(militaryUnits.ownerId, account.id), eq(militaryUnits.regionId, eligibility.deployFromRegionId))
		});
		deployable = units
			.filter((u) => !inBattle.has(u.id) && isDeployable(u))
			.map((u) => ({
				id: u.id,
				name: u.name,
				unitType: u.unitType,
				health: u.health,
				organization: u.organization,
				experience: u.experience,
				attack: MILITARY_UNIT_TEMPLATES[u.unitType]?.baseAttack ?? 0,
				defense: MILITARY_UNIT_TEMPLATES[u.unitType]?.baseDefense ?? 0
			}));
	}

	// Intel and targeting: what each side's fresh recon over the battle region
	// is worth this round (same rules the battle job fights with).
	await resolveReconMissions(db).catch((err) => console.error("Recon resolve failed:", err));
	const engagedOf = (side: "attacker" | "defender") => {
		const standing = battle.participants.filter((p) => p.side === side && p.currentStrength > 0);
		const engaged = standing.filter((p) => p.isEngaged);
		return engaged.length ? engaged : standing;
	};
	const intel = await battleIntel(db, battle, { attackers: engagedOf("attacker"), defenders: engagedOf("defender") });
	const intelPanel = (mods: typeof intel.attacker, picture: IntelPicture | null) => ({
		modifiers: mods,
		level: picture?.level ?? "none",
		coverage: picture ? Object.fromEntries(Object.entries(picture.categories).map(([c, v]) => [c, v.coverage])) : null,
		firingPositions: picture?.firingPositions ?? null,
		sensors: picture?.sensors ?? []
	});

	// Recon imagery of the battle area: only the viewer's own side's passes.
	const viewer = await viewerSide(db, account.id);
	const imageryReports = viewer
		? await sideReports(db, viewer.stateIds, { regionIds: [battle.regionId], limit: 6 })
		: [];
	const imagery = (await imageryInputs(db, imageryReports)).map((input, i) => ({
		input,
		fresh: isFresh(imageryReports[i]!),
		regionName: getRegionName(battle.regionId)
	}));

	// The air war over this battle: strikes flown on it, and what supply cuts
	// and IHL morale do to each side's output this round.
	const [strikes, strikeMods] = await Promise.all([
		strikeLog(db, { battleId: battle.id }, 15),
		battle.status === "ongoing" ? battleStrikeModifiers(db, battle) : Promise.resolve(null)
	]);

	return {
		conditions: regionConditions(battle.region),
		imagery,
		airWar: { log: strikes, modifiers: strikeMods },
		intel: {
			attacker: intelPanel(intel.attacker, intel.attackerPicture),
			defender: intelPanel(intel.defender, intel.defenderPicture)
		},
		battle: {
			id: battle.id,
			warId: battle.warId,
			regionId: battle.regionId,
			terrain: battle.terrain,
			phase: battle.phase,
			status: battle.status,
			startedAt: battle.startedAt,
			endedAt: battle.endedAt,
			fortification: battle.region.fortifications ?? 0,
			buildingsDestroyed: battle.buildingsDestroyed ?? null,
			fortificationReduction: fortificationReduction(battle.region.fortifications ?? 0)
		},
		attacker: {
			id: battle.attackerState.id,
			name: battle.attackerState.name,
			logo: attackerLogo,
			...forces("attacker")
		},
		defender: {
			id: battle.defenderState.id,
			name: battle.defenderState.name,
			logo: defenderLogo,
			...forces("defender")
		},
		rounds: battle.rounds.map((r) => ({
			number: r.roundNumber,
			attackerDamage: r.attackerTotalDamage,
			defenderDamage: r.defenderTotalDamage,
			attackersEngaged: r.attackerUnitsEngaged,
			defendersEngaged: r.defenderUnitsEngaged,
			at: r.roundedAt
		})),
		preparationEndsAt,
		nextRoundAt,
		me: {
			side: eligibility.side,
			reason: eligibility.reason,
			deployable,
			isAdmin: locals.account?.role === "admin"
		}
	};
};

export const actions: Actions = {
	deploy: async ({ request, params, locals }) => {
		const account = locals.account!;
		const battleId = Number(params.id);
		const unitIds = (await request.formData()).getAll("unitIds").map(Number).filter(Number.isInteger);
		if (unitIds.length === 0) return fail(400, { error: "Select at least one unit." });

		const battle = await db.query.battles.findFirst({ where: eq(battles.id, battleId) });
		if (!battle || battle.phase === "ended") return fail(400, { error: "This battle is over." });

		const { side, reason, deployFromRegionId } = await battleSide(db, account.id, battle);
		if (!side || !deployFromRegionId) return fail(403, { error: reason ?? "You can't fight in this battle." });

		const units = await db.query.militaryUnits.findMany({
			where: and(inArray(militaryUnits.id, unitIds), eq(militaryUnits.ownerId, account.id))
		});
		const problems: string[] = [];
		const ready = units.filter((u) => {
			const why =
				u.regionId !== deployFromRegionId
					? "isn't in the region you fight from"
					: u.isTraining
						? "is still training"
						: u.isExercising
							? "is on exercise"
							: u.health <= 0
								? "has no strength left"
								: u.organization <= 5
									? "is too disorganised"
									: null;
			if (why) problems.push(`${u.name} ${why}`);
			return !why;
		});
		if (units.length < unitIds.length) problems.push("Some units weren't found");

		// All-or-nothing, and units already in the battle are skipped by the
		// unique (battle, unit) check rather than added twice.
		const deployed = await db.transaction(async (tx) => {
			const existing = new Set(
				(
					await tx
						.select({ unitId: battleParticipants.unitId })
						.from(battleParticipants)
						.where(eq(battleParticipants.battleId, battleId))
				).map((r) => r.unitId)
			);
			const fresh = ready.filter((u) => !existing.has(u.id));
			if (fresh.length) {
				await tx.insert(battleParticipants).values(
					fresh.map((u) => ({
						battleId,
						unitId: u.id,
						side,
						currentStrength: u.health,
						currentOrganization: u.organization,
						maxStrength: 100
					}))
				);
			}
			return fresh.length;
		});

		if (deployed === 0) return fail(400, { error: problems.join(" · ") || "Those units are already fighting here." });
		return {
			success: true,
			message: `${deployed} unit${deployed === 1 ? "" : "s"} sent into battle${problems.length ? ` (${problems.join(" · ")})` : ""}.`
		};
	},

	// Rounds run hourly; admins can trigger one to test the battle system.
	fightRound: async ({ params, locals }) => {
		if (locals.account?.role !== "admin") return fail(403, { error: "Rounds are fought automatically every hour." });
		const result = await processCombatRound(db, Number(params.id));
		if (!result) return fail(400, { error: "This battle isn't in its fighting phase." });
		return {
			success: true,
			message: result.battleEnded
				? `Round ${result.roundNumber}: the battle is over, the ${result.winner}s won.`
				: `Round ${result.roundNumber} fought.`
		};
	}
};
