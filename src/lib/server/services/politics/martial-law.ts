// Martial law is a self-expiring state status: the timestamp is stored on the
// state, and "is it in force?" is answered on read, so a missed cron tick can
// never extend it past its week.
import { REAL_DAY_MS } from "#lib/utils/game-time.js";
import { OFFICIALS_CONFIG } from "#lib/config/index.js";

/** Whether martial law is in force at `now`. Accepts DB dates or ISO strings. */
export function isMartialLaw(until: Date | string | null | undefined, now: Date = new Date()): boolean {
	if (!until) return false;
	return new Date(until).getTime() > now.getTime();
}

/** When a new declaration expires. */
export function martialLawEndsAt(now: Date = new Date()): Date {
	return new Date(now.getTime() + OFFICIALS_CONFIG.MARTIAL_LAW_DAYS * REAL_DAY_MS);
}
