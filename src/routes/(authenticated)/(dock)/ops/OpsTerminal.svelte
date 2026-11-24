<!-- src/routes/(authenticated)/(dock)/ops/OpsTerminal.svelte -->
<!-- The moment an operation resolves: a console types out the run line by
     line under a scanline, then prints the verdict. Psyops campaigns send a
     ripple out behind it. Under prefers-reduced-motion everything is shown at
     once, without scanline or ripple. -->
<script lang="ts">
	import { prefersReducedMotion } from "svelte/motion";
	import { COVERT_OPS, type CovertOpKind } from "#lib/config/index.js";
	import { countdown } from "#lib/utils/military.js";
	import { effectLabel } from "#lib/utils/covert.js";

	interface Outcome {
		id: number;
		kind: CovertOpKind;
		target: string;
		self: boolean;
		succeeded: boolean;
		detected: boolean;
		attributed: boolean;
		atWar: boolean;
		successChance: number;
		attributionChance: number;
		magnitude: number;
		effectEndsAt: string | null;
		stolen: { taken: number; kept: number } | null;
	}

	const {
		outcome,
		onclose,
		ondone
	}: { outcome: Outcome; onclose: () => void; /** Called once the verdict is printed. */ ondone?: () => void } =
		$props();

	type Line = { text: string; status?: string; tone?: "ok" | "bad" | "warn" };
	const spec = $derived(COVERT_OPS[outcome.kind]);
	const cyber = $derived(spec.domain === "cyber");
	const money = (n: number) => `$${n.toLocaleString()}`;

	// Stable, fictional artefacts for the trace so the same op always reads the same.
	const host = $derived(
		`${outcome.kind}-${String(outcome.id).padStart(3, "0")}.${outcome.target.toLowerCase().replace(/[^a-z0-9]+/g, "")}.gov`
	);
	const ip = $derived(`198.51.100.${((outcome.id * 37) % 200) + 20}`);
	const port = $derived(
		(
			{
				grid_attack: 502,
				c2_disruption: 5060,
				financial_theft: 443,
				comms_intercept: 5060,
				air_defence_spoof: 161,
				supply_chain: 445,
				morale_campaign: 80,
				disinformation: 80,
				counter_propaganda: 80,
				leaflet_drop: 80
			} as Record<import("#lib/config/index.js").CovertOpKind, number>
		)[outcome.kind] ?? 22
	);
	const service = $derived(
		(
			{
				grid_attack: "modbus",
				c2_disruption: "sip",
				financial_theft: "https",
				comms_intercept: "sip",
				air_defence_spoof: "snmp",
				supply_chain: "smb",
				morale_campaign: "http",
				disinformation: "http",
				counter_propaganda: "http",
				leaflet_drop: "http"
			} as Record<import("#lib/config/index.js").CovertOpKind, string>
		)[outcome.kind] ?? "ssh"
	);

	const lines = $derived.by((): Line[] => {
		const o = outcome;
		const ok = o.succeeded;
		const tag = o.kind.toUpperCase();
		const cascade: Record<string, string> = {
			grid_attack: "grid SCADA offline → factories brown out, radar cueing degraded",
			c2_disruption: "sensor links dropped → recon slower, units fight uncoordinated",
			financial_theft: "shell accounts settled → ledger reconciled at both ends",
			comms_intercept: "SIGINT feed live → recon coverage and estimate accuracy up",
			air_defence_spoof: "false tracks injected → radar cueing and SAM effectiveness down",
			supply_chain: "compromised vendor updates → factory output down"
		};
		const head: Line[] = cyber
			? [
					{ text: `$ opctl launch ${tag.toLowerCase()} --target "${o.target}" --relay 3` },
					{ text: `> resolving ${host} → ${ip}`, status: "ok", tone: "ok" },
					{ text: `> scan ${ip}: ${port}/tcp open (${service})`, status: "mapped", tone: "ok" },
					{ text: "> weaponise: stage payload in relay chain", status: "ok", tone: "ok" },
					{ text: "> deliver: signed session, 3 hops", status: "ok", tone: "ok" },
					{
						text: "> exploit: command channel on " + service,
						status: ok ? "accepted" : "rejected",
						tone: ok ? "ok" : "bad"
					},
					{ text: "> install: persistence token", status: ok ? "seeded" : "denied", tone: ok ? "ok" : "bad" },
					{
						text: "> execute: " + (cascade[o.kind] ?? tag.toLowerCase()),
						status: ok ? "live" : "aborted",
						tone: ok ? "ok" : "bad"
					}
				]
			: [
					{ text: `$ ioctl campaign ${tag} --audience "${o.self ? "home front" : o.target}"` },
					{ text: "> drafting narratives", status: "ok", tone: "ok" },
					{
						text: "> seeding channels",
						status: o.kind === "leaflet_drop" ? "40,000 leaflets" : "14 outlets",
						tone: "ok"
					},
					{ text: "> audience uptake", status: ok ? "spreading" : "ignored", tone: ok ? "ok" : "bad" }
				];
		const tail: Line[] = o.self
			? []
			: [
					{
						text: "> target noticed",
						status: o.detected ? "yes" : "no",
						tone: o.detected ? "warn" : "ok"
					},
					{
						text: "> attribution",
						status: o.attributed ? "TRACED TO US" : "clean",
						tone: o.attributed ? "bad" : "ok"
					}
				];
		return [...head, ...tail];
	});

	const verdict = $derived.by(() => {
		const o = outcome;
		if (!o.succeeded)
			return { tone: "bad" as const, title: cyber ? "ABORTED" : "NO TRACTION", text: `${spec.label} failed.` };
		if (o.kind === "financial_theft" && o.stolen) {
			return {
				tone: "ok" as const,
				title: "BREACH",
				text: `${money(o.stolen.taken)} siphoned from ${o.target}; ${money(o.stolen.kept)} reached our treasury.`
			};
		}
		const left = o.effectEndsAt ? countdown(o.effectEndsAt) : null;
		const effect = spec.effect ? effectLabel(spec.effect, Math.abs(o.magnitude)) : spec.label;
		return {
			tone: "ok" as const,
			title: cyber ? "BREACH" : "CAMPAIGN LIVE",
			text: `${effect}${o.self ? "" : ` on ${o.target}`}${left ? ` for ${left}` : ""}.`
		};
	});

	const extra = $derived(
		outcome.attributed && !outcome.atWar && !outcome.self
			? `${outcome.target} caught us in peacetime: they hold a casus belli for a week.`
			: null
	);

	// Typewriter: line by line, characters per tick.
	let shown = $state(0);
	let typed = $state(0);
	const instant = prefersReducedMotion.current;
	$effect(() => {
		void outcome.id;
		if (instant) {
			shown = lines.length;
			typed = 0;
			return;
		}
		shown = 0;
		typed = 0;
		const t = setInterval(() => {
			const current = lines[shown];
			if (!current) return clearInterval(t);
			typed += 3;
			if (typed >= current.text.length) {
				shown++;
				typed = 0;
			}
		}, 22);
		return () => clearInterval(t);
	});
	const done = $derived(shown >= lines.length);
	let reported = -1;
	$effect(() => {
		if (done && reported !== outcome.id) {
			reported = outcome.id;
			ondone?.();
		}
	});
	const toneClass = { ok: "text-positive-fg", bad: "text-hostile-fg", warn: "text-warning" } as const;
</script>

<div class="relative isolate" role="status" aria-live="polite">
	{#if !cyber && !instant}
		<div class="ripple" aria-hidden="true"><span></span><span></span><span></span></div>
	{/if}
	<div class="terminal panel relative overflow-hidden bg-surface-0 font-mono text-xs" class:scan={!instant}>
		<div class="flex items-center justify-between border-b border-line/15 px-3 py-1.5">
			<span class="tracking-[0.18em] text-fg-muted uppercase">
				{cyber ? "CYBER" : "PSYOPS"} · OP {String(outcome.id).padStart(5, "0")}
			</span>
			<button type="button" class="text-fg-muted hover:text-fg" onclick={onclose} aria-label="Close console">✕</button>
		</div>
		<div class="space-y-0.5 px-3 py-2 leading-relaxed">
			{#each lines.slice(0, shown) as line, i (i)}
				<div class="flex gap-2">
					<span class="min-w-0 flex-1 truncate text-fg-soft">{line.text}</span>
					{#if line.status}
						<span class="shrink-0 {line.tone ? toneClass[line.tone] : 'text-fg-soft'}">{line.status}</span>
					{/if}
				</div>
			{/each}
			{#if !done}
				<div class="text-fg-soft">{lines[shown]?.text.slice(0, typed)}<span class="caret">▌</span></div>
			{:else}
				<div class="mt-2 border-t border-line/15 pt-2">
					<p class="font-bold tracking-[0.16em] {toneClass[verdict.tone]}">[ {verdict.title} ]</p>
					<p class="text-fg-body">{verdict.text}</p>
					{#if extra}<p class="text-warning">{extra}</p>{/if}
					<p class="mt-1 text-fg-faint">
						odds: success {outcome.successChance}% · attribution {outcome.attributionChance}%
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.terminal.scan::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0 2px,
			color-mix(in oklab, var(--color-base-content) 4%, transparent) 2px 3px
		);
	}
	.terminal.scan::before {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		height: 30%;
		pointer-events: none;
		background: linear-gradient(
			to bottom,
			transparent,
			color-mix(in oklab, var(--color-positive) 10%, transparent),
			transparent
		);
		animation: sweep 2.4s linear infinite;
	}
	@keyframes sweep {
		from {
			top: -30%;
		}
		to {
			top: 100%;
		}
	}
	.caret {
		animation: blink 0.8s steps(2) infinite;
		color: var(--color-positive);
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.ripple {
		position: absolute;
		inset: 0;
		z-index: -1;
		display: grid;
		place-items: center;
		pointer-events: none;
	}
	.ripple span {
		grid-area: 1 / 1;
		width: 3rem;
		aspect-ratio: 1;
		border-radius: 9999px;
		border: 1px solid color-mix(in oklab, var(--color-politics) 70%, transparent);
		opacity: 0;
		animation: ripple 1.8s cubic-bezier(0.22, 1, 0.36, 1) 2 both;
	}
	.ripple span:nth-child(2) {
		animation-delay: 0.3s;
	}
	.ripple span:nth-child(3) {
		animation-delay: 0.6s;
	}
	@keyframes ripple {
		0% {
			transform: scale(0.2);
			opacity: 0.9;
		}
		100% {
			transform: scale(14);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.terminal.scan::before,
		.caret,
		.ripple span {
			animation: none;
		}
	}
</style>
