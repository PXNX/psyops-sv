<!-- Click-to-load YouTube player. Uses the privacy-enhanced no-cookie domain,
     a strict sandbox and an allow-list; nothing loads until the player is
     activated by the reader. -->
<script lang="ts">
	let { id }: { id: string } = $props();
	let playing = $state(false);
</script>

<div class="video-shell">
	{#if playing}
		<iframe
			src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0"
			title="YouTube video"
			loading="lazy"
			referrerpolicy="strict-origin-when-cross-origin"
			sandbox="allow-scripts allow-same-origin allow-presentation"
			allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
		></iframe>
	{:else}
		<button
			type="button"
			class="video-poster"
			aria-label="Play YouTube video"
			onclick={() => (playing = true)}
		>
			<img
				src="https://i.ytimg.com/vi/{id}/hqdefault.jpg"
				alt=""
				loading="lazy"
				referrerpolicy="strict-origin-when-cross-origin"
			/>
			<span class="video-play" aria-hidden="true">▶</span>
			<span class="video-hint">Play video · YouTube</span>
		</button>
	{/if}
</div>

<style>
	@reference "../../../app.css";

	.video-shell {
		@apply my-5 overflow-hidden rounded-sm border border-line/25 bg-surface-1 shadow-[0_12px_30px_-20px_rgba(0,0,0,0.9)];
	}
	iframe {
		@apply block aspect-video w-full border-0;
	}
	.video-poster {
		@apply relative block aspect-video w-full cursor-pointer overflow-hidden bg-surface-3;
	}
	.video-poster img {
		@apply size-full object-cover opacity-80 transition-transform duration-500 hover:scale-[1.03];
	}
	.video-play {
		@apply absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/65 text-xl text-white shadow-lg transition-transform hover:scale-110;
	}
	.video-hint {
		@apply absolute bottom-2 right-2 rounded-sm bg-black/65 px-2 py-1 text-[10px] text-white;
	}
</style>
