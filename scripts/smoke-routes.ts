// scripts/smoke-routes.ts — `bun run smoke`
// Boots the app in mock mode (in-memory Postgres, signed in as the seeded
// admin), requests every page route and fails if any of them answers with a
// server error. Catches what unit tests can't: a page whose load function,
// imports or server render blows up.
//
//   bun run smoke                 # start a mock dev server and crawl it
//   SMOKE_URL=http://localhost:5173 bun run smoke   # crawl a server you started
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROUTES_DIR = "src/routes";

/** Sample values for dynamic segments, matching the mock seed. */
const PARAMS: Record<string, string> = { item: "iron", slug: "intro" };
const PARAMS_BY_ROUTE: Record<string, Record<string, string>> = {
	"/user/[id]": { id: "user-1" },
	"/chat/user/[id]": { id: "user-2" }
};

/** Pages that are expected to fail (playgrounds etc.). */
const SKIP = new Set<string>(["/test"]);

function findPages(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return findPages(path);
		return name === "+page.svelte" ? [path] : [];
	});
}

function toUrl(file: string): string {
	const segments = relative(ROUTES_DIR, file).split(sep).slice(0, -1);
	const routeId = "/" + segments.filter((s) => !/^\(.*\)$/.test(s)).join("/");
	const routeParams = Object.entries(PARAMS_BY_ROUTE).find(([prefix]) => routeId.startsWith(prefix))?.[1] ?? {};
	return routeId.replace(/\[(?:\.\.\.)?(\w+)(?:=\w+)?\]/g, (_, name: string) => routeParams[name] ?? PARAMS[name] ?? "1");
}

async function waitFor(url: string, timeoutMs: number) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fetch(url, { redirect: "manual" });
			return;
		} catch {
			await Bun.sleep(500);
		}
	}
	throw new Error(`Server at ${url} did not come up within ${timeoutMs / 1000}s`);
}

const port = 5199;
let base = process.env.SMOKE_URL;
let server: ReturnType<typeof Bun.spawn> | undefined;

if (!base) {
	base = `http://localhost:${port}`;
	server = Bun.spawn(["bun", "x", "vite", "dev", "--port", String(port), "--strictPort"], {
		env: { ...process.env, USE_MOCK: "true" },
		stdout: "ignore",
		stderr: "ignore"
	});
}

let failed = 0;
try {
	await waitFor(base, 120_000);
	const urls = [...new Set(findPages(ROUTES_DIR).map(toUrl))].filter((u) => !SKIP.has(u)).sort();
	// The first request compiles a lot; warm up before timing anything.
	await fetch(base + "/", { redirect: "manual" });

	for (const url of urls) {
		const started = performance.now();
		const res = await fetch(base + url, { redirect: "manual" });
		const ms = Math.round(performance.now() - started);
		const ok = res.status < 500;
		if (!ok) failed++;
		console.log(`${ok ? "ok  " : "FAIL"} ${res.status} ${String(ms).padStart(5)}ms ${url}`);
	}
	console.log(`\n${urls.length - failed}/${urls.length} pages rendered without a server error`);
} finally {
	server?.kill();
}

process.exit(failed ? 1 : 0);
