// The file system an operator finds inside a compromised site: deterministic,
// varied, partially redacted, browsable and searchable.
import { describe, expect, it } from "@rstest/core";
import {
	CLASSIFICATION_TONE,
	CONTENT_KIND_LABEL,
	fileSystemFor,
	findRecords,
	listDirectory,
	sitesForTarget
} from "#lib/config/index.js";

const site = sitesForTarget(7, [{ id: 3, name: "Ashfield Coal Station", plantType: "coal" }]).find(
	(s) => s.kind === "datacenter"
)!;
const fs = fileSystemFor(site, "Empire of Sylvania");

describe("host file systems", () => {
	it("are deterministic and contain a lot of different records", () => {
		expect(fileSystemFor(site, "Empire of Sylvania")).toEqual(fs);
		expect(fs.files.length).toBeGreaterThan(25);
		expect(new Set(fs.files.map((f) => f.id)).size).toBe(fs.files.length);
		expect(new Set(fs.files.map((f) => f.kind)).size).toBeGreaterThan(6);
		expect(Object.keys(CONTENT_KIND_LABEL).length).toBeGreaterThan(6);
		expect(fs.files.every((f) => f.path && f.body.length > 40 && f.size > 0)).toBe(true);
	});

	it("mix classifications and partially redact the sensitive ones", () => {
		const classes = new Set(fs.files.map((f) => f.classification));
		expect(classes.size).toBeGreaterThan(2);
		expect(fs.files.some((f) => f.body.includes("[REDACTED]") || f.body.includes("▓"))).toBe(true);
		expect(CLASSIFICATION_TONE["TOP SECRET"]).toBe("red");
		expect(fs.files.every((f) => f.heat > 0)).toBe(true);
	});

	it("list directories without showing a parent's files", () => {
		const root = listDirectory(fs, "/");
		expect(root.dirs.some((d) => d.startsWith("/srv"))).toBe(true);
		expect(root.files.length).toBe(0);
		const shared = listDirectory(fs, "/srv/shared");
		expect(shared.dirs.some((d) => d === "/srv/shared/finance")).toBe(true);
		expect(shared.files.every((f) => f.path.startsWith("/srv/shared/"))).toBe(true);
		expect(shared.files.some((f) => f.path.includes("/finance/"))).toBe(false);
	});

	it("search by keyword and return a matching line", () => {
		const hits = findRecords(fs, "REDACTED");
		expect(hits.length).toBeGreaterThan(0);
		expect(hits.every((h) => h.match.toLowerCase().includes("redacted"))).toBe(true);
		expect(findRecords(fs, "not-present-anywhere-xyz")).toEqual([]);
	});
});
