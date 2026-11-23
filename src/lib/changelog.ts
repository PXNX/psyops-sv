// Shared parser for the Keep-a-Changelog style CHANGELOG.md so both the
// about page sheet and the dedicated /changelog page stay consistent.

export interface ChangelogGroup {
	title: string;
	type: string;
	items: string[];
}

export interface ChangelogRelease {
	version: string;
	date: string;
	groups: ChangelogGroup[];
}

const TYPE_HINTS: Record<string, { type: string; tone: string }> = {
	Added: { type: "feature", tone: "green" },
	Changed: { type: "change", tone: "blue" },
	Fixed: { type: "fix", tone: "amber" },
	Security: { type: "security", tone: "red" },
	Removed: { type: "removal", tone: "neutral" },
	Deprecated: { type: "deprecation", tone: "neutral" }
};

export function parseChangelog(raw: string): ChangelogRelease[] {
	const releases: ChangelogRelease[] = [];
	let release: ChangelogRelease | null = null;
	let group: ChangelogGroup | null = null;
	for (const line of raw.split("\n")) {
		const versionMatch = line.match(/^## \[(.+?)\](?:\s*-\s*(.+))?$/);
		if (versionMatch) {
			if (release) releases.push(release);
			release = { version: versionMatch[1]!, date: (versionMatch[2] ?? "").trim(), groups: [] };
			group = null;
			continue;
		}
		const sectionMatch = line.match(/^### (.+)$/);
		if (sectionMatch && release) {
			const title = sectionMatch[1]!.trim();
			const hint = TYPE_HINTS[title] ?? { type: title.toLowerCase(), tone: "neutral" };
			group = { title, type: hint.type, items: [] };
			release.groups.push(group);
			continue;
		}
		const itemMatch = line.match(/^- (.+)$/);
		if (itemMatch && group) group.items.push(itemMatch[1]!.trim());
	}
	if (release) releases.push(release);
	return releases;
}
