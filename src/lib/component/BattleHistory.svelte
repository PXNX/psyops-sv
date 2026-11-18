<!-- src/lib/component/BattleHistory.svelte -->
<!-- Battles fought over a region: who attacked whom, when, the outcome and
     what the conquest destroyed. -->
<script lang="ts">
	import { formatDate } from "#lib/utils/formatting.js";

	interface Battle {
		id: number;
		status: string;
		startedAt: Date | string;
		endedAt: Date | string | null;
		attacker: { id: number; name: string };
		defender: { id: number; name: string };
		buildingsDestroyed: Partial<Record<string, number>> | null;
	}

	let { battles }: { battles: Battle[] } = $props();

	const lost = (b: Battle) => Object.values(b.buildingsDestroyed ?? {}).reduce((s, n) => s + (n ?? 0), 0);
</script>

{#if battles.length === 0}
	<p class="text-sm text-[#a8a083]">No battles have been fought here.</p>
{:else}
	<ol class="relative border-l border-[#c8b47a]/20 ml-2 space-y-3">
		{#each battles as b (b.id)}
			{@const won = b.status === "attacker_won" ? b.attacker : b.status === "defender_won" ? b.defender : null}
			<li class="pl-4 relative">
				<span
					class="absolute -left-[5px] top-3 size-2.5 rounded-full {b.status === 'ongoing'
						? 'bg-red-500 animate-pulse'
						: b.status === 'attacker_won'
							? 'bg-red-400'
							: 'bg-[#5eaef5]'}"
				></span>
				<a href="/battle/{b.id}" class="panel-interactive rounded-sm p-3 block">
					<p class="text-sm text-[#f5efd8]">
						<span class="font-semibold text-red-300">{b.attacker.name}</span>
						<span class="text-[#a8a083]">attacked</span>
						<span class="font-semibold text-[#b3dcff]">{b.defender.name}</span>
					</p>
					<p class="text-xs text-[#a8a083] mt-0.5">
						{formatDate(b.startedAt)} ·
						{#if b.status === "ongoing"}
							<span class="text-red-300">fighting</span>
						{:else if won}
							<span class="text-[#e6ddbf]">{won.name} won</span>
						{/if}
						{#if lost(b)}
							· <span class="text-red-300">{lost(b)} building levels destroyed</span>
						{/if}
					</p>
				</a>
			</li>
		{/each}
	</ol>
{/if}
