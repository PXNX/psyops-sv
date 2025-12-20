// src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { regions, residences } from "$lib/server/schema";
import { error, fail } from "@sveltejs/kit";
import { eq, and } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import fs from "fs";
import path from "path";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Query region with all related data
	const region = await db.query.regions.findFirst({
		where: eq(regions.id, parseInt(params.id)),
		with: {
			state: true,
			governor: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				}
			}
		}
	});

	if (!region) {
		error(404, "Region not found");
	}

	// Check for static region assets
	const staticPath = path.join(process.cwd(), "static", "region");
	let regionImage = null;
	let regionName = region.name;

	// Try to find PNG or SVG
	const pngPath = `/region/${params.id}.png`;
	const svgPath = `/region/${params.id}.svg`;

	if (fs.existsSync(path.join(staticPath, `${params.id}.png`))) {
		regionImage = pngPath;
	} else if (fs.existsSync(path.join(staticPath, `${params.id}.svg`))) {
		regionImage = svgPath;
	}

	// Try to read region name from text file
	const namePath = path.join(staticPath, `${params.id}.txt`);
	if (fs.existsSync(namePath)) {
		regionName = fs.readFileSync(namePath, "utf-8").trim();
	}

	// Check if user already has a residence in this region
	const userResidence = await db.query.residences.findFirst({
		where: and(eq(residences.userId, account.id), eq(residences.regionId, parseInt(params.id)))
	});

	// Get all user's residences to check if they have a primary one
	const userResidences = await db.query.residences.findMany({
		where: eq(residences.userId, account.id)
	});
	const hasPrimaryResidence = userResidences.some((r) => r.isPrimary === 1);

	return {
		region: {
			id: region.id,
			name: region.name,
			avatar: region.avatar,
			background: region.background,
			description: region.description,
			population: region.population,
			rating: region.rating,
			development: region.development,
			infrastructure: region.infrastructure,
			economy: region.economy,
			createdAt: region.createdAt
		},
		state: region.state
			? {
					id: region.state.id,
					name: region.state.name
				}
			: null,
		governor: region.governor
			? {
					userId: region.governor.userId,
					name: region.governor.user.profile?.name,
					avatar: region.governor.user.profile?.avatar,
					appointedAt: region.governor.appointedAt,
					term: region.governor.term
				}
			: null,
		userResidence,
		hasPrimaryResidence
	};
};

export const actions: Actions = {
	requestResidence: async ({ params, locals }) => {
		const account = locals.account!;

		// Check if region exists
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, parseInt(params.id))
		});

		if (!region) {
			return fail(404, { error: "Region not found" });
		}

		// Check if user already has residence in this region
		const existingResidence = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.regionId, parseInt(params.id)))
		});

		if (existingResidence) {
			return fail(400, { error: "You already have a residence in this region" });
		}

		// Check if user has any residences
		const userResidences = await db.query.residences.findMany({
			where: eq(residences.userId, account.id)
		});

		const isPrimary = userResidences.length === 0 ? 1 : 0;

		// Create new residence
		await db.insert(residences).values({
			userId: account.id,
			regionId: parseInt(params.id),
			isPrimary,
			movedInAt: new Date()
		});

		// Update region population
		await db
			.update(regions)
			.set({
				population: (region.population || 0) + 1
			})
			.where(eq(regions.id, parseInt(params.id)));

		return { success: true };
	},

	setPrimaryResidence: async ({ params, locals }) => {
		const account = locals.account!;

		// Check if user has residence in this region
		const residence = await db.query.residences.findFirst({
			where: and(eq(residences.userId, account.id), eq(residences.regionId, parseInt(params.id)))
		});

		if (!residence) {
			return fail(404, { error: "You don't have a residence in this region" });
		}

		// Remove primary status from all other residences
		const allResidences = await db.query.residences.findMany({
			where: eq(residences.userId, account.id)
		});

		for (const res of allResidences) {
			await db
				.update(residences)
				.set({ isPrimary: res.id === residence.id ? 1 : 0 })
				.where(eq(residences.id, res.id));
		}

		return { success: true };
	}
};
