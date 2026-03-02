// src/routes/(authenticated)/(dock)/newspaper/[id]/staff/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers, files } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params }) => {
    const newspaperId = parseInt(params.id);

    // Get newspaper info
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId)
    });

    if (!newspaper) {
        throw error(404, "Newspaper not found");
    }

    // Get newspaper logo
    let logoUrl = null;
    if (newspaper.logo) {
        const logoFile = await db.query.files.findFirst({
            where: eq(files.id, newspaper.logo)
        });
        if (logoFile) {
            try {
                logoUrl = await getSignedDownloadUrl(logoFile.key);
            } catch {
                logoUrl = null;
            }
        }
    }

    // Get all staff members
    const staff = await db.query.journalists.findMany({
        where: eq(journalists.newspaperId, newspaperId),
        with: {
            user: {
                with: {
                    profile: true
                }
            }
        }
    });

    // Get profile logos for staff
    const staffWithLogos = await Promise.all(
        staff.map(async (member) => {
            let profileLogoUrl = null;
            if (member.user.profile?.logo) {
                const logoFile = await db.query.files.findFirst({
                    where: eq(files.id, member.user.profile.logo)
                });
                if (logoFile) {
                    try {
                        profileLogoUrl = await getSignedDownloadUrl(logoFile.key);
                    } catch {
                        profileLogoUrl = null;
                    }
                }
            }

            return {
                id: member.userId,
                name: member.user.profile?.name ?? "Unknown",
                role: member.rank,
                logoUrl: profileLogoUrl
            };
        })
    );

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
