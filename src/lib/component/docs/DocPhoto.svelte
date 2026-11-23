<!-- A framed illustration with a small editorial caption, used in the guides
     for the poster art that lives in static/images/docs. -->
<script lang="ts">
	interface Props {
		src: string;
		alt: string;
		label?: string;
	}
	let { src, alt, label }: Props = $props();
</script>

<figure class="doc-photo">
	<div class="doc-photo-frame"><img {src} {alt} loading="lazy" /></div>
	{#if label}<figcaption>{label}</figcaption>{/if}
</figure>

<style>
	@reference "../../../app.css";

	.doc-photo {
		@apply my-6 overflow-hidden rounded-sm border border-line/20 bg-surface-2;
	}
	.doc-photo-frame {
		@apply overflow-hidden bg-surface-0;
	}
	.doc-photo img {
		@apply block w-full object-cover;
		max-height: 360px;
	}
	.doc-photo figcaption {
		@apply border-t border-line/15 px-4 py-2 text-center text-xs text-fg-muted;
	}
</style>
