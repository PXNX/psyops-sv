import type { AvailableLanguageTag } from "../../lib/paraglide/runtime"
import type { ParaglideLocals } from "@inlang/paraglide-sveltekit"
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { User } from "$lib/server/user";
import type { Session } from "$lib/server/session";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
    paraglide: ParaglideLocals<AvailableLanguageTag>,

			user: User | null;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
