<!-- src/lib/component/Seo.svelte -->
<!-- One place for the public-facing meta tags: description, canonical URL,
     Open Graph and Twitter/X cards. Use it on pages that can be linked or
     shared; authenticated in-app screens don't need it. -->
<script lang="ts">
	import { page } from "$app/state";

	interface Props {
		title: string;
		description: string;
		/** Path (or absolute URL) to the preview image. */
		image?: string;
		imageAlt?: string;
		/** Open Graph type: "website" or "article". */
		type?: "website" | "article";
		/** Override the canonical path; defaults to the current path. */
		path?: string;
		robots?: string;
	}

	let {
		title,
		description,
		image = "/images/docs/psyops.webp",
		imageAlt = "PsyOps – a global political simulation",
		type = "website",
		path,
		robots = "index, follow"
	}: Props = $props();

	const SITE_NAME = "PsyOps";

	const canonical = $derived(new URL(path ?? page.url.pathname, page.url.origin).href);
	const absoluteImage = $derived(new URL(image, page.url.origin).href);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={absoluteImage} />
	<meta property="og:image:alt" content={imageAlt} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={absoluteImage} />
	<meta name="twitter:image:alt" content={imageAlt} />
</svelte:head>
