// src/lib/ui/confirm-submit.ts
// `use:confirmSubmit={{ title: "Leave bloc?", danger: true }}` on a <form>:
// asks through the in-app confirm sheet before the form submits. Works with
// use:enhance (the submit is re-dispatched with the original submit button,
// so its name/value still reach the action).
import { confirmAction, type ConfirmOptions } from "./confirm.svelte";

export function confirmSubmit(form: HTMLFormElement, options: ConfirmOptions) {
	let current = options;
	let confirmed = false;

	async function onSubmit(event: SubmitEvent) {
		if (confirmed) {
			confirmed = false;
			return;
		}
		// Capture phase on the form itself runs before use:enhance's listener.
		event.preventDefault();
		event.stopImmediatePropagation();
		if (await confirmAction(current)) {
			confirmed = true;
			form.requestSubmit((event.submitter as HTMLButtonElement | null) ?? undefined);
		}
	}

	form.addEventListener("submit", onSubmit, { capture: true });
	return {
		update(next: ConfirmOptions) {
			current = next;
		},
		destroy() {
			form.removeEventListener("submit", onSubmit, { capture: true });
		}
	};
}
