<script lang="ts">
	import { enhance } from "$app/forms";
	import Icon from "@iconify/svelte";

	import type { PageData } from "./$types";

	export let data: PageData;

	import FluentEmojiGear from "~icons/fluent-emoji/gear";

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
	class=" p-2 flex bg-cover justify-between bg-[url('https://victorypark.com.ua/wp-content/uploads/2023/04/banner_azov.jpeg')]"
>
	{#if data.user.picture}
		<div class="avatar">
			<div class="w-24 rounded-full">
				<img src={data.user.picture} />
			</div>
		</div>
	{:else}
		<div class="avatar placeholder">
			<div class="w-24 rounded-full bg-neutral text-neutral-content">
				<span class="text-3xl">D</span>
			</div>
		</div>
	{/if}
</div>

<div class="mx-2 mt-6 space-y-4">
	<div class="flex items-center justify-center w-full">
		<b class="text-2xl">{user_name}</b>
		<div class="tooltip hover:tooltip-open tooltip-left" data-tip="Member of staff">
			<svg
				class="w-5 h-5 ms-1 stroke-primary hover:stroke-2"
				fill="none"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"
				/>
			</svg>
		</div>
	</div>

	<section class="p-2 mt-10 space-y-2 border rounded-lg border-fuchsia-900">
		<a class="flex flex-row w-full gap-2 btn label-text">
			<img class="bg-cover rounded-lg" height="56" src="https://placehold.co/56/svg" width="56" />
			<div>
				<b class="block text-lg">Nendeln</b>
				<span class=" text-primary">Current Region</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
		<a class="flex flex-row w-full gap-2 flinch label-text">
			<img class="bg-cover rounded-lg" height="56" src="https://placehold.co/56/svg" width="56" />
			<div>
				<b class="block text-lg">Baden-Württemberg</b>
				<span class=" text-primary">Home Region</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
	</section>

	<section class="p-2 mt-10 space-y-2 border rounded-lg border-emerald-900">
		<a class="flex flex-row w-full gap-2 flinch label-text">
			<img class="bg-cover rounded-lg" height="56" src="https://placehold.co/56/svg" width="56" />
			<div>
				<b class="block text-lg">Wagner PMC</b>
				<span class=" text-primary">Team</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
		<a class="flex flex-row w-full gap-2 flinch label-text">
			<img class="bg-cover rounded-lg" height="56" src="https://placehold.co/56/svg" width="56" />
			<div>
				<b class="block text-lg">German Reich</b>
				<span class=" text-primary">Chancellor</span><span> 26.11.2023, 19:33</span>
			</div>
		</a>
	</section>

	<!-- todo: add additional info-->
</div>

<a href="/settings" class="btn btn-circle"> <FluentEmojiGear /></a>

<div class="flex justify-between bg-[url('https://source.unsplash.com/random.jpg?soldier')] bg-cover p-2">
	{#if data.user.picture}
		<div class="avatar">
			<div class="w-24 rounded-full">
				<img src={data.user.picture} />
			</div>
		</div>
	{:else}
		<div class="avatar placeholder">
			<div class="w-24 rounded-full bg-neutral text-neutral-content">
				<span class="text-3xl">D</span>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-2 mt-auto">
		<button
			class="btn btn-square btn-sm"
			on:click={() => shareLink("{{ user_name }}", window.location.href + "/{{ user_id }}")}
		>
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M18,16.08C17.24,16.08 16.48,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"
				/>
			</svg>
		</button>

		<a class="btn btn-square btn-sm" href="/user/settings" role="button">
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.48,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.48,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.48,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z"
				/>
			</svg>
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

	<!--
    <section class="border rounded-lg select-bordered">
        <div class="flex flex-row items-stretch w-full">
            <input class="hidden peer/skill_0" id="skill_0" name="skill" type="radio">
            <label class="skill_btn peer-checked/skill_0:text-secondary" for="skill_0">

                <b class="block text-lg">{{skill_0}}</b>
                <span class="text-sm">Strength</span>

            </label>
            <input class="hidden peer/skill_1" id="skill_1" name="skill" type="radio">
            <label class="skill_btn peer-checked/skill_1:text-secondary" for="skill_1">


                <b class="block text-lg">420</b>
                <span class="text-sm">Endurance</span>
            </label>
            <input class="hidden peer/skill_2" id="skill_2" name="skill" type="radio">
        
            <label class="skill_btn peer-checked/skill_2:text-secondary" for="skill_2">


                <b class="block text-lg">69</b>
                <span class="text-sm">Intelligence</span>
            </label>
           
        </div>

        <div class="flex flex-row gap-2 p-2">
            <a class="flex-1 flex-grow btn btn-primary" href="/settings" role="button">Upgrade</a>
            <a class="flex-1 flex-grow btn bg-secondary" href="/settings" role="button">Boost</a>
        </div>
    </section>
-->

	<section class="p-2 mt-10 space-y-2 border rounded-lg select-bordered">
		<a class="flex flex-row w-full gap-2 flinch label-text" href="/region/1">
			<img class="bg-cover rounded-lg" height="48" src="https://placehold.co/48/svg" width="48" />
			<div>
				<b class="block text-lg">Nendeln</b>
				<span class="text-primary">Current Region</span><span> 26.11.2023, 04:20</span>
			</div>
		</a>
		<a class="flex flex-row w-full gap-2 flinch label-text">
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
