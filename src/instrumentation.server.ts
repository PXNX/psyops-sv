// src/instrumentation.server.ts
// Loaded automatically by SvelteKit before the server starts. Wires the
// already-installed @vercel/otel SDK so HTTP requests and outgoing fetches are
// traced, and so metrics/events from src/lib/server/telemetry.ts have an
// exporter in production. Set the standard OTEL_EXPORTER_OTLP_* variables (or
// use a Vercel observability integration) to ship the data to a collector.
import { registerOTel } from "@vercel/otel";

export function register(): void {
	const isLocal = process.env.NODE_ENV !== "production" || Boolean(process.env.USE_MOCK);

	registerOTel({
		serviceName: "psyops-sv",
		attributes: {
			"service.namespace": "psyops"
		},
		// Locally the default OTLP exporter would try localhost:4318 and spam
		// connection errors. Structured JSON events still go to the console.
		...(isLocal ? { spanProcessors: [] } : {})
	});
}
