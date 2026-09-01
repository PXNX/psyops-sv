<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/staff/+page.svelte -->
<script lang="ts">
	import Logo from "$lib/component/Logo.svelte";
	import PageContainer from "$lib/component/PageContainer.svelte";
	import BackLink from "$lib/component/ui/BackLink.svelte";
	import Badge from "$lib/component/ui/Badge.svelte";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import MdiNewspaper from "~icons/mdi/newspaper";
	import MdiCrown from "~icons/mdi/crown";
	import MdiPencil from "~icons/mdi/pencil";
	import MdiAccount from "~icons/mdi/account";

	let { data } = $props();

	function getRoleIcon(role: string) {
		switch (role) {
			case "owner":
				return MdiCrown;
			case "editor":
				return MdiPencil;
			default:
				return MdiAccount;
		}
	}

	function getRoleTone(role: string) {
		switch (role) {
			case "owner":
				return "amber";
			case "editor":
				return "purple";
			case "author":
				return "blue";
			default:
				return "neutral";
		}
	}

	function formatRole(role: string) {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}
</script>

<PageContainer maxWidth="5xl">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<BackLink href="/newspaper/{data.newspaper.id}" />

		{#if data.newspaper.logoUrl}
			<div class="size-10 rounded-lg overflow-hidden flex-shrink-0">
				<img src={data.newspaper.logoUrl} alt={data.newspaper.name} class="w-full h-full object-cover" />
			</div>
		{:else}
			<div
				class="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0"
			>
				<MdiNewspaper class="size-5 text-white" />
			</div>
		{/if}

		<div class="min-w-0">
			<h1 class="text-xl font-bold text-white truncate">Staff Members</h1>
			<p class="text-sm text-gray-400 truncate">
				{data.newspaper.name} · {data.staff.length}
				{data.staff.length === 1 ? "member" : "members"}
			</p>
		</div>
	</div>

	{#if data.staff.length === 0}
		<div class="bg-slate-800/50 border border-white/5 rounded-xl p-12 text-center">
			<div class="inline-flex items-center justify-center size-16 rounded-full bg-slate-700/50 mb-4">
				<FluentPerson20Filled class="size-8 text-gray-500" />
			</div>
			<h4 class="text-lg font-semibold text-gray-300 mb-2">No staff members</h4>
			<p class="text-gray-400 text-sm">This newspaper doesn't have any staff members yet</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.staff as member}
				<a
					href="/user/{member.id}"
					class="group bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 hover:border-white/10 rounded-xl p-5 transition-all"
				>
					<div class="flex items-start gap-4">
						<!-- Avatar -->
						<Logo
							src={member.logoUrl}
							alt={member.name}
							class="size-14"
							placeholderIcon={FluentPerson20Filled}
							placeholderGradient="from-blue-500 to-purple-500"
						/>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<h3 class="font-bold text-white group-hover:text-blue-400 transition-colors truncate mb-2">
								{member.name}
							</h3>

							<Badge tone={getRoleTone(member.role)} icon={getRoleIcon(member.role)}>
								{formatRole(member.role)}
							</Badge>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</PageContainer>
