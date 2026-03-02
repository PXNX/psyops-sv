<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/staff/+page.svelte -->
<script lang="ts">
	import Logo from "$lib/component/Logo.svelte";
	import FluentPerson20Filled from "~icons/fluent/person-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
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
			case "author":
				return MdiAccount;
			default:
				return MdiAccount;
		}
	}

	function getRoleColor(role: string) {
		switch (role) {
			case "owner":
				return "text-yellow-400";
			case "editor":
				return "text-purple-400";
			case "author":
				return "text-blue-400";
			default:
				return "text-gray-400";
		}
	}

	function getRoleBadgeColor(role: string) {
		switch (role) {
			case "owner":
				return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
			case "editor":
				return "bg-purple-500/20 text-purple-400 border-purple-500/30";
			case "author":
				return "bg-blue-500/20 text-blue-400 border-blue-500/30";
			default:
				return "bg-gray-500/20 text-gray-400 border-gray-500/30";
		}
	}

	function formatRole(role: string) {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}
</script>

<!-- Header -->
<div class="bg-slate-800/50 border-b border-white/5 p-4 sticky top-0 z-10 backdrop-blur-sm">
	<div class="max-w-5xl mx-auto flex items-center gap-4">
		<a href="/newspaper/{data.newspaper.id}" class="btn btn-ghost btn-circle">
			<FluentArrowLeft20Filled class="size-5" />
		</a>

		<div class="flex items-center gap-3 flex-1 min-w-0">
			{#if data.newspaper.logoUrl}
				<div class="size-10 rounded-lg overflow-hidden ring-2 ring-white/10 flex-shrink-0">
					<img src={data.newspaper.logoUrl} alt={data.newspaper.name} class="w-full h-full object-cover" />
				</div>
			{:else}
				<div class="size-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-white/10 flex-shrink-0">
					<MdiNewspaper class="size-5 text-white" />
				</div>
			{/if}

			<div class="min-w-0">
				<h1 class="text-lg font-bold text-white truncate">{data.newspaper.name}</h1>
				<p class="text-sm text-gray-400">Staff Members</p>
			</div>
		</div>
	</div>
</div>

<!-- Staff List -->
<div class="max-w-5xl mx-auto px-6 py-6">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-white mb-2">Staff Members</h2>
		<p class="text-gray-400">
			{data.staff.length} {data.staff.length === 1 ? "member" : "members"} working at this newspaper
		</p>
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

							<!-- Role Badge -->
							<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium {getRoleBadgeColor(member.role)}">
								<svelte:component this={getRoleIcon(member.role)} class="size-3.5" />
								{formatRole(member.role)}
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>

		<!-- Role Legend -->
		<div class="mt-8 bg-slate-800/30 border border-white/5 rounded-xl p-6">
			<h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Staff Roles</h3>
			<div class="grid gap-4 sm:grid-cols-3">
				<!-- Owner -->
				<div class="flex items-start gap-3">
					<div class="size-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
						<MdiCrown class="size-5 text-yellow-400" />
					</div>
					<div>
						<p class="font-semibold text-yellow-400 text-sm">Owner</p>
						<p class="text-xs text-gray-400 leading-relaxed">Full control over the newspaper</p>
					</div>
				</div>

				<!-- Editor -->
				<div class="flex items-start gap-3">
					<div class="size-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
						<MdiPencil class="size-5 text-purple-400" />
					</div>
					<div>
						<p class="font-semibold text-purple-400 text-sm">Editor</p>
						<p class="text-xs text-gray-400 leading-relaxed">Can manage articles and content</p>
					</div>
				</div>

				<!-- Author -->
				<div class="flex items-start gap-3">
					<div class="size-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
						<MdiAccount class="size-5 text-blue-400" />
					</div>
					<div>
						<p class="font-semibold text-blue-400 text-sm">Author</p>
						<p class="text-xs text-gray-400 leading-relaxed">Can write and publish articles</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
