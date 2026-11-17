import { describe, expect, it } from "@rstest/core";
import { isAllowedCronRequest } from "../cron-auth";

describe("isAllowedCronRequest", () => {
	it("lets Vercel's scheduler in with the right bearer secret", () => {
		expect(isAllowedCronRequest("Bearer s3cret", null, "s3cret", "production")).toBe(true);
	});

	it("rejects anonymous, wrong-secret and non-bearer requests", () => {
		expect(isAllowedCronRequest(null, null, "s3cret", "production")).toBe(false);
		expect(isAllowedCronRequest("Bearer nope", null, "s3cret", "production")).toBe(false);
		expect(isAllowedCronRequest("s3cret", null, "s3cret", "production")).toBe(false);
	});

	it("rejects signed-in players who are not admins", () => {
		expect(isAllowedCronRequest(null, "user", "s3cret", "production")).toBe(false);
		expect(isAllowedCronRequest(null, "moderator", "s3cret", "production")).toBe(false);
	});

	it("lets admins run jobs by hand", () => {
		expect(isAllowedCronRequest(null, "admin", "s3cret", "production")).toBe(true);
	});

	it("without a configured secret, only allows local development", () => {
		expect(isAllowedCronRequest(null, null, "", "production")).toBe(false);
		expect(isAllowedCronRequest(null, null, "", "development")).toBe(true);
	});
});
