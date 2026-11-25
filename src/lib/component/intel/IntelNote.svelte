<!-- One line atop a foreign state's subpage: its figures are estimates, how
     sure the viewer's intel is, and where to see (and raise) the full picture. -->
<script lang="ts">
	import { INTEL_GROUP_LABEL, intelTier, type IntelGroup } from "#lib/utils/intel-estimate.js";
	import IntelBadge from "./IntelBadge.svelte";
	import IconEye from "~icons/fluent/eye-20-regular";

	interface Props {
		stateId: number;
		/** The stat group this page is mostly about. */
		group: IntelGroup;
		level: number;
		class?: string;
	}
	let { stateId, group, level, class: className = "" }: Props = $props();
</script>

<p
	class="panel-muted flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm px-3 py-2 text-xs text-fg-muted {className}"
>
	<IconEye class="size-4 shrink-0 text-fg-faint" />
	<span class="min-w-[12rem] flex-1">
		Figures are estimates: the interval holds the true value and narrows as your intel grows.
	</span>
	<span class="flex items-center gap-1.5">
		<span class="font-mono text-fg-soft">{INTEL_GROUP_LABEL[group]} {Math.round(level * 100)}%</span>
		<IntelBadge tier={intelTier(level)} />
	</span>
	<a href="/state/{stateId}#intel-title" class="font-semibold text-primary-fg hover:underline">Intel picture →</a>
</p>
