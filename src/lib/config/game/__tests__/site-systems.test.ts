// What a site runs (cameras, file share, hosts), fitted to its kind and seeded
// per site, and how the operator earns each piece step by step.
import { describe, expect, it } from "@rstest/core";
import {
	CAMERA_POOL,
	hostById,
	networkFor,
	siteRecords,
	siteSystems,
	sitesForTarget,
	systemsView,
	type Site,
	type SiteKind
} from "#lib/config/index.js";

const entities = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Org ${i + 1}`, region: "x" }));
/** Plenty of sites of every kind across many states. */
const SITES: Site[] = Array.from({ length: 60 }, (_, i) =>
	sitesForTarget(i + 1, [{ id: i + 1, plantType: "coal" }], {
		companies: entities(2),
		factories: entities(2),
		parties: entities(2)
	})
).flat();
const ofKind = (kind: SiteKind) => SITES.filter((s) => s.kind === kind);

describe("what a site runs", () => {
	it("covers every kind of site", () => {
		for (const kind of Object.keys(CAMERA_POOL) as SiteKind[]) expect(ofKind(kind).length).toBeGreaterThan(10);
	});

	it("only fits cameras that make sense for the kind of site", () => {
		for (const site of SITES)
			for (const cam of siteSystems(site).cameras) expect(CAMERA_POOL[site.kind]).toContain(cam.scene);
		const airbase = new Set(ofKind("airbase").flatMap((s) => siteSystems(s).cameras.map((c) => c.scene)));
		expect([...airbase].sort()).toEqual(["apron", "gate", "hangar", "perimeter"]);
		const party = new Set(ofKind("party").flatMap((s) => siteSystems(s).cameras.map((c) => c.scene)));
		for (const scene of party) expect(["lobby", "hall", "office"]).toContain(scene);
	});

	it("keeps the kind's own data on the share", () => {
		const labels = (kind: SiteKind) =>
			new Set(ofKind(kind).flatMap((s) => siteSystems(s).dataSets.map((d) => d.label)));
		expect(labels("airbase")).toContain("Flight logs");
		expect(labels("powerplant")).toContain("SCADA screen captures");
		expect(labels("datacenter")).toContain("Badge log");
		expect(labels("party")).toContain("Donor files");
		expect(labels("party")).not.toContain("Flight logs");
	});

	it("varies per site: some have no cameras, some one, some no files", () => {
		const all = SITES.map(siteSystems);
		expect(all.some((s) => s.cameras.length === 0)).toBe(true);
		expect(all.some((s) => s.cameras.length === 1)).toBe(true);
		expect(all.some((s) => s.cameras.length >= 3)).toBe(true);
		expect(all.some((s) => !s.hasFiles)).toBe(true);
		expect(all.filter((s) => s.hasFiles).every((s) => s.dataSets.length > 0)).toBe(true);
	});

	it("is the same every time for the same site", () => {
		for (const site of SITES.slice(0, 30)) expect(siteSystems({ ...site })).toEqual(siteSystems(site));
	});
});

describe("the network follows the site", () => {
	it("only runs the hosts the site has, with the core always reachable and openable", () => {
		const layouts = new Set<string>();
		for (const site of SITES) {
			const sys = siteSystems(site);
			const net = networkFor(site, "Testland");
			const ids = net.hosts.map((h) => h.id);
			layouts.add(ids.join(","));
			expect(ids.includes("cams")).toBe(sys.cameras.length > 0);
			expect(ids.includes("files")).toBe(sys.hasFiles);
			expect(ids.includes("badge")).toBe(sys.hasBadge);
			// Walk from the gateway: everything, the core included, is reachable.
			const seen = new Set(["gw"]);
			const queue = ["gw"];
			while (queue.length)
				for (const l of hostById(net, queue.shift()!)!.links) if (!seen.has(l)) (seen.add(l), queue.push(l));
			expect([...seen].sort()).toEqual([...ids].sort());
			// Some host carries a key that opens the core.
			const core = hostById(net, "core")!;
			const carried = net.hosts.flatMap((h) => h.loot.filter((l) => l.kind === "key").map((l) => l.id));
			expect(core.keys.some((k) => carried.includes(k))).toBe(true);
			for (const h of net.hosts) for (const l of h.links) expect(hostById(net, l)).toBeDefined();
		}
		expect(layouts.size).toBeGreaterThan(3);
	});
});

describe("earning access step by step", () => {
	const site = SITES.find((s) => {
		const sys = siteSystems(s);
		return sys.cameras.length > 1 && sys.hasFiles;
	})!;
	const sys = siteSystems(site);
	const at = (stage: string, owned: string[], traced = false) => systemsView(site, { stage, deep: { owned, traced } });

	it("shows nothing before the operator is inside", () => {
		for (const view of [systemsView(site, null), at("scan", []), at("escalate", [])]) {
			expect(view).toEqual({ mapped: false, cameraCount: null, cameras: [], files: "unknown", dataSets: [] });
		}
	});

	it("reveals how many cameras exist after the pivot, but no pictures", () => {
		const view = at("pivot", ["gw"]);
		expect(view.mapped).toBe(true);
		expect(view.cameraCount).toBe(sys.cameras.length);
		expect(view.cameras).toEqual([]);
		expect(view.files).toBe("locked");
		expect(view.dataSets).toEqual([]);
	});

	it("brings up the feeds with the recorder and the files with the share", () => {
		expect(at("pivot", ["gw", "cams"]).cameras).toEqual(sys.cameras);
		expect(at("pivot", ["gw", "cams"]).files).toBe("locked");
		const share = at("pivot", ["gw", "files"]);
		expect(share.files).toBe("open");
		expect(share.cameras).toEqual([]);
		expect(share.dataSets.length).toBeGreaterThan(0);
	});

	it("goes dark again once the session is traced", () => {
		expect(at("pivot", ["gw", "cams", "files"], true).mapped).toBe(false);
	});

	it("says so when a site has no cameras or no share", () => {
		const bare = SITES.find((s) => siteSystems(s).cameras.length === 0 && !siteSystems(s).hasFiles)!;
		const view = systemsView(bare, { stage: "pivot", deep: { owned: ["gw", "badge"] } });
		expect(view.cameraCount).toBe(0);
		expect(view.files).toBe("none");
	});
});

describe("the files on the share", () => {
	it("is empty without a share and fitted to the site with one", () => {
		const bare = SITES.find((s) => !siteSystems(s).hasFiles)!;
		expect(siteRecords(bare, "Testland").files).toEqual([]);
		const airbase = ofKind("airbase").find((s) => siteSystems(s).dataSets.some((d) => d.id === "flightlog"))!;
		const fs = siteRecords(airbase, "Testland");
		expect(fs.files.some((f) => f.path.startsWith("/srv/flightdesk/logs/"))).toBe(true);
		expect(siteRecords(airbase, "Testland")).toEqual(fs);
		for (const f of fs.files) {
			const dir = f.path.slice(0, f.path.lastIndexOf("/")) || "/";
			expect(fs.dirs).toContain(dir);
		}
	});

	it("leaves out some folders on some shares", () => {
		const shapes = new Set(
			SITES.filter((s) => siteSystems(s).hasFiles)
				.slice(0, 40)
				.map((s) =>
					siteRecords(s, "Testland")
						.dirs.filter((d) => d.startsWith("/srv/shared"))
						.join(",")
				)
		);
		expect(shapes.size).toBeGreaterThan(2);
	});
});
