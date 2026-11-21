<!-- src/lib/component/infiltration/IntrusionConsole.svelte -->
<!-- A hands-on intrusion into one site. The operator scans the host, chooses
     an exposed service, escalates, pivots into the right segment and only then
     runs cameras/files or deploys a cyber payload. Every step is a form; the
     transcript comes back from the server and is replayed as a terminal. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { ATTACK_VECTORS, COVERT_OPS, INTRUSION, type LogLine } from "#lib/config/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import IconTerminal from "~icons/mdi/console";

	interface Props {
		session: any | null;
		site: any;
		asset: any;
		treasury: number;
		onResult?: (data: any) => void;
	}
	let { session, site, asset, treasury, onResult }: Props = $props();

	const stepOrder = { scan: 0, access: 1, escalate: 2, pivot: 3 } as const;
	const stage = $derived((session?.stage ?? "scan") as keyof typeof stepOrder);
	const logLines = $derived((session?.log ?? []) as LogLine[]);
	const vectors = $derived.by(() => {
		const ids = new Set<string>();
		for (const p of (session?.ports ?? []) as { vector?: string }[]) if (p.vector) ids.add(p.vector);
		return [...ids].map((id) => ({ id, ...ATTACK_VECTORS[id] })).filter((v) => v.label);
	});
	const payloads = [
		"grid_attack",
		"c2_disruption",
		"comms_intercept",
		"air_defence_spoof",
		"supply_chain",
		"financial_theft"
	] as const;
	let payloadKind = $state<(typeof payloads)[number]>("grid_attack");
	let busy = $state<string | null>(null);

	const submit = (key: string) => {
		busy = key;
		return async ({ result, update }: any) => {
			busy = null;
			await update({ reset: false });
			toastResult(result);
			if (result.type === "success") onResult?.(result.data);
		};
	};
	const tone: Record<LogLine["tone"], string> = {
		info: "text-fg-muted",
		ok: "text-positive-fg",
		warn: "text-warning",
		bad: "text-hostile-fg"
	};
</script>

<div class="panel overflow-hidden rounded-sm border border-line/25 bg-surface-0 font-mono text-xs">
	<div class="flex items-center justify-between border-b border-line/15 px-3 py-1.5">
		<span class="flex items-center gap-2 tracking-[0.16em] text-fg-muted uppercase">
			<IconTerminal class="size-3.5" /> Intrusion · {site.code}
		</span>
		<span class="data text-[10px] text-fg-faint">
			{session ? `${session.host} · ${session.ip}` : "no session"}
		</span>
	</div>

	{#if logLines.length}
		<div class="max-h-56 space-y-0.5 overflow-y-auto px-3 py-2 leading-relaxed" aria-live="polite">
			{#each logLines as line, i (i)}
				<div class="flex gap-2">
					<span class="shrink-0 text-fg-faint">{line.t}</span>
					<span class="min-w-0 flex-1 whitespace-pre-wrap break-all {tone[line.tone] ?? 'text-fg-soft'}">
						{line.line}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="px-3 py-2 text-fg-muted">Nothing probed yet. Start with a service scan of the host.</p>
	{/if}

	<div class="space-y-2 border-t border-line/15 px-3 py-3">
		{#if !session}
			<form method="POST" action="?/intrude" use:enhance={submit("scan")}>
				<input type="hidden" name="assetId" value={asset.id} />
				<input type="hidden" name="siteId" value={site.id} />
				<input type="hidden" name="step" value="scan" />
				<button
					type="submit"
					disabled={!!busy || (treasury ?? 0) < INTRUSION.SCAN_COST || !asset.usable}
					class="btn btn-secondary btn-sm w-full"
				>
					$ nmap -sV {site.code} · ${INTRUSION.SCAN_COST.toLocaleString()}
				</button>
			</form>
		{:else if stage === "scan"}
			<p class="text-fg-muted">Pick an exposed service:</p>
			<div class="grid gap-1.5 sm:grid-cols-2">
				{#each vectors as vector (vector.id)}
					<form method="POST" action="?/intrude" use:enhance={submit(vector.id)}>
						<input type="hidden" name="assetId" value={asset.id} />
						<input type="hidden" name="siteId" value={site.id} />
						<input type="hidden" name="step" value="access" />
						<input type="hidden" name="vector" value={vector.id} />
						<button
							type="submit"
							title={vector.blurb}
							disabled={!!busy || asset.access < vector.accessNeeded || (treasury ?? 0) < INTRUSION.ACCESS_COST}
							class="w-full rounded-sm border border-line/25 bg-surface-3/40 px-2 py-1.5 text-left hover:border-primary/60 disabled:opacity-40"
						>
							<span class="block truncate text-fg">{vector.label}</span>
							<span class="block truncate text-[10px] text-fg-muted">
								{vector.service} · needs L{vector.accessNeeded} · ${INTRUSION.ACCESS_COST.toLocaleString()}
							</span>
						</button>
					</form>
				{/each}
			</div>
		{:else if stage === "access"}
			<form method="POST" action="?/intrude" use:enhance={submit("escalate")}>
				<input type="hidden" name="assetId" value={asset.id} />
				<input type="hidden" name="siteId" value={site.id} />
				<input type="hidden" name="step" value="escalate" />
				<button
					type="submit"
					disabled={!!busy || (treasury ?? 0) < INTRUSION.ESCALATE_COST}
					class="btn btn-secondary btn-sm w-full"
				>
					$ sudo -l && exfil vault · ${INTRUSION.ESCALATE_COST.toLocaleString()}
				</button>
			</form>
		{:else if stage === "escalate"}
			<form method="POST" action="?/intrude" use:enhance={submit("pivot")}>
				<input type="hidden" name="assetId" value={asset.id} />
				<input type="hidden" name="siteId" value={site.id} />
				<input type="hidden" name="step" value="pivot" />
				<button
					type="submit"
					disabled={!!busy || (treasury ?? 0) < INTRUSION.PIVOT_COST}
					class="btn btn-secondary btn-sm w-full"
				>
					$ ip route && pivot to segment · ${INTRUSION.PIVOT_COST.toLocaleString()}
				</button>
			</form>
		{:else}
			<p class="text-positive-fg">
				[+] pivot established · {session.segment ?? "internal segment"} · {session.privileges}
			</p>
			<p class="text-fg-muted">Cameras and files are easier now. Deploy a payload against {site.code}:</p>
			<form method="POST" action="?/payload" class="space-y-2" use:enhance={submit("payload")}>
				<input type="hidden" name="assetId" value={asset.id} />
				<input type="hidden" name="siteId" value={site.id} />
				<input type="hidden" name="targetStateId" value={session.targetStateId} />
				<select bind:value={payloadKind} name="kind" class="field-control w-full rounded-sm px-2 py-1.5 text-xs">
					{#each payloads as kind (kind)}
						<option value={kind}>{COVERT_OPS[kind].label} · ${COVERT_OPS[kind].cost.toLocaleString()}</option>
					{/each}
				</select>
				<button type="submit" disabled={!!busy} class="btn btn-primary btn-sm w-full">
					Deploy {COVERT_OPS[payloadKind].label.toLowerCase()}
				</button>
			</form>
		{/if}

		{#if session}
			<form method="POST" action="?/intrude" use:enhance={submit("reset")}>
				<input type="hidden" name="assetId" value={asset.id} />
				<input type="hidden" name="siteId" value={site.id} />
				<input type="hidden" name="step" value="reset" />
				<button type="submit" disabled={!!busy} class="text-[10px] text-fg-muted hover:text-hostile-fg">
					reset session
				</button>
			</form>
		{/if}
	</div>
</div>
