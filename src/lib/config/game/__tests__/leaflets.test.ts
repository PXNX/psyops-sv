import { describe, expect, it } from "@rstest/core";
import { LEAFLET_RANDOM, LEAFLET_TEMPLATES, fillLeaflet, isLeafletTemplate, resolveLeaflet } from "../leaflets.config";

describe("leaflet templates", () => {
	it("every template names the target", () => {
		for (const t of LEAFLET_TEMPLATES) {
			expect(t.text).toContain("{target}");
			expect(fillLeaflet(t.id, "Ruritania")).toContain("Ruritania");
			expect(fillLeaflet(t.id, "Ruritania")).not.toContain("{target}");
		}
	});

	it("ids are unique", () => {
		expect(new Set(LEAFLET_TEMPLATES.map((t) => t.id)).size).toBe(LEAFLET_TEMPLATES.length);
	});

	it("keeps a known id, draws one for random, rejects free text", () => {
		expect(resolveLeaflet("lies", () => 0.99)).toBe("lies");
		expect(resolveLeaflet(LEAFLET_RANDOM, () => 0)).toBe(LEAFLET_TEMPLATES[0].id);
		expect(resolveLeaflet(undefined, () => 0.999999)).toBe(LEAFLET_TEMPLATES.at(-1)!.id);
		expect(resolveLeaflet("Down with the king!", () => 0)).toBeNull();
		expect(isLeafletTemplate("Down with the king!")).toBe(false);
	});
});
