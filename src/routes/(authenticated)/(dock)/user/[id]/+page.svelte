<script lang="ts">
	import { enhance } from "$app/forms";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";

	import { shareLink } from "$lib/util";
	import ProfileItem from "$lib/component/ProfileItem.svelte";

	import FluentSettingsCogMultiple20Filled from "~icons/fluent/settings-cog-multiple-20-filled";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAccessibilityError20Filled from "~icons/fluent/accessibility-error-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import FluentClockToolbox20Filled from "~icons/fluent/clock-toolbox-20-filled";
	const { data } = $props();
</script>

<section
	class="h-40 bg-cover bg-center relative bg-[url('https://img.freepik.com/fotos-kostenlos/ein-gemaelde-eines-bergsees-mit-einem-berg-im-hintergrund_188544-9126.jpg')]"
>
	<div class="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900">
		<div class="absolute left-4 bottom-2 flex items-center space-x-3">
			<CircleAvatar src={data.user.avatar} />
			<div>
				<h2 class="text-xl font-bold text-white">{data.user.name}</h2>
				<p class="text-sm">Minister of Education</p>
			</div>
		</div>
	</div>
</section>

<div class="m-2 space-y-2">
	<section class="grid grid-cols-2 gap-2">
		<a
			class="h-18 bg-cover
			
					border-1 hover:border-purple-600
			
			
			border-black
			
			bg-center flinch rounded-lg overflow-clip relative bg-[url('https://img.freepik.com/fotos-kostenlos/ein-gemaelde-eines-bergsees-mit-einem-berg-im-hintergrund_188544-9126.jpg')]"
			href="/state/1"
		>
			<div class="absolute inset-0 bg-gradient-to-r from-slate-800 to-black text-c-600 opacity-75"></div>

			<div class=" absolute inset-0 p-2 w-full flex items-center space-x-2 justify-between">
				<div>
					<p class="font-bold text-md capitalize">German Reich</p>
					<p class="text-sm capitalize">Chancellor</p>
				</div>

				<FluentChevronRight20Filled class="size-5 text-purple-600" />
			</div>
		</a>

		<a
			class="h-18
			
			
				border-l-2 hover:border-orange-600
			
			
			border-black
			
			bg-cover bg-center flinch rounded-lg overflow-clip relative bg-[url('https://bilder.deutschlandfunk.de/6b/41/01/d6/6b4101d6-1b80-486b-b085-e97f6d927167/wagner-110-1920x1080.jpg')]"
			href="/state/1"
		>
			<div class="absolute inset-0 bg-gradient-to-r from-slate-800 to-black text-purple-orange opacity-75"></div>

			<div class=" absolute inset-0 p-2 w-full flex items-center space-x-2 justify-between">
				<div>
					<p class="font-bold text-md capitalize">Wagner PMC</p>
					<p class="text-sm capitalize">Party</p>
				</div>

				<FluentChevronRight20Filled class="size-5 text-orange-600" />
			</div>
		</a>
	</section>

	<section class="p-1 space-y-2 rounded-lg bg-green-400">
		<a class="flex items-center justify-between gap-2 flinch label-text" href="/region/1">
			<div class="flex items-center space-x-3">
				<SquareAvatar src={"https://placehold.co/48/svggfd"} />

				<div>
					<p class="font-bold text-md capitalize">Baden-Württemberg</p>
					<p class="text-sm font-bold capitalize">State of Kaan</p>
					<p class="text-sm capitalize">Current • 15.11.2023, 04:20</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="size-5 text-green-600" />
		</a>
		<a class="flex items-center justify-between gap-2 flinch label-text" href="/region/1">
			<div class="flex items-center space-x-3">
				<SquareAvatar src={"https://placehold.co/48/svg"} />

				<div>
					<p class="font-bold text-md capitalize">Baden-Württemberg</p>
					<p class="text-sm font-bold capitalize">State of Kaan</p>
					<p class="text-sm capitalize">Home • 15.11.2023, 04:20</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="size-5 text-green-600" />
		</a>
	</section>

	<ProfileItem
		name={"Minister of Education"}
		description={"Chancellor"}
		avatar={"https://placehold.co/48/svg"}
		href={"/state/" + data.user.id}
		bgColor={"bg-purple-600"}
	/>

	<section class="flex justify-end space-x-2 p-1 w-full">
		{#if data.user.id !== data.account.id}
			<button
				class="btn btn-ghost btn-circle"
				onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
			>
				<FluentChat20Filled />
			</button>

			<button
				class="btn btn-ghost btn-circle"
				onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
			>
				<FluentGiftCardArrowRight20Filled />
			</button>

			<button class="btn btn-sm" onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}>
				<MdiNewspaperPlus /> Add as author
			</button>
		{/if}

		<button
			class="btn btn-ghost btn-circle"
			onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
		>
			<FluentShareAndroid20Filled />
		</button>

		{#if data.user.id === data.account.id}
			<a href="/settings" class="btn btn-circle btn-ghost">
				<FluentSettingsCogMultiple20Filled />
			</a>
		{:else}
			<button
				class="btn btn-ghost btn-circle"
				onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
			>
				<FluentAccessibilityError20Filled />
			</button>
		{/if}
	</section>

	<div class=" border-l-2 border-purple-500 rounded-lg p-3 flex flex-row">
		<div class=" space-y-2 flex-1 w-auto">
			<h3 class="font-semibold text-purple-500">Minister of Finance</h3>
			<p class="text-xs text-gray-400"><a href="/settings">state of kaan</a> • 2023</p>
		</div>

		<div class="collapse collapse-arrow">
			<input type="checkbox" />

			<h3 class="collapse-title text-white text-md">Former positions</h3>

			<div class="collapse-content text-sm text-gray-300 space-y-2">
				<h4 class="text-md font-normal items-center text-purple-300">bavarian empire</h4>
				<ul class=" space-y-1 ml-2">
					<li>• Minister of Finance (2023-2023)</li>
					<li>• Deputy Minister of Trade (2021-2023)</li>
					<li>• Parliamentary Secretary (2019-2021)</li>
				</ul>

				<h4 class="text-md font-normal items-center text-purple-300 mt-6">austrian empire</h4>
				<ul class=" space-y-1 ml-2">
					<li>• Minister of Finance (2023-2023)</li>
					<li>• Deputy Minister of Trade (2021-2023)</li>
					<li>• Parliamentary Secretary (2019-2021)</li>
				</ul>
				<!-- todo: group it by state -->
			</div>
		</div>
	</div>

	<a href="/settings"
		><div class=" border-l-2 border-purple-500 rounded-lg p-3 flex flex-row">
			<SquareAvatar src={"https://placehold.co/48/svggfd"} />

			<div class=" space-y-1">
				<h3 class="font-semibold text-purple-500">Minister of Finance</h3>
				<p class="text-xs text-gray-400">state of kaan • 2023</p>
			</div>
		</div></a
	>

	<div class=" border-l-2 border-purple-500 rounded-lg p-1 flex flex-row">
		<h3 class="text-white text-md">Political career</h3>

		<div class=" space-y-2 flex-1 w-auto">
			<h3 class="font-semibold text-purple-500">Minister of Finance</h3>
			<p class="text-xs text-gray-400"><a href="/settings">state of kaan</a> • 2023</p>
		</div>

		<div class="collapse collapse-arrow">
			<input type="checkbox" />

			<div class="collapse-content text-sm text-gray-300 space-y-2">
				<h4 class="text-md font-normal items-center text-purple-300">bavarian empire</h4>
				<ul class=" space-y-1 ml-2">
					<li>• Minister of Finance (2023-2023)</li>
					<li>• Deputy Minister of Trade (2021-2023)</li>
					<li>• Parliamentary Secretary (2019-2021)</li>
				</ul>

				<h4 class="text-md font-normal items-center text-purple-300 mt-6">austrian empire</h4>
				<ul class=" space-y-1 ml-2">
					<li>• Minister of Finance (2023-2023)</li>
					<li>• Deputy Minister of Trade (2021-2023)</li>
					<li>• Parliamentary Secretary (2019-2021)</li>
				</ul>
				<!-- todo: group it by state -->
			</div>
		</div>
	</div>

	<div class="collapse collapse-arrow border-base-300 border">
		<input type="checkbox" />
		<div class="collapse-title text-md font-medium">Additional Information</div>
		<div class="collapse-content">
			<p>tabindex="0" attribute is necessary to make the div focusable</p>
		</div>
	</div>

	<div
		class="w-full max-w-md bg-gray-900 rounded-lg shadow-xl p-6 mb-8 flex flex-col items-center relative overflow-hidden border border-gray-800"
		style="background-image: url('https://placehold.co/600x200/1e293b/ffffff?text=RPG+Worldscape'); background-size: cover; background-position: center;"
	>
		<div class="absolute inset-0 bg-black opacity-60 rounded-lg"></div>
		<div class="relative z-10 flex flex-col items-center">
			<div class="relative w-28 h-28 rounded-full overflow-hidden border-2 border-purple-500 shadow-md mb-4">
				<img
					src="https://placehold.co/150x150/6d28d9/ffffff?text=AVATAR"
					alt="User Avatar"
					class="w-full h-full object-cover"
				/>
			</div>
			<h1 class="text-4xl font-extrabold text-white mb-2 tracking-tight">HeroicAdventurer</h1>
		</div>
	</div>

	<div class="w-full max-w-md mb-8 flex justify-around items-center p-3">
		<a href="" class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-message-square"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
		</a>
		<a href="" class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-gift"
				><polyline points="20 12 12 12 12 20" /><path
					d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"
				/><path d="M12 20v-8h8" /></svg
			>
		</a>
		<a href="" class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-settings"
				><path
					d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.04.02a2 2 0 0 1 .97 1.34V12a2 2 0 0 0 0 1.27 2 2 0 0 1-.97 1.34l-.04.02a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.04-.02a2 2 0 0 1-.97-1.34V12a2 2 0 0 0 0-1.27 2 2 0 0 1 .97-1.34l.04-.02a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
				/><circle cx="12" cy="12" r="3" /></svg
			>
		</a>
	</div>

	<div class="w-full max-w-md mb-8 rounded-lg overflow-hidden border border-gray-800">
		<div class="p-4 border-b border-gray-800">
			<div class="space-y-4">
				<a href="" class="detail-item">
					<div class="detail-item-icon-wrapper">
						<img
							src="https://placehold.co/50x50/ff7f50/ffffff?text=R"
							alt="Region Icon"
							class="w-full h-full rounded-full object-cover"
						/>
					</div>
					<div class="detail-item-text-container">
						<p class="text-base font-medium text-gray-200">Mystic Peaks</p>
						<p class="text-xs text-gray-500">Since 2023-01-15</p>
					</div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-map-pin lucide-icon"
						><path d="M12 18.3a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" /><path
							d="M12 2C7.5 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-3.5-8-8-8z"
						/></svg
					>
				</a>

				<a href="" class="detail-item">
					<div class="detail-item-icon-wrapper">
						<img
							src="https://placehold.co/50x50/4682b4/ffffff?text=H"
							alt="Home Icon"
							class="w-full h-full rounded-full object-cover"
						/>
					</div>
					<div class="detail-item-text-container">
						<p class="text-base font-medium text-gray-200">Dragon's Roost Inn</p>
						<p class="text-xs text-gray-500">Current Residence</p>
					</div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-home lucide-icon"
						><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg
					>
				</a>
			</div>
		</div>

		<div class="p-4">
			<div class="space-y-4">
				<a href="" class="detail-item">
					<div class="detail-item-icon-wrapper">
						<img
							src="https://placehold.co/50x50/8a2be2/ffffff?text=P"
							alt="Party Logo"
							class="w-full h-full rounded-full object-cover"
						/>
					</div>
					<div class="detail-item-text-container">
						<p class="text-base font-medium text-gray-200">Order of the Phoenix</p>
						<p class="text-xs text-gray-500">Member since 2022-07-01</p>
					</div>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-users lucide-icon"
						><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path
							d="M22 21v-2a4 4 0 0 0-3-3.87"
						/><path d="M6 17a4 4 0 0 1-3-3.87" /></svg
					>
				</a>

				<a href="" class="detail-item">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-briefcase lucide-icon mr-3"
						><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path
							d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
						/></svg
					>
					<div class="detail-item-text-container">
						<p class="text-base font-medium text-gray-200">Grand Strategist</p>
						<p class="text-xs text-gray-500">in Royal Council since 2024-02-10</p>
					</div>
				</a>

				<a
					href=""
					onclick={() => {}}
					class="w-full flex items-center justify-center p-3 mt-4 text-purple-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors duration-200 text-sm font-semibold"
				>
					Show Career Timeline
				</a>
			</div>
		</div>
	</div>

	<div class="w-full max-w-md mb-8 grid grid-cols-2 gap-4 text-gray-400 text-sm">
		<div class="flex flex-col items-center p-3 rounded-lg border border-gray-800 bg-gray-900">
			<span class="font-medium mb-1">User ID:</span>
			<span>1a2b3c4d5e6f7g8h9i0j</span>
		</div>
		<div class="flex flex-col items-center p-3 rounded-lg border border-gray-800 bg-gray-900">
			<span class="font-medium mb-1">Account created:</span>
			<span>2021-03-20</span>
		</div>
	</div>

	<!-- todo: aaaaaaaaaa-->

	<div
		class="w-full max-w-md bg-gray-900 rounded-lg shadow-xl p-6 mb-8 flex flex-col items-center relative overflow-hidden border border-gray-800"
		style="background-image: url('https://placehold.co/600x200/1e293b/ffffff?text=RPG+Worldscape'); background-size: cover; background-position: center;"
	>
		<div class="absolute inset-0 bg-black opacity-60 rounded-lg"></div>
		<div class="relative z-10 flex flex-col items-center">
			<div class="relative w-28 h-28 rounded-full overflow-hidden border-2 border-purple-500 shadow-md mb-4">
				<img
					src="https://placehold.co/150x150/6d28d9/ffffff?text=AVATAR"
					alt="User Avatar"
					class="w-full h-full object-cover"
				/>
			</div>
			<h1 class="text-2xl font-extrabold text-white mb-2 tracking-tight">HeroicAdventurer</h1>
			<p class="text-sm text-gray-400 opacity-80" id="userid">ID: 1a2b3c4d5e6f7g8h9i0j</p>
		</div>
	</div>

	<div class="w-full max-w-md mb-8 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
		<ul class="menu p-4 w-full text-gray-200">
			<li>
				<h2 class="menu-title text-gray-400 uppercase tracking-wider text-sm font-semibold mb-2">Location & Home</h2>
				<ul>
					<li>
						<a href="#" class="flex items-center hover:bg-gray-800 rounded-md py-2 px-3">
							<div
								class="w-8 h-8 rounded-full overflow-hidden mr-3 border border-gray-700 flex items-center justify-center flex-shrink-0"
							>
								<img
									src="https://placehold.co/50x50/ff7f50/ffffff?text=R"
									alt="Region Icon"
									class="w-full h-full object-cover"
								/>
							</div>
							<div class="flex-1">
								<p class="text-base font-medium">Mystic Peaks</p>
								<p class="text-xs text-gray-500">Since 2023-01-15</p>
							</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-gray-600 ml-3"
								><path d="M12 18.3a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" /><path
									d="M12 2C7.5 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-3.5-8-8-8z"
								/></svg
							>
						</a>
					</li>
					<li>
						<a href="#" class="flex items-center hover:bg-gray-800 rounded-md py-2 px-3">
							<div
								class="w-8 h-8 rounded-full overflow-hidden mr-3 border border-gray-700 flex items-center justify-center flex-shrink-0"
							>
								<img
									src="https://placehold.co/50x50/4682b4/ffffff?text=H"
									alt="Home Icon"
									class="w-full h-full object-cover"
								/>
							</div>
							<div class="flex-1">
								<p class="text-base font-medium">Dragon's Roost Inn</p>
								<p class="text-xs text-gray-500">Current Residence</p>
							</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-gray-600 ml-3"
								><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
									points="9 22 9 12 15 12 15 22"
								/></svg
							>
						</a>
					</li>
				</ul>
			</li>

			<li class="mt-4">
				<h2 class="menu-title text-gray-400 uppercase tracking-wider text-sm font-semibold mb-2">Political Standing</h2>
				<ul>
					<li>
						<a href="#" class="flex items-center hover:bg-gray-800 rounded-md py-2 px-3">
							<div
								class="w-8 h-8 rounded-full overflow-hidden mr-3 border border-gray-700 flex items-center justify-center flex-shrink-0"
							>
								<img
									src="https://placehold.co/50x50/8a2be2/ffffff?text=P"
									alt="Party Logo"
									class="w-full h-full rounded-full object-cover"
								/>
							</div>
							<div class="flex-1">
								<p class="text-base font-medium">Order of the Phoenix</p>
								<p class="text-xs text-gray-500">Member since 2022-07-01</p>
							</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-gray-600 ml-3"
								><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path
									d="M22 21v-2a4 4 0 0 0-3-3.87"
								/><path d="M6 17a4 4 0 0 1-3-3.87" /></svg
							>
						</a>
					</li>
					<li>
						<a href="#" class="flex items-center hover:bg-gray-800 rounded-md py-2 px-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-gray-600 mr-3"
								><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path
									d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
								/></svg
							>
							<div class="flex-1">
								<p class="text-base font-medium">Grand Strategist</p>
								<p class="text-xs text-gray-500">in Royal Council since 2024-02-10</p>
							</div>
						</a>
					</li>
					<li>
						<a
							href="#political_career_modal"
							role="button"
							class="btn btn-ghost w-full flex items-center justify-center p-3 mt-4 text-purple-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors duration-200 text-sm font-semibold"
						>
							Show Career Timeline
						</a>
					</li>
				</ul>
			</li>
		</ul>
	</div>

	<div class="w-full max-w-md mb-8 grid grid-cols-2 gap-4 text-gray-400 text-sm">
		<div class="flex flex-col items-start p-3">
			<span class="font-medium mb-1">Account created:</span>
			<span>2021-03-20</span>
		</div>
	</div>

	<div
		class="actions-bar fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-800 flex justify-around items-center p-4 rounded-t-lg shadow-lg border-t border-gray-700 z-50"
	>
		<a
			href="#"
			class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200 flex-1 flex flex-col items-center"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-message-square"
				><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
			>
			<span class="text-xs mt-1">Message</span>
		</a>
		<a
			href="#"
			class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200 flex-1 flex flex-col items-center"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-gift"
				><polyline points="20 12 12 12 12 20" /><path
					d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"
				/><path d="M12 20v-8h8" /></svg
			>
			<span class="text-xs mt-1">Gift</span>
		</a>
		<a
			href="#"
			class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200 flex-1 flex flex-col items-center"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-settings"
				><path
					d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.04.02a2 2 0 0 1 .97 1.34V12a2 2 0 0 0 0 1.27 2 2 0 0 1-.97 1.34l-.04.02a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.04-.02a2 2 0 0 1-.97-1.34V12a2 2 0 0 0 0-1.27 2 2 0 0 1 .97-1.34l.04-.02a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
				/><circle cx="12" cy="12" r="3" /></svg
			>
			<span class="text-xs mt-1">Settings</span>
		</a>
	</div>

	<!-- todo: add additional info-->
</div>

<!-- todo: add additional info-->
