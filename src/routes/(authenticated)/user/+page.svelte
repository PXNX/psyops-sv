<script lang="ts">
	import { enhance } from "$app/forms";

	import type { PageData } from "./$types";

	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import FlatColorIconsShare from "~icons/flat-color-icons/share";

	export let data: PageData;

	let user_name = data.user.name;

	function shareLink(title: string, url = window.location.href) {
		if (navigator.share) {
			navigator
				.share({
					title: title,
					url: url
				})
				.then(() => {
					console.log("Thanks for sharing!");
				})
				.catch(console.error);
		} else {
			// fallback
		}
	}
</script>

<div
	class="flex justify-between bg-[url('https://source.unsplash.com/random.jpg?soldier')] bg-cover p-2 bg-linear-to-r/oklch from-indigo-500 to-teal-400"
>
	{#if data.user.picture}
		<div class="avatar">
			<div class="w-24 h-24 rounded-full">
				<img src={data.user.picture} />
			</div>
		</div>
	{:else}
		<div class="avatar placeholder">
			<div class="w-24 h-24 rounded-full bg-neutral text-neutral-content">
				<span class="text-3xl">NX</span>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-2 mt-auto">
		<button
			class="btn btn-ghost btn-circle"
			on:click={() => shareLink(user_name, window.location.href + "/{{ user_id }}")}
		>
			<FlatColorIconsShare />
		</button>

		<a href="/settings" class="btn btn-circle btn-ghost">
			<FluentEmojiGear />
		</a>
	</div>
</div>

<div class="mx-2 my-4 space-y-4">
	<div class="flex items-center justify-center w-full">
		<b class="text-xl">{user_name}</b>
		<div class="tooltip tooltip-left hover:tooltip-open" data-tip="Member of staff">
			<svg
				class="w-5 h-5 ms-1 stroke-primary hover:stroke-2"
				fill="none"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M23,12L20.48,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.48,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"
				/>
			</svg>
		</div>
	</div>

	<section class="p-2 mt-10 space-y-2 border rounded-lg select-bordered">
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/region/1">
			<img class="bg-cover rounded-lg" height="48" src="https://placehold.co/48/svg" width="48" />
			<div>
				<b class="block text-lg">Nendeln</b>
				<span class="text-primary">Current Region</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/region/2">
			<img class="bg-cover rounded-lg" height="48" src="https://placehold.co/48/svg" width="48" />
			<div>
				<b class="block text-lg">Baden-Württemberg</b>
				<span class="text-primary">Home Region</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
	</section>

	<section class="p-2 mt-10 space-y-2 border rounded-lg select-bordered">
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/team/1">
			<img class="bg-cover rounded-lg" height="48" src="https://placehold.co/48/svg" width="48" />
			<div>
				<b class="block text-lg">Wagner PMC</b>
				<span class="text-primary">Team</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/country/1">
			<img class="bg-cover rounded-lg" height="48" src="https://placehold.co/48/svg" width="48" />
			<div>
				<b class="block text-lg">German Reich</b>
				<span class="text-primary">Chancellor</span><span> 26.11.2023, 19:33</span>
			</div>
		</a>
	</section>

	<!-- todo: add additional info-->
</div>
