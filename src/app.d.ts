import type { ParaglideLocals } from "@inlang/paraglide-sveltekit";
import type { AvailableLanguageTag } from "../../lib/paraglide/runtime";
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Account, Session } from "#lib/server/schema.js";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			paraglide: ParaglideLocals<AvailableLanguageTag>;

			account: Account | null;
			session: Session | null;

			error?: string;
			errorStackTrace?: string;
			requestId?: string;
		}
		interface Error {
			code?: string;
			requestId?: string;
			isAdmin?: boolean;
			/** Only returned to admins: the original exception stack and cause. */
			stack?: string;
			cause?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
