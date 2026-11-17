// src/lib/server/services/military/combat.ts
// Pure combat helpers used by the battle cron (/api/cron/battles).
import { MILITARY_UNIT_TEMPLATES } from "#lib/config/index.js";

// Select units that fit in combat width, prioritizing earliest joined.
// `participants` are battle_participants rows with their military unit
// nested under `.unit` (the unit type lives there, not on the participant).
export function selectEngagedUnits<
	P extends {
		currentStrength: number;
		joinedAt: Date | string;
		unit: { unitType: keyof typeof MILITARY_UNIT_TEMPLATES };
	}
>(participants: P[], maxWidth: number): P[] {
	const available = participants.filter((p) => p.currentStrength > 0);
	available.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

	const engaged: P[] = [];
	let usedWidth = 0;

	for (const participant of available) {
		const unitWidth = MILITARY_UNIT_TEMPLATES[participant.unit.unitType]?.combatWidth ?? 1;
		if (usedWidth + unitWidth <= maxWidth) {
			engaged.push(participant);
			usedWidth += unitWidth;
		}
	}

	return engaged;
}
