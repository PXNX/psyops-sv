// src/routes/(authenticated)/(fullscreen)/welcome/+page.server.ts
import { db } from "$lib/server/db";
import { residences } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const account = locals.account!;

    // Check if user has a residence
    const existingResidence = await db.query.residences.findFirst({
        where: eq(residences.userId, account.id)
    });

    // If user doesn't have a residence, redirect to region selection
    if (!existingResidence) {
        throw redirect(303, "/welcome/region");
    }

    // If they have a residence, let them view the welcome page
    return {};
};
