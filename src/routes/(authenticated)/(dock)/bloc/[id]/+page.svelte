<!-- src/routes/bloc/[id]/+page.svelte -->
<script lang="ts">
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPeopleTeam20Filled from "~icons/fluent/people-team-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentPersonAdd20Filled from "~icons/fluent/person-add-20-filled";
	import FluentCrown20Filled from "~icons/fluent/crown-20-filled";
	import FluentGlobeShield20Filled from "~icons/fluent/globe-shield-20-filled";
	import { enhance } from "$app/forms";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import Modal from "$lib/component/Modal.svelte";
	import ProfileItem from "$lib/component/ProfileItem.svelte";

	const { data, form } = $props();

	let showLeadershipModal = $state(false);
</script>

<svelte:head>
	<title>{data.bloc.name}</title>
	<meta name="description" content={data.bloc.description || `The ${data.bloc.name} alliance in PsyOps.`} />
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Hero Section -->
	<div class="relative">
		<div
			class="w-full rounded-sm p-8 flex flex-col items-center relative overflow-hidden border border-[#dfceb0]/15 shadow-2xl"
			style="background: linear-gradient(135deg, {data.bloc.color}20 0%, {data.bloc.color}40 100%);"
		>
			<div
				class="absolute inset-0 opacity-10"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, {data.bloc
					.color}20 35px, {data.bloc.color}20 70px);"
			></div>
			<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 rounded-sm"></div>

			<button
				type="button"
				class="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-2 bg-black/30 hover:bg-black/50 border border-[#dfceb0]/25 hover:border-[#dfceb0]/40 rounded-lg text-[#d9ccb7] hover:text-[#fff7e8] transition-all backdrop-blur-sm text-xs font-mono font-bold"
				onclick={() => (showLeadershipModal = true)}
			>
				<FluentPeopleTeam20Filled class="size-4" />
				Leadership
			</button>

			{#if data.isLeader}
				<a
					href="/bloc/{data.bloc.id}/edit"
					class="absolute top-3 right-3 z-20 p-2 bg-black/30 hover:bg-black/50 border border-[#dfceb0]/25 hover:border-[#dfceb0]/40 rounded-lg text-[#d9ccb7] hover:text-[#fff7e8] transition-all backdrop-blur-sm"
					title="Edit Bloc"
					aria-label="Edit Bloc"
				>
					<FluentEdit20Filled class="size-4" />
				</a>
			{:else if data.isMemberPresident}
				<form method="POST" action="?/leave" use:enhance class="absolute top-3 right-3 z-20">
					<button
						type="submit"
						class="p-2 bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 hover:border-red-400/50 rounded-lg text-red-300 hover:text-red-200 transition-all backdrop-blur-sm"
						title="Leave Bloc"
						aria-label="Leave Bloc"
					>
						<FluentDismiss20Filled class="size-4" />
					</button>
				</form>
			{/if}

			<div class="relative z-10 flex flex-col items-center space-y-3">
				<!-- Bloc Logo -->
				{#if data.bloc.logo}
					<div class="size-24 rounded-full overflow-hidden bg-[#102239]">
						<img src={data.bloc.logo} alt={data.bloc.name} class="w-full h-full object-cover" />
					</div>
				{:else}
					<div class="size-24 rounded-full bg-[#102239] flex items-center justify-center">
						<FluentFlag20Filled class="size-8 text-[#a89e8e]/60" />
					</div>
				{/if}

				<div class="text-center space-y-1">
					<h1 class="text-3xl font-bold text-[#fff7e8] tracking-tight">{data.bloc.name}</h1>
					<span class="text-xs text-[#a89e8e] font-mono uppercase tracking-wider">Alliance</span>
					{#if data.bloc.description}
						<p class="text-sm text-[#c7bda9] max-w-md mt-2">{data.bloc.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Error/Success -->
	{#if form?.error}
		<div class="bg-red-950/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 font-mono">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-300 font-mono">
			Bloc membership updated
		</div>
	{/if}

	<!-- Active Wars -->
	{#if data.activeWars.length > 0}
		<section class="space-y-2">
			{#each data.activeWars as war}
				<a
					href="/war/{war.id}"
					class="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-red-950/30 to-[#0c1929]/60 border border-red-500/25 rounded-sm p-4 hover:border-red-400/40 transition-all group"
				>
					<div class="relative flex-shrink-0">
						<div class="absolute inset-0 bg-red-500/20 blur-lg rounded-full animate-pulse"></div>
						<div
							class="relative size-10 sm:size-12 bg-red-950/60 rounded-sm border border-red-500/30 flex items-center justify-center"
						>
							<span class="text-xl sm:text-2xl">⚔️</span>
						</div>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-0.5">
							<div class="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
							<span class="text-[10px] text-red-400/70 font-mono uppercase tracking-widest">Active War</span>
						</div>
						<div class="text-sm text-[#c7bda9]">
							<span class="font-bold text-red-400">{war.attacker.name}</span>
							<span class="text-[#a89e8e] mx-1">vs</span>
							<span class="font-bold text-[#b7d0e6]">{war.defender.name}</span>
						</div>
						{#if war.activeBattles > 0}
							<span class="text-[10px] text-amber-400/70 font-mono mt-0.5 inline-block">
								{war.activeBattles} active {war.activeBattles === 1 ? "battle" : "battles"}
							</span>
						{/if}
					</div>
					<span class="text-[#a89e8e] group-hover:text-red-400 transition-colors">→</span>
				</a>
			{/each}
		</section>
	{/if}

	<!-- Member States -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold text-[#a89e8e] uppercase tracking-wider px-1">Member States</h2>
		<div class="panel-muted rounded-sm p-3 space-y-2">
			{#each data.memberStates as state}
				<ProfileItem
					href="/state/{state.id}"
					logo={state.logo}
					logoAlt={state.name}
					placeholderIcon={FluentGlobe20Filled}
					placeholderGradient="from-[#3a4d63] to-[#1e2f42]"
					title={state.name}
					subtitle="{state.population.toLocaleString()} population{state.president
						? ` • ${state.president.name}`
						: ''} • #{state.rating || '—'}"
					hoverColor="blue"
				/>
			{:else}
				<p class="text-sm text-[#a89e8e] text-center py-4">No member states yet</p>
			{/each}
		</div>
	</section>

	<!-- Join -->
	{#if data.canJoin}
		<section class="bg-[#14283f]/85 border rounded-sm p-4 sm:p-5" style="border-color: {data.bloc.color}30">
			<form method="POST" action="?/join" use:enhance>
				<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div class="flex-1">
						<span class="text-sm font-bold text-[#fff7e8]">Join this Bloc</span>
						{#if data.userState}
							<p class="text-xs text-[#a89e8e] font-mono mt-0.5">Join as president of {data.userState.name}</p>
						{/if}
					</div>
					<button
						type="submit"
						class="w-full sm:w-auto px-5 py-2.5 rounded-lg font-mono font-bold text-sm text-white transition-all flex items-center justify-center gap-2 hover:brightness-110"
						style="background-color: {data.bloc.color}"
					>
						<FluentPersonAdd20Filled class="size-4" />
						Join
					</button>
				</div>
			</form>
		</section>
	{/if}
</PageContainer>

<!-- Leadership Modal -->
<Modal bind:open={showLeadershipModal} title="{data.bloc.name} Leadership">
	<div class="space-y-4">
		{#if data.leader}
			<ProfileItem
				href="/user/{data.leader.userId}"
				logo={data.leader.logo}
				logoAlt={data.leader.name}
				placeholderIcon={FluentCrown20Filled}
				placeholderGradient="from-amber-600/20 to-amber-700/10"
				title={data.leader.name}
				subtitle="Bloc Leader"
				hoverColor="yellow"
			/>
		{:else}
			<p class="text-sm text-[#a89e8e]">No bloc leader has been appointed yet.</p>
		{/if}

		{#if data.diplomats.length > 0}
			<div class="space-y-2 pt-2 border-t border-[#dfceb0]/10">
				<h3 class="text-xs font-semibold text-[#a89e8e] uppercase tracking-wider">Diplomats</h3>
				{#each data.diplomats as diplomat}
					<ProfileItem
						href="/user/{diplomat.userId}"
						logo={diplomat.logo}
						logoAlt={diplomat.name}
						placeholderIcon={FluentGlobeShield20Filled}
						placeholderGradient="from-[#315d8d]/20 to-[#315d8d]/10"
						title={diplomat.name}
						subtitle="Diplomat"
						hoverColor="blue"
					/>
				{/each}
			</div>
		{/if}
	</div>
</Modal>
