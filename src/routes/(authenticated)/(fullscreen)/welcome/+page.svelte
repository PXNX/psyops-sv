<!-- src/routes/(authenticated)/(fullscreen)/welcome/+page.svelte -->
<script lang="ts">
	import PsyopsLogo from "#lib/assets/logo.svg";
	import { fade, fly } from "svelte/transition";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentNewspaper20Filled from "~icons/fluent/news-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import { buttonClass } from "#lib/component/ui/styles.js";

	const features = [
		{
			icon: FluentBuildingGovernment20Filled,
			title: "Join or Create a State",
			description:
				"Choose your region, participate in governance, and help shape laws and policies through democratic processes.",
			wrapClass: "bg-friendly-bg/18 border border-friendly/30",
			iconClass: "text-friendly"
		},
		{
			icon: FluentPeople20Filled,
			title: "Political Parties & Elections",
			description: "Found your own party, recruit members, and compete in elections to gain seats in parliament.",
			wrapClass: "bg-politics-bg/15 border border-politics/30",
			iconClass: "text-politics"
		},
		{
			icon: FluentFactory20Filled,
			title: "Economic System",
			description: "Build companies, manage factories, trade resources, and develop a thriving economy.",
			wrapClass: "bg-positive-bg/18 border border-positive/30",
			iconClass: "text-positive"
		},
		{
			icon: FluentNewspaper20Filled,
			title: "Media & Journalism",
			description: "Create newspapers, publish articles, and influence public opinion through investigative reporting.",
			wrapClass: "bg-primary/12 border border-primary/35",
			iconClass: "text-primary-fg"
		}
	];

	const startingBenefits = [
		"1,000 currency to kickstart your journey",
		"Freedom to choose any region as your residence",
		"Ability to join existing parties or found your own",
		"Access to all economic and political features"
	];
</script>

<svelte:head>
	<title>{"Welcome · PsyOps"}</title>
</svelte:head>

<div class="max-w-4xl w-full space-y-8" in:fade={{ duration: 300 }}>
	<!-- Logo & Title -->
	<div class="text-center space-y-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div class="flex justify-center">
			<div class="size-24 bg-primary/12 border border-primary/35 rounded-sm flex items-center justify-center">
				<PsyopsLogo class="size-14 text-primary-fg" />
			</div>
		</div>
		<h1 class="text-5xl font-bold text-fg">Welcome to PsyOps!</h1>
		<p class="text-xl text-fg-soft max-w-2xl mx-auto">
			A political simulation game where you shape nations, build empires, and influence the world through strategy and
			diplomacy.
		</p>
	</div>

	<!-- Features Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4" in:fly={{ y: 20, duration: 500, delay: 200 }}>
		{#each features as feature, i}
			<div class="panel rounded-sm p-5 space-y-3" in:fly={{ y: 20, duration: 500, delay: 300 + i * 100 }}>
				<div class="size-12 {feature.wrapClass} rounded-sm flex items-center justify-center">
					<feature.icon class="size-6 {feature.iconClass}" />
				</div>
				<h3 class="section-title">{feature.title}</h3>
				<p class="text-sm text-fg-soft leading-relaxed">{feature.description}</p>
			</div>
		{/each}
	</div>

	<!-- Call to Action -->
	<div class="text-center space-y-4" in:fly={{ y: 20, duration: 500, delay: 800 }}>
		<a href="/welcome/create" class={buttonClass({ variant: "primary", size: "lg" })}>
			<span class="text-lg">Create Your Profile</span>
			<FluentArrowRight20Filled class="size-5" />
		</a>
		<p class="text-sm text-fg-muted">Takes less than a minute • Complete your profile to unlock all features</p>
	</div>
</div>
