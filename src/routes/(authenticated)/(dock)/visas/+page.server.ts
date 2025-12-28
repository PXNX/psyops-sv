// src/routes/(authenticated)/visas/+page.server.ts
import { db } from "$lib/server/db";
import { userVisas, states, files } from "$lib/server/schema";
import { eq, and, gt } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const now = new Date();

	// Get all user's visas
	const visas = await db
		.select({
			id: userVisas.id,
			stateId: userVisas.stateId,
			status: userVisas.status,
			issuedAt: userVisas.issuedAt,
			expiresAt: userVisas.expiresAt,
			cost: userVisas.cost,
			taxPaid: userVisas.taxPaid,
			approvedAt: userVisas.approvedAt,
			revokedAt: userVisas.revokedAt,
			revocationReason: userVisas.revocationReason,
			stateName: states.name,
			stateLogo: states.logo
		})
		.from(userVisas)
		.leftJoin(states, eq(userVisas.stateId, states.id))
		.where(eq(userVisas.userId, account.id))
		.orderBy(userVisas.expiresAt);

	// Process visas and get logo URLs
	const processedVisas = await Promise.all(
		visas.map(async (visa) => {
			let logoUrl = null;
			if (visa.stateLogo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, visa.stateLogo)
				});
				if (logoFile) {
					try {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {}
				}
			}

			// Calculate days until expiry
			const daysUntilExpiry = Math.ceil((new Date(visa.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

			return {
				id: visa.id,
				stateId: visa.stateId,
				stateName: visa.stateName,
				stateLogo: logoUrl,
				status: visa.status,
				issuedAt: visa.issuedAt.toISOString(),
				expiresAt: visa.expiresAt.toISOString(),
				cost: Number(visa.cost),
				taxPaid: Number(visa.taxPaid),
				approvedAt: visa.approvedAt?.toISOString(),
				revokedAt: visa.revokedAt?.toISOString(),
				revocationReason: visa.revocationReason,
				daysUntilExpiry,
				isExpired: new Date(visa.expiresAt) < now,
				isExpiringSoon: daysUntilExpiry <= 3 && daysUntilExpiry > 0
			};
		})
	);

	// Separate active and expired/revoked visas
	const activeVisas = processedVisas.filter((v) => v.status === "active" && !v.isExpired);
	const expiredVisas = processedVisas.filter((v) => v.status !== "active" || v.isExpired);

	return {
		activeVisas,
		expiredVisas
	};
};
