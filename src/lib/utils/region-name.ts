// Server-safe region names. The UI's `formatting.ts` resolves names through
// Paraglide's virtual messages, which do not exist outside Vite — importing it
// from a server service breaks the test runner. Region names are proper nouns,
// so the canonical English map is the right source for backend labels.
import en from "../../../messages/en.json";

const names = en as Record<string, string>;

/** Human-readable name of a region, falling back to its id. */
export function getRegionName(regionId: number): string {
	return names[`region_${regionId}`] ?? `Region ${regionId}`;
}
