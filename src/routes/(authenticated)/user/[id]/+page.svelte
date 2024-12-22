<script lang="ts">
	import { enhance } from "$app/forms";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";

	import { shareLink } from "$lib/util";

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
			<CircleAvatar image_url={data.user.avatar} />
			<div>
				<h2 class="text-xl font-bold text-white">{data.user.name}</h2>
				<p class="text-sm">Minister of Education</p>
			</div>
		</div>
	</div>
</section>

<div class="m-2 space-y-2">
	<section class="p-1 space-y-2 rounded-lg bg-gradient-to-r via-yellow-600 from-orange-600 to-transparent">
		<a class="flex items-center justify-between gap-2 flinch label-text" href="/region/1">
			<div class="flex items-center space-x-3">
				<SquareAvatar image_url={"https://placehold.co/48/svg"} />

				<div>
					<p class="font-bold text-md capitalize">Wagner PMC</p>
					<p class="text-sm capitalize">Party • 15.11.2023, 04:20</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="w-5 h-5 text-orange-600" />
		</a>
	</section>

	<section class="p-1 space-y-2 rounded-lg bg-gradient-to-r via-blue-600 from-purple-600 to-transparent">
		<a class="flex items-center justify-between gap-2 flinch label-text" href="/region/1">
			<div class="flex items-center space-x-3">
				<SquareAvatar image_url={"https://placehold.co/48/svg"} />

				<div>
					<p class="font-bold text-md capitalize">German Reich</p>
					<p class="text-sm capitalize">Chancellor • 15.11.2023, 04:20</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="w-5 h-5 text-purple-600" />
		</a>
	</section>

	<section class="p-2 space-y-2 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg">
		<a class="flex items-center justify-between gap-2 flinch label-text" href="/region/1">
			<div class="flex items-center space-x-3">
				<SquareAvatar image_url={"https://placehold.co/48/svg"} />

				<div>
					<p class="font-medium text-sm">Nendeln</p>
					<p class="text-xs text-gray-300">Current • 15.11.2023, 04:20</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="w-5 h-5 text-white" />
		</a>

		<a class="flex items-center justify-between gap-2 flinch label-text" href="/region/2">
			<div class="flex items-center space-x-3">
				<SquareAvatar image_url={"https://pcclacehold.co/48/svdexsg"} />

				<div>
					<p class="font-medium text-sm">Baden-Württemberg</p>
					<p class="text-xs text-gray-300">Home • 26.11.2023, 04:20</p>
				</div>
			</div>
			<FluentChevronRight20Filled class="w-5 h-5 text-white" />
		</a>
	</section>

	<div class="flex justify-end space-x-2 p-1 w-full">
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
	</div>

	<div tabindex="0" class="collapse collapse-plus border-base-300 bg-base-200 border">
		<div class="collapse-title text-xl font-medium">Additional Information</div>
		<div class="collapse-content">
			<p>tabindex="0" attribute is necessary to make the div focusable</p>
		</div>
	</div>
</div>

<!-- todo: add additional info-->
