import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { MAX_TOASTS, toast, toastResult } from "../toast.svelte";
import { confirmAction, confirmStore } from "../confirm.svelte";

beforeEach(() => {
	rs.useFakeTimers();
});

afterEach(() => {
	toast.clear();
	rs.useRealTimers();
});

const messages = () => toast.items.map((t) => t.message);

describe("toast", () => {
	it("shows a message and hides it after its duration", () => {
		toast.success("Saved", { duration: 1000 });
		expect(messages()).toEqual(["Saved"]);
		rs.advanceTimersByTime(999);
		expect(messages()).toEqual(["Saved"]);
		rs.advanceTimersByTime(1);
		expect(messages()).toEqual([]);
	});

	it("ignores blank messages", () => {
		expect(toast.info("   ")).toBe(-1);
		expect(toast.items).toEqual([]);
	});

	it("keeps sticky toasts (duration 0) until dismissed", () => {
		const id = toast.warning("Stay", { duration: 0 });
		rs.advanceTimersByTime(60_000);
		expect(messages()).toEqual(["Stay"]);
		toast.dismiss(id);
		expect(messages()).toEqual([]);
	});

	it("does not stack duplicates and restarts the timer instead", () => {
		toast.error("Nope", { duration: 1000 });
		rs.advanceTimersByTime(800);
		toast.error("Nope", { duration: 1000 });
		expect(messages()).toEqual(["Nope"]);
		rs.advanceTimersByTime(800);
		expect(messages()).toEqual(["Nope"]);
		rs.advanceTimersByTime(200);
		expect(messages()).toEqual([]);
	});

	it(`shows at most ${MAX_TOASTS} at once, dropping the oldest`, () => {
		for (let i = 1; i <= MAX_TOASTS + 2; i++) toast.info(`m${i}`);
		expect(messages()).toEqual(Array.from({ length: MAX_TOASTS }, (_, i) => `m${i + 3}`));
	});

	it("pauses while held and resumes with the time that was left", () => {
		const id = toast.info("Hover me", { duration: 1000 });
		rs.advanceTimersByTime(700);
		toast.hold(id);
		rs.advanceTimersByTime(10_000);
		expect(messages()).toEqual(["Hover me"]);
		toast.release(id);
		rs.advanceTimersByTime(599);
		expect(messages()).toEqual(["Hover me"]);
		rs.advanceTimersByTime(1);
		expect(messages()).toEqual([]);
	});
});

describe("toastResult", () => {
	it("toasts a success message", () => {
		toastResult({ type: "success", data: { message: "Visa purchased" } });
		expect(toast.items).toMatchObject([{ tone: "success", message: "Visa purchased" }]);
	});

	it("stays quiet on a success without a message", () => {
		toastResult({ type: "success", data: {} });
		expect(toast.items).toEqual([]);
	});

	it("prefers `error`, then `message`, then a generic text on failure", () => {
		toastResult({ type: "failure", data: { error: "Insufficient funds" } });
		toastResult({ type: "failure", data: { message: "Sold out" } });
		toastResult({ type: "failure", data: {} });
		expect(toast.items.map((t) => [t.tone, t.message])).toEqual([
			["error", "Insufficient funds"],
			["error", "Sold out"],
			["error", "That didn't work. Please try again."]
		]);
	});

	it("does not leak server error details", () => {
		toastResult({ type: "error", error: new Error("relation users does not exist") });
		expect(messages()).toEqual(["Something went wrong on our side. Please try again."]);
	});
});

describe("confirmAction", () => {
	it("resolves with the user's answer", async () => {
		const answer = confirmAction({ title: "Leave bloc?" });
		expect(confirmStore.current?.title).toBe("Leave bloc?");
		confirmStore.answer(true);
		await expect(answer).resolves.toBe(true);
		expect(confirmStore.current).toBeNull();
	});

	it("cancels an open question when a new one is asked", async () => {
		const first = confirmAction({ title: "First" });
		const second = confirmAction({ title: "Second" });
		await expect(first).resolves.toBe(false);
		confirmStore.answer(false);
		await expect(second).resolves.toBe(false);
	});
});
