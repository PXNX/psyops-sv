<!-- A short, dismissible guided tour. Progress is kept per browser so a
     tutorial appears once until the player finishes (or resets it). -->
<script lang="ts">
	import { onMount } from "svelte";
	import IconInfo from "~icons/fluent/question-circle-24-regular";
	import IconClose from "~icons/fluent/dismiss-20-regular";
	import { Button, IconButton } from "#lib/component/ui/index.js";

	interface Props {
		/** Stable id used as the localStorage key. */
		id: string;
		title?: string;
		steps: { title: string; body: string }[];
	}
	let { id, title = "Kurzanleitung", steps }: Props = $props();

	let open = $state(false);
	let index = $state(0);
	let ready = $state(false);
	const key = $derived(`psyops-tutorial-${id}`);

	onMount(() => {
		ready = true;
		// First-time visitors get the tour opened automatically, once.
		if (!localStorage.getItem(key)) open = true;
	});

	function finish() {
		localStorage.setItem(key, "done");
		open = false;
		index = 0;
	}
	function reset() {
		localStorage.removeItem(key);
		index = 0;
		open = true;
	}
</script>

{#if ready}
	{#if open}
		<div class="tutorial-panel animate-pop-in" role="dialog" aria-label={title}>
			<div class="tutorial-head">
				<div class="min-w-0">
					<div class="text-[10px] uppercase tracking-[0.18em] text-fg-muted">{title}</div>
					<h3 class="truncate text-sm font-semibold text-heading">{steps[index]?.title}</h3>
				</div>
				<IconButton icon={IconClose} label="Tutorial schliessen" size="xs" shape="square" variant="ghost" onclick={finish} />
			</div>
			<p class="tutorial-body">{steps[index]?.body}</p>
			<div class="tutorial-foot">
				<span class="text-[10px] text-fg-muted">{index + 1} / {steps.length}</span>
				<div class="flex items-center gap-1">
					{#if index > 0}
						<Button size="xs" variant="ghost" onclick={() => index--}>Zurück</Button>
					{/if}
					{#if index < steps.length - 1}
						<Button size="xs" onclick={() => index++}>Weiter</Button>
					{:else}
						<Button size="xs" onclick={finish}>Verstanden</Button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<button class="tutorial-help" onclick={() => (open = true)} title={title} aria-label={title}>
			<IconInfo class="size-5" />
		</button>
	{/if}
{/if}

<style>
	@reference "../../app.css";

	.tutorial-help {
		@apply fixed bottom-10 right-3 z-40 grid size-9 place-items-center rounded-full border border-line/30 bg-surface-2 text-fg-muted shadow-lg transition-colors hover:text-primary-fg md:bottom-12 md:right-4;
	}
	.tutorial-panel {
		@apply fixed bottom-12 right-2 z-40 w-[min(22rem,calc(100vw-1rem))] rounded-md border border-primary/30 bg-surface-1 p-3 shadow-2xl md:bottom-12 md:right-4;
	}
	.tutorial-head {
		@apply flex items-start justify-between gap-2;
	}
	.tutorial-body {
		@apply mt-2 text-xs leading-relaxed text-fg-soft;
		white-space: pre-line;
	}
	.tutorial-foot {
		@apply mt-3 flex items-center justify-between gap-2;
	}
</style>
