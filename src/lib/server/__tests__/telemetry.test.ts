import { describe, it, expect } from "@rstest/core";
import { trackEvent, recordDuration, setSpanAttributes } from "../telemetry.js";

function captureInfo<T>(run: () => T): string[] {
	const lines: string[] = [];
	const original = console.info;
	console.info = (message: string) => {
		lines.push(message);
	};
	try {
		run();
	} finally {
		console.info = original;
	}
	return lines;
}

describe("server telemetry", () => {
	it("writes one structured JSON line per event", () => {
		const lines = captureInfo(() =>
			trackEvent("premium.granted", {
				account_id: "acc_123",
				days: 30,
				method: "stars",
				source: "telegram_bot"
			})
		);

		expect(lines.length).toBe(1);
		const record = JSON.parse(lines[0]);
		expect(record.event).toBe("premium.granted");
		// The bot emitter uses the same value, so both paths are queryable.
		expect(record.source).toBe("telegram_bot");
		expect(record.account_id).toBe("acc_123");
		expect(record.days).toBe(30);
		expect(record.method).toBe("stars");
		expect(record["service.name"]).toBe("psyops-sv");
		expect(typeof record.timestamp).toBe("string");
	});

	it("defaults to the web source and drops undefined attributes", () => {
		const lines = captureInfo(() =>
			trackEvent("auth.login.success", {
				provider: "telegram",
				account_id: undefined,
				is_new_user: false
			})
		);

		const record = JSON.parse(lines[0]);
		expect(record.source).toBe("web");
		expect("account_id" in record).toBe(false);
		expect(record.is_new_user).toBe(false);
	});

	it("records durations and span attributes without throwing when OTel is unconfigured", () => {
		expect(() => {
			recordDuration("http.server.request", 12.5, { method: "GET", status: 200 });
			setSpanAttributes({ "app.account.id": "acc_123" });
		}).not.toThrow();
	});
});
