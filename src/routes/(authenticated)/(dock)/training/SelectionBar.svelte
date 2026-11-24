<!-- Sticks to the bottom of the screen while roster units are ticked: move
     them into an existing formation, or form a new one around them. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button } from "#lib/component/ui/index.js";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentArrowEnter20Regular from "~icons/fluent/arrow-enter-20-regular";
	import { act } from "./forces";

	interface Props {
		kind: "division" | "airgroup";
		groups: { id: number; name: string }[];
		officers: { id: number; name: string; alive: boolean }[];
		selected: number[];
	}
	let { kind, groups, officers, selected = $bindable() }: Props = $props();

	let busy = $state(false);
	let mode = $state<"move" | "form">("form");
	let target = $state("");
	let name = $state("");
	let commander = $state("");
	let bar = $state<HTMLElement>();

	const noun = $derived(kind === "division" ? "division" : "airgroup");
	const done = () => {
		selected = [];
		name = "";
		commander = "";
	};
	$effect(() => {
		if (!groups.length) mode = "form";
	});
</script>

<div
	bind:this={bar}
	class="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-surface-5/95 px-3 py-2 shadow-lg backdrop-blur animate-soft-in"
>
	<span class="data text-xs font-semibold text-primary-fg">{selected.length} selected</span>
	{#if groups.length}
		<div class="flex rounded-sm border border-line/20 p-0.5 text-[11px]" role="radiogroup" aria-label="Assign how">
			{#each [["form", `New ${noun}`], ["move", "Existing"]] as [value, label] (value)}
				<button
					type="button"
					role="radio"
					aria-checked={mode === value}
					class="rounded-[3px] px-2 py-0.5 transition-colors {mode === value
						? 'bg-primary/20 text-primary-fg'
						: 'text-fg-muted hover:text-fg'}"
					onclick={() => (mode = value as "form" | "move")}
				>
					{label}
				</button>
			{/each}
		</div>
	{/if}

	{#if mode === "move" && groups.length}
		<form
			method="POST"
			action="?/setUnitGroup"
			use:enhance={act({ busy: (v) => (busy = v), glow: () => bar, after: done })}
			class="flex min-w-0 flex-1 flex-wrap items-center gap-2"
		>
			{#each selected as id (id)}<input type="hidden" name="unitIds" value={id} />{/each}
			<select
				name="groupId"
				bind:value={target}
				required
				class="field-control min-w-36 flex-1 rounded-sm px-2 py-1 text-xs"
				aria-label="Move into"
			>
				<option value="" disabled>Move into…</option>
				{#each groups as g (g.id)}<option value={String(g.id)}>{g.name}</option>{/each}
			</select>
			<Button type="submit" size="xs" variant="primary" icon={FluentArrowEnter20Regular} disabled={busy || !target}>
				Move
			</Button>
		</form>
	{:else}
		<form
			method="POST"
			action="?/formUnitGroup"
			use:enhance={act({ busy: (v) => (busy = v), glow: () => bar, after: done })}
			class="flex min-w-0 flex-1 flex-wrap items-center gap-2"
		>
			<input type="hidden" name="kind" value={kind} />
			{#each selected as id (id)}<input type="hidden" name="unitIds" value={id} />{/each}
			<input
				name="name"
				required
				maxlength="100"
				bind:value={name}
				placeholder="Name the {noun}"
				class="field-control min-w-32 flex-1 rounded-sm px-2 py-1 text-xs"
			/>
			<select
				name="commanderId"
				bind:value={commander}
				class="field-control rounded-sm px-2 py-1 text-xs"
				aria-label="Commander"
			>
				<option value="">No commander yet</option>
				{#each officers.filter((o) => o.alive) as o (o.id)}<option value={String(o.id)}>{o.name}</option>{/each}
			</select>
			<Button type="submit" size="xs" variant="primary" icon={FluentAdd20Filled} disabled={busy}>Form</Button>
		</form>
	{/if}
	<Button type="button" size="xs" variant="ghost" onclick={() => (selected = [])}>Clear</Button>
</div>
