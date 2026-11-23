import { describe, expect, it } from "@rstest/core";
import { parseChangelog } from "../changelog.js";

describe("changelog parser", () => {
	it("groups conventional entries by component inside each change type", () => {
		const raw = [
			"## [Unreleased]",
			"### Fixed",
			"- fix(navy): repair hex selection",
			"- fix(navy): show mine markers",
			"- fix(air): sortie fuel",
			"- plain entry without scope"
		].join("\n");
		const [release] = parseChangelog(raw);
		const fixed = release!.groups[0]!;
		expect(fixed.type).toBe("fix");
		expect(fixed.components.map((c) => c.name)).toEqual(["navy", "air", "General"]);
		expect(fixed.components[0]!.items).toEqual(["repair hex selection", "show mine markers"]);
	});

	it("hides non-feature and non-fix sections", () => {
		const raw = ["## [1.0.0]", "### Changed", "- old behaviour", "### Fixed", "- fix(navy): one bug"].join("\n");
		const [release] = parseChangelog(raw);
		expect(release!.groups.map((g) => g.title)).toEqual(["Fixed"]);
	});
});
