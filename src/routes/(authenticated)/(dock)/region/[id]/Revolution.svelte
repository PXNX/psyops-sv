<!-- src/routes/(authenticated)/(dock)/region/[id]/Revolution.svelte -->
<!-- The locals' road to independence: low support starts it, three residents
     join it, and one fight for freedom decides it. A draw is enough. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { REVOLUTION_CONFIG } from "#lib/config/index.js";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import UserLink from "#lib/component/UserLink.svelte";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import { formatDate } from "#lib/utils/formatting.js";

	let {
		regionId,
		revolution,
		pastRevolutions
	}: {
		regionId: number;
		revolution: {
			support: number;
			threshold: number;
			minMembers: number;
			cost: { rifles: number; money: number; riflesOwned: number; moneyOwned: number; canAfford: boolean };
			livesHere: boolean;
			ready: boolean;
			canStart: boolean;
			canJoin: boolean;
			canFight: boolean;
			revolution: {
				id: number;
				status: string;
				outcome: string | null;
				startedBy: string;
				opinionAtStart: number;
				rebelPower: number | null;
				governmentPower: number | null;
				startedAt: Date;
				resolvedAt: Date | null;
				members: Array<{ userId: string; name: string | null }>;
			} | null;
		} | null;
		pastRevolutions: Array<{
			id: number;
			status: string;
			outcome: string | null;
			startedAt: Date;
			resolvedAt: Date | null;
		}>;
	} = $props();

	const outcomeLabel = (outcome: string | null) =>
		outcome === "victory" ? "Victory" : outcome === "draw" ? "Draw" : outcome === "defeat" ? "Defeat" : "—";
	const statusLabel = (status: string) =>
		status === "independent"
			? "Independent"
			: status === "crushed"
				? "Crushed"
				: status === "fighting"
					? "Fighting"
					: "Organizing";
</script>

<section class="panel rounded-sm p-4 space-y-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="section-title flex items-center gap-2"><FluentFlag20Filled class="size-4" /> Revolution</h2>
		{#if revolution?.revolution}
			<Badge
				tone={revolution.revolution.status === "independent"
					? "green"
					: revolution.revolution.status === "crushed"
						? "red"
						: "amber"}
				size="xs"
			>
				{statusLabel(revolution.revolution.status)}
			</Badge>
		{/if}
	</div>

	{#if !revolution}
		<p class="text-sm text-fg-muted">This region is already independent.</p>
	{:else if !revolution.revolution}
		<div class="space-y-2">
			<div class="flex items-baseline justify-between gap-3 text-sm">
				<span class="text-fg-muted">Civilian support for the state</span>
				<span class="font-mono font-bold {revolution.support <= revolution.threshold ? 'text-hostile-fg' : 'text-fg'}">
					{revolution.support}/100
				</span>
			</div>
			<div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
				<div class="h-full bg-hostile" style="width: {revolution.support}%"></div>
			</div>
			<p class="text-xs text-fg-muted">
				An uprising needs support at {revolution.threshold}/100 or lower and {revolution.minMembers} residents.
				It costs {revolution.cost.rifles.toLocaleString()} rifles and ${revolution.cost.money.toLocaleString()} up front.
			</p>
			<p class="font-mono text-xs {revolution.cost.canAfford ? 'text-fg-muted' : 'text-hostile-fg'}">
				You have {revolution.cost.riflesOwned.toLocaleString()} rifles · ${revolution.cost.moneyOwned.toLocaleString()}
			</p>
			{#if revolution.canStart}
				<form method="POST" action="?/startRevolution" use:enhance>
					<Button type="submit" size="sm" variant="soft-red" block icon={FluentFlag20Filled}>Start a revolution</Button>
				</form>
			{:else if !revolution.livesHere}
				<p class="text-xs text-fg-muted">Only residents can start a revolution here.</p>
			{:else if !revolution.cost.canAfford}
				<p class="flex items-center gap-2 text-xs text-warning">
					<FluentWarning20Filled class="size-4 shrink-0" /> You need the rifles and the cash to arm the rising.
				</p>
			{:else}
				<p class="flex items-center gap-2 text-xs text-warning">
					<FluentWarning20Filled class="size-4 shrink-0" /> Civilians still back the state.
				</p>
			{/if}
		</div>
	{:else}
		{@const rising = revolution.revolution}
		<div class="space-y-3 text-sm">
			<p class="text-xs text-fg-muted">
				Declared {formatDate(rising.startedAt)} with {rising.opinionAtStart}/100 civilian support.
			</p>
			{#if rising.status === "organizing"}
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-fg-muted">Conspirators</span>
					<span class="font-mono font-bold {revolution.ready ? 'text-positive-fg' : 'text-warning'}">
						{rising.members.length}/{revolution.minMembers}
					</span>
				</div>
				<ul class="space-y-1.5">
					{#each rising.members as member (member.userId)}
						<li class="panel-muted rounded-sm px-2 py-1.5 flex items-center justify-between gap-2">
							<UserLink id={member.userId} name={member.name} size="xs" />
							{#if member.userId === rising.startedBy}<span class="text-[10px] uppercase text-fg-muted">
									Leader
								</span>{/if}
						</li>
					{/each}
				</ul>
				<div class="flex flex-wrap gap-2">
					{#if revolution.canJoin}
						<form method="POST" action="?/joinRevolution" use:enhance>
							<input type="hidden" name="revolutionId" value={rising.id} />
							<Button type="submit" size="sm" variant="secondary">Join</Button>
						</form>
					{/if}
					{#if revolution.canFight}
						<form method="POST" action="?/fightForFreedom" use:enhance>
							<input type="hidden" name="revolutionId" value={rising.id} />
							<Button type="submit" size="sm" variant="soft-red" icon={FluentFlag20Filled}>Fight for freedom</Button>
						</form>
					{:else}
						<p class="text-xs text-fg-muted">
							{revolution.ready
								? "Only a conspirator can call the fight."
								: `Need ${revolution.minMembers} conspirators to fight.`}
						</p>
					{/if}
				</div>
			{:else}
				<div class="panel-muted rounded-sm p-3 space-y-1">
					<p class="font-semibold {rising.outcome === 'defeat' ? 'text-hostile-fg' : 'text-positive-fg'}">
						{outcomeLabel(rising.outcome)} · {statusLabel(rising.status)}
					</p>
					{#if rising.rebelPower !== null && rising.governmentPower !== null}
						<p class="font-mono text-xs text-fg-muted">
							Rebels {rising.rebelPower.toLocaleString()} vs government {rising.governmentPower.toLocaleString()}
						</p>
					{/if}
					<p class="text-xs text-fg-muted">
						{rising.outcome === "defeat"
							? "The region stayed under the state."
							: "The region broke away and is now independent."}
					</p>
				</div>
			{/if}
		</div>
	{/if}

	{#if pastRevolutions.length}
		<div class="border-t border-line/10 pt-2">
			<h3 class="text-[10px] uppercase tracking-wide text-fg-muted mb-1">Past uprisings</h3>
			<ul class="space-y-1 text-xs text-fg-muted">
				{#each pastRevolutions as past (past.id)}
					<li class="flex justify-between gap-2">
						<span>{formatDate(past.startedAt)}</span>
						<span class="font-mono">{outcomeLabel(past.outcome)}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
