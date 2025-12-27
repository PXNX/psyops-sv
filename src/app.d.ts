import type { ParaglideLocals } from "@inlang/paraglide-sveltekit";
import type { AvailableLanguageTag } from "../../lib/paraglide/runtime";
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Account, Session } from "$lib/server/schema";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			paraglide: ParaglideLocals<AvailableLanguageTag>;

			account: Account | null;
			session: Session | null;
		}
		interface Error {
			code?: string;
			errorId?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
