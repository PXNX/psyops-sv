// src/routes/(authenticated)/(dock)/user/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { accounts } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	// Query account with its profile
	const user = await db.query.accounts.findFirst({
		where: eq(accounts.id, params.id),
		with: {
			profile: true
		}
	});

	if (!user) {
		error(404, "User not found");
	}

	return {
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			name: user.profile?.name,
			avatar: user.profile?.avatar,
			bio: user.profile?.bio,
			createdAt: user.createdAt
		}
	};
};
