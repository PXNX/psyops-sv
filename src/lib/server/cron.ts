// src/lib/server/cron.ts
// How scheduled jobs (/api/cron/*) report back. The scheduler only looks at
// the HTTP status, so a run where anything failed must answer with an error
// status; otherwise it is listed as completed and the failure goes unnoticed.

/** Summary of a finished run. Any failure turns it into a 500. */
export function cronResponse(job: string, summary: Record<string, unknown>, failures: number): Response {
	const ok = failures === 0;
	if (!ok) console.error(`[cron:${job}] run finished with ${failures} failure(s)`, summary);
	return Response.json(
		{ success: ok, job, timestamp: new Date().toISOString(), failures, ...summary },
		{ status: ok ? 200 : 500 }
	);
}

/** The run crashed before it could finish. */
export function cronCrash(job: string, error: unknown): Response {
	console.error(`[cron:${job}] run crashed:`, error);
	return Response.json(
		{
			success: false,
			job,
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : "Unknown error"
		},
		{ status: 500 }
	);
}
