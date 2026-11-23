<!-- src/routes/(authenticated)/(fullscreen)/welcome/+page.svelte -->
<!-- An opening scene, not a tutorial. The player has just inherited a fortune
     and a reputation from a relative the world is still talking about. -->
<script lang="ts">
	import PsyopsLogo from "#lib/assets/logo.svg";
	import { fade, fly } from "svelte/transition";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentNewspaper20Filled from "~icons/fluent/news-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import { buttonClass } from "#lib/component/ui/styles.js";

	let { data } = $props();

	const levers = [
		{
			icon: FluentBuildingGovernment20Filled,
			title: "Politics",
			line: "Put your people into office and write the rules yourself.",
			wrapClass: "bg-politics-bg/15 border border-politics/30",
			iconClass: "text-politics"
		},
		{
			icon: FluentShield20Filled,
			title: "Force",
			line: "Keep battalions, fleets and commanders who can make a point.",
			wrapClass: "bg-error/12 border border-error/30",
			iconClass: "text-error"
		},
		{
			icon: FluentFactory20Filled,
			title: "Money",
			line: "Companies, factories and markets — the reservoir everything else draws from.",
			wrapClass: "bg-positive-bg/18 border border-positive/30",
			iconClass: "text-positive"
		},
		{
			icon: FluentNewspaper20Filled,
			title: "Influence",
			line: "Papers, intelligence and reputation decide what people believe before they decide what to do.",
			wrapClass: "bg-primary/12 border border-primary/35",
			iconClass: "text-primary-fg"
		}
	];
</script>

<svelte:head>
	<title>{"An Inheritance · PsyOps"}</title>
</svelte:head>

<div class="max-w-4xl w-full space-y-8" in:fade={{ duration: 300 }}>
	<div class="text-center space-y-5" in:fly={{ y: -20, duration: 600, delay: 80 }}>
		<div class="flex justify-center">
			<div class="panel size-24 rounded-sm flex items-center justify-center animate-float">
				<PsyopsLogo class="size-14 text-primary-fg" />
			</div>
		</div>
		<p class="font-mono text-[11px] uppercase tracking-[0.28em] text-fg-muted">The reading of the will</p>
		<h1 class="font-serif text-4xl text-heading sm:text-5xl">You inherited more than money.</h1>
		<div class="mx-auto max-w-2xl space-y-3 text-left font-serif text-[1.0625rem] leading-relaxed text-fg-body">
			<p>
				Your uncle is dead, and the lawyers have finished reading the will. There is a large account in your
				name, a vault of contracts nobody has seen, and a network of people who used to take his calls and now
				wait for yours.
			</p>
			<p>
				He built his position the old way: a seat in the right room, an order signed at the right hour, a factory
				on the right river, and a headline planted at the right moment. The four levers are yours now. The question
				is no longer whether you can afford to act — it is which lever to pull first.
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4" in:fly={{ y: 20, duration: 500, delay: 240 }}>
		{#each levers as lever, i}
			<div class="panel animate-soft-in rounded-sm p-5 space-y-2" style="--rise-delay: {i * 70}ms">
				<div class="size-11 {lever.wrapClass} rounded-sm flex items-center justify-center">
					<lever.icon class="size-5 {lever.iconClass}" />
				</div>
				<h3 class="section-title">{lever.title}</h3>
				<p class="text-sm text-fg-soft leading-relaxed">{lever.line}</p>
			</div>
		{/each}
	</div>

	<div class="panel-muted flex items-start gap-3 text-sm text-fg-soft" in:fly={{ y: 20, duration: 500, delay: 420 }}>
		<FluentMoney20Filled class="mt-0.5 size-5 shrink-0 text-positive" />
		<p>
			<strong class="text-fg">In the account:</strong> {data.startingBalance?.toLocaleString() ?? "a great deal"} credits,
			a residence of your choosing, and the family name — for better or worse.
		</p>
	</div>

	<div class="text-center space-y-3" in:fly={{ y: 20, duration: 500, delay: 560 }}>
		<a href="/welcome/create" class={buttonClass({ variant: "primary", size: "lg" })}>
			<span class="text-lg">Take the inheritance</span>
			<FluentArrowRight20Filled class="size-5" />
		</a>
		<p class="text-sm text-fg-muted">Choose where you live and what your name means. The rest can be learned in the field.</p>
	</div>
</div>
