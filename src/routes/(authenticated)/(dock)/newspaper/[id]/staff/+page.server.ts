// src/routes/(authenticated)/(dock)/newspaper/[id]/staff/+page.server.ts
import { db } from "#lib/server/db.js";
import { journalists, newspapers } from "#lib/server/schema.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params }) => {
	const newspaperId = parseInt(params.id);

	// Newspaper and staff lookups are independent reads, so fetch them in parallel
	const [newspaper, staff] = await Promise.all([
		// Get newspaper info
		db.query.newspapers
			.findFirst({
				where: eq(newspapers.id, newspaperId)
			})
			.then((n) => n ?? error(404, "Newspaper not found")),
		// Get all staff members
		db.query.journalists.findMany({
			where: eq(journalists.newspaperId, newspaperId),
			with: {
				user: {
					with: {
						profile: true
					}
				}
			}
		})
	]);

	const [logoUrl, staffWithLogos] = await Promise.all([
		// Get newspaper logo
		getLogoUrl(newspaper.logo),
		// Get profile logos for staff
		Promise.all(
			staff.map(async (member) => ({
				id: member.userId,
				name: member.user.profile?.name ?? "Unknown",
				role: member.rank,
				logoUrl: await getLogoUrl(member.user.profile?.logo)
			}))
		)
	]);

	// Sort staff by role: owner -> editor -> author
	const roleOrder = { owner: 1, editor: 2, author: 3 };
	staffWithLogos.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

	return {
		newspaper: {
			id: newspaper.id,
			name: newspaper.name,
			logoUrl
		},
		staff: staffWithLogos
	};
};
