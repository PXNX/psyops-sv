<!-- src/routes/(authenticated)/(fullscreen)/welcome/+page.svelte -->
<script lang="ts">
	import PsyopsLogo from "$lib/assets/logo.svg";
	import { fade, fly } from "svelte/transition";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentNewspaper20Filled from "~icons/fluent/news-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";

	const features = [
		{
			icon: FluentBuildingGovernment20Filled,
			title: "Join or Create a State",
			description:
				"Choose your region, participate in governance, and help shape laws and policies through democratic processes.",
			color: "from-blue-600 to-indigo-600"
		},
		{
			icon: FluentPeople20Filled,
			title: "Political Parties & Elections",
			description: "Found your own party, recruit members, and compete in elections to gain seats in parliament.",
			color: "from-purple-600 to-pink-600"
		},
		{
			icon: FluentFactory20Filled,
			title: "Economic System",
			description: "Build companies, manage factories, trade resources, and develop a thriving economy.",
			color: "from-green-600 to-emerald-600"
		},
		{
			icon: FluentNewspaper20Filled,
			title: "Media & Journalism",
			description: "Create newspapers, publish articles, and influence public opinion through investigative reporting.",
			color: "from-orange-600 to-red-600"
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
			<div
				class="size-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/20"
			>
				<PsyopsLogo class="size-14 text-white" />
			</div>
		</div>
		<h1 class="text-5xl font-bold text-white">Welcome to PsyOps!</h1>
		<p class="text-xl text-gray-400 max-w-2xl mx-auto">
			A political simulation game where you shape nations, build empires, and influence the world through strategy and
			diplomacy.
		</p>
	</div>

	<!-- Features Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4" in:fly={{ y: 20, duration: 500, delay: 200 }}>
		{#each features as feature, i}
			<div
				class="bg-slate-800/50 border border-white/5 rounded-xl p-6 space-y-3 hover:bg-slate-800/70 transition-all duration-300 hover:scale-[1.02]"
				in:fly={{ y: 20, duration: 500, delay: 300 + i * 100 }}
			>
				<div class="size-12 bg-gradient-to-br {feature.color} rounded-xl flex items-center justify-center">
					<svelte:component this={feature.icon} class="size-6 text-white" />
				</div>
				<h3 class="text-lg font-semibold text-white">{feature.title}</h3>
				<p class="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
			</div>
		{/each}
	</div>

	<!-- Starting Benefits -->
	<div
		class="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6 space-y-4"
		in:fly={{ y: 20, duration: 500, delay: 700 }}
	>
		<div class="flex items-center gap-3">
			<div class="size-12 bg-green-600/30 rounded-xl flex items-center justify-center">
				<FluentMoney20Filled class="size-6 text-green-400" />
			</div>
			<div>
				<h3 class="text-xl font-bold text-white">Your Starting Package</h3>
				<p class="text-sm text-green-300">Everything you need to begin your political career</p>
			</div>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each startingBenefits as benefit}
				<div class="flex items-start gap-2">
					<FluentCheckmark20Filled class="size-5 text-green-400 shrink-0 mt-0.5" />
					<p class="text-sm text-gray-200">{benefit}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Call to Action -->
	<div class="text-center space-y-4" in:fly={{ y: 20, duration: 500, delay: 800 }}>
		<a
			href="/welcome/create"
			class="btn btn-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-white gap-2 shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 transition-all"
		>
			<span class="text-lg">Create Your Profile</span>
			<FluentArrowRight20Filled class="size-5" />
		</a>
		<p class="text-sm text-gray-500">Takes less than a minute • Complete your profile to unlock all features</p>
	</div>
</div>
