<script lang="ts">
	const { children } = $props();

	export const prerender = true;
</script>

<main class="w-full">
	{@render children()}
</main>
