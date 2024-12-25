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
			
			
				border-1 hover:border-orange-600
			
			
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

	<div class="collapse collapse-arrow border-base-300 border">
		<input type="checkbox" />
		<div class="collapse-title text-md font-medium">Additional Information</div>
		<div class="collapse-content">
			<p>tabindex="0" attribute is necessary to make the div focusable</p>
		</div>
	</div>
</div>

<!-- todo: add additional info-->
