// src/routes/(authenticated)/(dock)/newspaper/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, journalists, newspapers } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export type NewspaperDetail = {
	newspaper: {
		id: string;
		name: string;
		avatar: string | null;
		createdAt: Date;
	};
	owner: {
		id: string;
		name: string;
		avatar: string | null;
	};
};

export const load: PageServerLoad = async ({ params }) => {
	// Query newspaper with owner information
	const result = await db
		.select({
			newspaperId: newspapers.id,
			newspaperName: newspapers.name,
			newspaperAvatar: newspapers.avatar,
			newspaperCreatedAt: newspapers.createdAt,
			ownerId: accounts.id,
			ownerName: accounts.name,
			ownerAvatar: accounts.avatar
		})
		.from(newspapers)
		.innerJoin(journalists, and(eq(journalists.newspaperId, newspapers.id), eq(journalists.rank, "owner")))
		.innerJoin(accounts, eq(journalists.userId, accounts.id))
		.where(eq(newspapers.id, params.id))
		.limit(1);

	if (!result || result.length === 0) {
		throw error(404, "Newspaper not found");
	}

	const data = result[0];

	return {
		owner: {
			id: data.ownerId,
			name: data.ownerName,
			avatar: data.ownerAvatar
		},
		newspaper: {
			id: data.newspaperId,
			name: data.newspaperName,
			avatar: data.newspaperAvatar,
			createdAt: data.newspaperCreatedAt
		}
	};
};
