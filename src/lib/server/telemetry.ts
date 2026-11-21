// src/lib/server/telemetry.ts
// The web half of the shared telemetry contract with the Telegram bot.
//
// Every event is written as one structured JSON log line (so Vercel/container
// logs are queryable without an external vendor) and counted as an OTel metric.
// The bot emits the same event names from bot/bot/util/telemetry.py with
// `source: "telegram_bot"`; web events use `source: "web"` unless an auth route
// explicitly marks the `telegram_bot` login flow.
//
// Keep identifiers limited to account/telegram ids — never emails, usernames,
// tokens or other personal data.

import { metrics, trace, type Attributes, type Counter, type Histogram } from "@opentelemetry/api";

export const SERVICE_NAME = "psyops-sv";
export type TelemetrySource = "web" | "telegram_bot";

export type EventAttributeValue = string | number | boolean;
export type EventAttributes = Record<string, EventAttributeValue | undefined>;

const METER_NAME = "psyops-sv";

let eventsCounter: Counter | undefined;
let durationHistogram: Histogram | undefined;

function getEventsCounter(): Counter {
	eventsCounter ??= metrics.getMeter(METER_NAME).createCounter("app.events.total", {
		description: "Domain events emitted by the web app and the Telegram bot"
	});
	return eventsCounter;
}

function getDurationHistogram(): Histogram {
	durationHistogram ??= metrics.getMeter(METER_NAME).createHistogram("app.duration.milliseconds", {
		description: "Durations of requests, jobs and other tracked operations"
	});
	return durationHistogram;
}

function asAttributes(attributes: EventAttributes): Attributes {
	return Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined)) as Attributes;
}

/** Attach identifiers to the current OTel span, if tracing is active. */
export function setSpanAttributes(attributes: EventAttributes): void {
	const span = trace.getActiveSpan();
	if (span?.isRecording()) span.setAttributes(asAttributes(attributes));
}

/**
 * Record a domain event. Writes a structured JSON log line and increments the
 * `app.events.total` counter. Events share their names with the bot so a user
 * journey (bot /login -> web session -> bot premium purchase) is queryable.
 */
export function trackEvent(name: string, attributes: EventAttributes = {}): void {
	const { source = "web", ...rest } = attributes;
	const context = trace.getActiveSpan()?.spanContext();
	const hasTrace = context && context.traceId !== "00000000000000000000000000000000" && context.traceFlags > 0;

	const record = {
		timestamp: new Date().toISOString(),
		event: name,
		source,
		"service.name": SERVICE_NAME,
		...(hasTrace ? { trace_id: context.traceId, span_id: context.spanId } : {}),
		...asAttributes(rest)
	};

	console.info(JSON.stringify(record));
	getEventsCounter().add(1, { event: name, source });
}

/** Record an operation duration (used for HTTP requests and scheduled jobs). */
export function recordDuration(name: string, milliseconds: number, attributes: EventAttributes = {}): void {
	getDurationHistogram().record(milliseconds, asAttributes(attributes));
}

/** Increment a named counter, e.g. for rate-limit rejections. */
export function incrementCounter(name: string, value = 1, attributes: EventAttributes = {}): void {
	const counter = metrics.getMeter(METER_NAME).createCounter(name);
	counter.add(value, asAttributes(attributes));
}
