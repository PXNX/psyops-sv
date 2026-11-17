import { describe, expect, it, rs } from "@rstest/core";
import { cronCrash, cronResponse } from "../cron";

describe("cron responses", () => {
	it("reports a clean run as 200", async () => {
		const res = cronResponse("travels", { travelsCompleted: 3 }, 0);
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ success: true, job: "travels", failures: 0, travelsCompleted: 3 });
	});

	it("reports a run with any failure as 500 so the scheduler marks it failed", async () => {
		const spy = rs.spyOn(console, "error").mockImplementation(() => {});
		const res = cronResponse("battles", { roundsProcessed: 4 }, 1);
		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({ success: false, failures: 1, roundsProcessed: 4 });
		spy.mockRestore();
	});

	it("reports a crash as 500 with the message", async () => {
		const spy = rs.spyOn(console, "error").mockImplementation(() => {});
		const res = cronCrash("wars", new Error('column "exhaustion" does not exist'));
		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({ success: false, error: 'column "exhaustion" does not exist' });
		spy.mockRestore();
	});
});
