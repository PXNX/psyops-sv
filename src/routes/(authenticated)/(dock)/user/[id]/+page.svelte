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

<div class="m-2 space-y-2">
	<div
		class="w-full max-w-md bg-gray-900 rounded-lg p-6 mb-8 flex flex-col items-center relative overflow-hidden border border-gray-800"
		style="background-image: url('https://placehold.co/600x200/1e293b/ffffff?text=RPG+Worldscape'); background-size: cover; background-position: center;"
	>
		<div class="absolute inset-0 bg-black opacity-60 rounded-lg"></div>
		<div class="relative z-10 flex flex-col items-center space-y-1">
			<CircleAvatar src={data.user.avatar} />
			<h1 class="text-2xl font-extrabold text-white mt-2 tracking-tight">{data.user.name}</h1>
			<pre class="text-sm text-gray-400 opacity-80" id="userid">#{data.user.id}</pre>
		</div>
	</div>

	<section class="flex space-x-2 w-full justify-around items-center">
		{#if data.user.id !== data.account.id}
			<a
				class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200"
				href="/chat/u/{data.user.id}"
			>
				<FluentChat20Filled class="size-8" />
			</a>

			<button
				class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200"
				onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
			>
				<FluentGiftCardArrowRight20Filled class="size-8" />
			</button>

			<button
				class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200"
				onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
			>
				<MdiNewspaperPlus class="size-8" /> Add as author
			</button>
		{/if}

		<button
			class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200"
			onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
		>
			<FluentShareAndroid20Filled class="size-8" />
		</button>

		{#if data.user.id === data.account.id}
			<a href="/settings" class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200">
				<FluentSettingsCogMultiple20Filled class="size-8" />
			</a>
		{:else}
			<button
				class="btn btn-ghost text-gray-400 hover:text-white transition-colors duration-200"
				onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
			>
				<FluentAccessibilityError20Filled class="size-8" />
			</button>
		{/if}
	</section>

	<section class="  w-full text-gray-200">
		<ProfileItem
			name={"Munich"}
			description={"Current"}
			date={new Date()}
			avatar={"https://placehold.co/48/svg"}
			href={"/region/" + data.user.id}
			Component={FluentClockToolbox20Filled}
			bgColor={"bg-purple-600"}
		/>

		<ProfileItem
			name={"Berlin"}
			description={"Residence"}
			date={new Date()}
			avatar={"https://placehold.co/48/svg"}
			href={"/region/" + data.user.id}
			Component={FluentClockToolbox20Filled}
			bgColor={"bg-purple-600"}
		/>
	</section>

	<section class="w-full mt-2">
		<ProfileItem
			name={"Order of the Phoenix"}
			description={"Nationalist"}
			date={new Date()}
			avatar={"https://placehold.co/48/svg"}
			href={"/party/" + data.user.id}
			Component={FluentClockToolbox20Filled}
			bgColor={"bg-purple-600"}
		/>

		<ProfileItem
			name={"Minister of Education"}
			description={"State of Khaan"}
			date={new Date()}
			avatar={"https://placehold.co/48/svg"}
			href={"/state/" + data.user.id}
			Component={FluentClockToolbox20Filled}
			bgColor={"bg-purple-600"}
		/>

		<a
			href="/user/{data.user.id}/career"
			role="button"
			class="btn btn-ghost w-full flex items-center justify-center text-purple-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors duration-200 text-sm font-semibold"
		>
			Show Career Timeline
		</a>
	</section>

	<span class="font-medium mb-1">Account created: 2021-03-20</span>

	<!-- todo: add additional info-->
</div>

<!-- todo: add additional info-->
