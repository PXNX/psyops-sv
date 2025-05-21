<script lang="ts">
	import { enhance } from "$app/forms";
	import CircleAvatar from "$lib/component/CircleAvatar.svelte";
	import SquareAvatar from "$lib/component/SquareAvatar.svelte";

	import { shareLink } from "$lib/util";
	import ProfileItem from "$lib/component/ProfileItem.svelte";

	import FluentSettingsCogMultiple20Filled from "~icons/fluent/settings-cog-multiple-20-filled";
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import FluentAccessibilityError20Filled from "~icons/fluent/accessibility-error-20-filled";
	import FluentChat20Filled from "~icons/fluent/chat-20-filled";
	import FluentGiftCardArrowRight20Filled from "~icons/fluent/gift-card-arrow-right-20-filled";
	import MdiNewspaperPlus from "~icons/mdi/newspaper-plus";
	import FluentClockToolbox20Filled from "~icons/fluent/clock-toolbox-20-filled";
	const { data } = $props();
</script>

<div class="p-2 font-bold text-white bg-linear-to-r/oklch from-amber-800 to-zinc-800 flex flex-col justify-end">
	<h3 class="text-md font-normal mt-32 text-gray-400">{data.user.name}</h3>
	<h1 class="text-xl font-semibold">Political Career</h1>
</div>

<div class=" text-sm text-gray-300 space-y-2">
	<h4 class="text-md font-normal items-center text-purple-300">bavarian empire</h4>
	<ul class=" space-y-1 ml-2">
		<li>• Minister of Finance (2023-2023)</li>
		<li>• Deputy Minister of Trade (2021-2023)</li>
		<li>• Parliamentary Secretary (2019-2021)</li>
	</ul>

	<h4 class="text-md font-normal items-center text-purple-300 mt-6">austrian empire</h4>
	<ul class=" space-y-1 ml-2">
		<li>• Minister of Finance (2023-2023)</li>
		<li>• Deputy Minister of Trade (2021-2023)</li>
		<li>• Parliamentary Secretary (2019-2021)</li>
	</ul>
	<!-- todo: group it by state -->
</div>
