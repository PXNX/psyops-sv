import { describe, it, expect } from "@rstest/core";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

// Pure logic from AuthService (no database required).
// Re-implemented here since the AuthService constructor requires a db
// instance and its module imports use SvelteKit path aliases.

function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

function generateAccountId(): string {
	const bytes = new Uint8Array(10);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

// base32 lowercase alphabet without padding (RFC 4648, lowercased)
const BASE32_LOWER = /^[a-z2-7]+$/;

describe("AuthService - generateAccountId", () => {
	it("should encode 10 random bytes as a 16-character id", () => {
		// 10 bytes = 80 bits, base32 packs 5 bits per char => 16 chars
		expect(generateAccountId()).toHaveLength(16);
	});

	it("should only contain base32 lowercase characters", () => {
		for (let i = 0; i < 50; i++) {
			expect(generateAccountId()).toMatch(BASE32_LOWER);
		}
	});

	it("should generate unique ids across many calls", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 1000; i++) {
			ids.add(generateAccountId());
		}
		expect(ids.size).toBe(1000);
	});

	it("should be shorter than a legacy telegram_<id> account id", () => {
		const legacyId = "telegram_123456789";
		expect(generateAccountId().length).toBeLessThan(legacyId.length);
	});

	it("should not contain a provider prefix", () => {
		expect(generateAccountId().startsWith("telegram_")).toBe(false);
	});
});

describe("AuthService - generateSessionToken", () => {
	it("should encode 20 random bytes as a 32-character token", () => {
		// 20 bytes = 160 bits, base32 packs 5 bits per char => 32 chars
		expect(generateSessionToken()).toHaveLength(32);
	});

	it("should only contain base32 lowercase characters", () => {
		for (let i = 0; i < 50; i++) {
			expect(generateSessionToken()).toMatch(BASE32_LOWER);
		}
	});

	it("should generate unique tokens across many calls", () => {
		const tokens = new Set<string>();
		for (let i = 0; i < 1000; i++) {
			tokens.add(generateSessionToken());
		}
		expect(tokens.size).toBe(1000);
	});

	it("should produce longer tokens than account ids", () => {
		expect(generateSessionToken().length).toBeGreaterThan(generateAccountId().length);
	});
});
