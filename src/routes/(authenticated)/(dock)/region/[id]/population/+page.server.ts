// src/routes/(authenticated)/(dock)/region/[id]/population/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences, accounts, userProfiles } from "$lib/server/schema";
import { eq, desc, asc, sql, count } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getRegionName } from "$lib/utils/formatting";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const account = locals.account!;
	const sortOrder = (url.searchParams.get("sort") || "desc") as "asc" | "desc";
	const currentPage = parseInt(url.searchParams.get("page") || "1");

	// Validate page number
	if (currentPage < 1) {
		error(400, "Invalid page number");
	}

	// Get region
	const region = await db.query.regions.findFirst({
		where: eq(regions.id, parseInt(params.id)),
		with: {
			state: true
		}
	});

	if (!region) {
		error(404, "Region not found");
	}

	// Get total count of residents
	const totalCountResult = await db
		.select({ count: count() })
		.from(residences)
		.where(eq(residences.regionId, parseInt(params.id)));

	const totalResidents = totalCountResult[0]?.count || 0;

	// Calculate offset
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Get paginated residents with manual join
	const residentsQuery = db
		.select({
			userId: residences.userId,
			movedInAt: residences.movedInAt,
			userName: userProfiles.name,
			userLogo: userProfiles.logo
		})
		.from(residences)
		.leftJoin(accounts, eq(residences.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(residences.regionId, parseInt(params.id)))
		.orderBy(sortOrder === "asc" ? asc(residences.movedInAt) : desc(residences.movedInAt))
		.limit(PAGE_SIZE)
		.offset(offset);

	const residentsData = await residentsQuery;

	return {
		region: {
			id: region.id,
			name: getRegionName(region.id),
			stateId: region.stateId,
			stateName: region.state?.name
		},
		residents: residentsData.map((r) => ({
			userId: r.userId,
			movedInAt: r.movedInAt.toISOString(),
			user: {
				name: r.userName || null,
				logo: r.userLogo || null
			}
		})),
		currentUserId: account.id,
		sortOrder,
		currentPage,
		totalResidents,
		pageSize: PAGE_SIZE
	};
};
