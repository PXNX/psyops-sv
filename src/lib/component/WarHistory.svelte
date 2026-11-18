<!-- src/lib/component/WarHistory.svelte -->
<!-- A state's or bloc's war record: one row per war with the opponent,
     dates, battles fought and a WON / LOST / DRAW stamp. -->
<script lang="ts">
	import { formatDate } from "#lib/utils/formatting.js";

	interface War {
		id: number;
		status: "active" | "ended";
		declaredAt: Date | string;
		endedAt: Date | string | null;
		attacker: { id: number; name: string };
		defender: { id: number; name: string };
		side: "attacker" | "defender";
		result: "won" | "lost" | "draw" | null;
		battles: number;
	}

	let { wars }: { wars: War[] } = $props();

	const stamp = {
		won: { label: "Won", cls: "text-[#b9f29a] border-[#6fd14a]/60" },
		lost: { label: "Lost", cls: "text-red-300 border-red-500/60" },
		draw: { label: "Draw", cls: "text-[#d3caa9] border-[#c8b47a]/50" }
	} as const;
</script>

{#if wars.length === 0}
	<p class="text-sm text-[#a8a083]">No wars fought yet.</p>
{:else}
	<ul class="space-y-2">
		{#each wars as war, i (war.id)}
			{@const opponent = war.side === "attacker" ? war.defender : war.attacker}
			<li>
				<a
					href="/war/{war.id}"
					class="panel-interactive rounded-sm p-3 flex items-center gap-3"
					style="--rise-delay: {Math.min(i, 8) * 40}ms"
				>
					<span class="text-xl shrink-0" aria-hidden="true">{war.side === "attacker" ? "⚔️" : "🛡️"}</span>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold text-[#f5efd8] truncate">
							{war.side === "attacker" ? "Against" : "Defending against"}
							{opponent.name}
						</p>
						<p class="text-xs text-[#a8a083] truncate">
							{formatDate(war.declaredAt)}{war.endedAt ? ` – ${formatDate(war.endedAt)}` : " – today"} ·
							{war.battles}
							{war.battles === 1 ? "battle" : "battles"}
						</p>
					</div>
					{#if war.status === "active"}
						<span
							class="shrink-0 text-[10px] uppercase tracking-widest text-red-300 flex items-center gap-1.5"
						>
							<span class="size-1.5 rounded-full bg-red-500 animate-pulse"></span>At war
						</span>
					{:else if war.result}
						<span
							class="shrink-0 animate-stamp border-2 rounded-sm px-2 py-0.5 font-serif text-xs font-black uppercase tracking-widest {stamp[
								war.result
							].cls}"
							style="--stamp-tilt: -6deg"
						>
							{stamp[war.result].label}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
