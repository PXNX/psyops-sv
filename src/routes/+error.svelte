<script lang="ts">
	import { page } from "$app/stores";
	import Icon from "@iconify/svelte";
</script>

<div class="min-h-screen bg-base-200 flex flex-col justify-center items-center text-center">
	{#if $page.status === 404}
		<Icon icon="fluent-emoji:eyes" class="h-12 w-12" />
		<h1 class="text-xl font-semibold mt-2 text-red-400">Not found!</h1>
		<p class=" mt-1 text-base-content">
			The page <code class="bg-neutral text-neutral-content p-1 rounded">{$page.url.pathname}</code> doesn't exist.
		</p>
		<button on:click={() => history.back()} class="btn btn-md mt-4 btn-wide">
			<Icon icon="fluent-emoji:left-arrow" class="h-5 w-5" />Go Back</button
		>
	{:else if $page.status === 500}
		<Icon icon="  fluent-emoji:knocked-out-face" class="h-12 w-12" />
		<h1 class="text-xl font-semibold mt-2 text-red-400">Internal Error!</h1>
		<p class=" mt-1 text-base-content">
			The page <code class="bg-neutral text-neutral-content p-1 rounded">{$page.url.pathname}</code> doesn't exist.
		</p>
		<button on:click={() => history.back()} class="btn btn-md mt-4 btn-wide">
			<Icon icon="fluent-emoji:left-arrow" class="h-5 w-5" />Go Back</button
		>
	{:else}
		<p>what the fuck</p>
	{/if}
</div>
