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
			wrapClass: "bg-[#2369b5]/18 border border-[#5eaef5]/30",
			iconClass: "text-[#5eaef5]"
		},
		{
			icon: FluentPeople20Filled,
			title: "Political Parties & Elections",
			description: "Found your own party, recruit members, and compete in elections to gain seats in parliament.",
			wrapClass: "bg-[#8a4fc0]/15 border border-[#c08cf0]/30",
			iconClass: "text-[#c08cf0]"
		},
		{
			icon: FluentFactory20Filled,
			title: "Economic System",
			description: "Build companies, manage factories, trade resources, and develop a thriving economy.",
			wrapClass: "bg-[#3f8a2a]/18 border border-[#6fd14a]/30",
			iconClass: "text-[#6fd14a]"
		},
		{
			icon: FluentNewspaper20Filled,
			title: "Media & Journalism",
			description: "Create newspapers, publish articles, and influence public opinion through investigative reporting.",
			wrapClass: "bg-[#f2b01e]/12 border border-[#f2b01e]/35",
			iconClass: "text-[#ffd35c]"
		}
	];

	const startingBenefits = [
		"1,000 currency to kickstart your journey",
		"Freedom to choose any region as your residence",
		"Ability to join existing parties or found your own",
		"Access to all economic and political features"
	];
</script>

<div class="max-w-4xl w-full space-y-8" in:fade={{ duration: 300 }}>
	<!-- Logo & Title -->
	<div class="text-center space-y-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div class="flex justify-center">
			<div class="size-24 bg-[#f2b01e]/12 border border-[#f2b01e]/35 rounded-sm flex items-center justify-center">
				<PsyopsLogo class="size-14 text-[#ffd35c]" />
			</div>
		</div>
		<h1 class="text-5xl font-bold text-[#f5efd8]">Welcome to PsyOps!</h1>
		<p class="text-xl text-[#d3caa9] max-w-2xl mx-auto">
			A political simulation game where you shape nations, build empires, and influence the world through strategy and
			diplomacy.
		</p>
	</div>

	<!-- Features Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4" in:fly={{ y: 20, duration: 500, delay: 200 }}>
		{#each features as feature, i}
			<div class="panel rounded-sm p-5 space-y-3" in:fly={{ y: 20, duration: 500, delay: 300 + i * 100 }}>
				<div class="size-12 {feature.wrapClass} rounded-sm flex items-center justify-center">
					<svelte:component this={feature.icon} class="size-6 {feature.iconClass}" />
				</div>
				<h3 class="section-title">{feature.title}</h3>
				<p class="text-sm text-[#d3caa9] leading-relaxed">{feature.description}</p>
			</div>
		{/each}
	</div>

	<!-- Call to Action -->
	<div class="text-center space-y-4" in:fly={{ y: 20, duration: 500, delay: 800 }}>
		<a href="/welcome/create" class={buttonClass({ variant: "primary", size: "lg" })}>
			<span class="text-lg">Create Your Profile</span>
			<FluentArrowRight20Filled class="size-5" />
		</a>
		<p class="text-sm text-[#a8a083]">Takes less than a minute • Complete your profile to unlock all features</p>
	</div>
</div>
