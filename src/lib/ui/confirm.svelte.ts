// src/lib/ui/confirm.svelte.ts
// Promise-based confirmation sheet, replacing window.confirm():
//
//   if (!(await confirmAction({ title: "Leave bloc?", confirmLabel: "Leave", danger: true }))) return;
//
// Rendered once by <ConfirmHost /> in the root layout.

export interface ConfirmOptions {
	title: string;
	body?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** Red confirm button for destructive actions. */
	danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
	resolve: (ok: boolean) => void;
}

class ConfirmStore {
	current = $state<PendingConfirm | null>(null);

	ask(options: ConfirmOptions): Promise<boolean> {
		// A new question supersedes one that is still open.
		this.current?.resolve(false);
		return new Promise((resolve) => {
			this.current = { ...options, resolve };
		});
	}

	answer(ok: boolean) {
		const pending = this.current;
		this.current = null;
		pending?.resolve(ok);
	}
}

export const confirmStore = new ConfirmStore();

export const confirmAction = (options: ConfirmOptions) => confirmStore.ask(options);
