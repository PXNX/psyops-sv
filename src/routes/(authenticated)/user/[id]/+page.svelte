<script lang="ts">
	import { enhance } from "$app/forms";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";

	import { shareLink } from "$lib/util";

	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";

	const { data } = $props();
</script>

<section
	class="h-40 bg-cover bg-center relative bg-[url('https://img.freepik.com/fotos-kostenlos/ein-gemaelde-eines-bergsees-mit-einem-berg-im-hintergrund_188544-9126.jpg')]"
>
	<div class="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 opacity-80">
		<div class="absolute left-4 bottom-2 flex items-center space-x-3">
			<CircleAvatar image_url={data.user.avatar} />
			<div>
				<h2 class="text-xl font-bold text-white">{data.user.name}</h2>
				<p class="text-xs text-gray-300">Minister of Education</p>
			</div>
		</div>
	</div>
</section>

<div class="m-2 mt-4 space-y-2">
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

	<section class="p-2 mt-10 space-y-2 border rounded-lg select-bordered">
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/party/1">
			<SquareAvatar image_url={"https://placehold.co/48/svg"} />
			<div>
				<b class="block text-lg">Wagner PMC</b>
				<span class="text-primary">Team</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/state/1">
			<SquareAvatar image_url={"https://placehold.co/48/svg"} />
			<div>
				<b class="block text-lg">German Reich</b>
				<span class="text-primary">Chancellor</span><span> 26.11.2023, 19:33</span>
			</div>
		</a>
	</section>

	<div class="flex justify-end space-x-2 p-1 w-full">
		<button
			class="btn btn-ghost btn-circle"
			onclick={() => shareLink(data.user.name, window.location.href + "/" + data.user.id)}
		>
			<FluentShareAndroid20Filled />
		</button>

		{#if data.user.id === data.account.id}
			<a href="/settings" class="btn btn-circle btn-ghost">
				<FluentEmojiGear />
			</a>
		{/if}
	</div>
</div>

<!-- todo: add additional info-->
