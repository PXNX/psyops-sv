// Coats of arms were briefly served as WebP. Pages from that build may still
// be open or cached, so send their requests to the SVG.
import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params }) => {
	if (!/^\d+$/.test(params.id)) error(404, "Not found");
	redirect(308, `/coats/${params.id}.svg`);
};
