<!-- Confidence in a figure: Unknown / Vague / Rough / Solid / Confirmed. -->
<script lang="ts">
	import Badge from "#lib/component/ui/Badge.svelte";
	import type { BadgeTone } from "#lib/component/ui/styles.js";
	import { TIER_LABEL, type IntelTier } from "#lib/utils/intel-estimate.js";

	interface Props {
		tier: IntelTier;
		title?: string;
		class?: string;
	}
	let { tier, title, class: className = "" }: Props = $props();

	const TONE: Record<IntelTier, BadgeTone> = {
		unknown: "neutral",
		vague: "red",
		rough: "amber",
		solid: "cyan",
		confirmed: "green"
	};
</script>

<span {title} class="inline-flex {title ? 'cursor-help' : ''} {className}">
	<Badge size="xs" tone={TONE[tier]}>{TIER_LABEL[tier]}</Badge>
</span>
