// src/routes/api/auth/status/+server.ts
// Tiny status probe for the sign-in page. The bot's login button sets the
// session cookie in a separate tab; polling this lets the original tab notice
// and move on without asking the user to refresh.
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	return json({ authenticated: !!locals.account });
};
