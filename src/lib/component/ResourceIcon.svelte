<!-- /lib/component/ResourceIcon.svelte -->
<script lang="ts">
	import FluentEmojiPickaxe from "~icons/fluent-emoji/pick";
	import FluentEmojiGem from "~icons/fluent-emoji/gem-stone";
	import FluentEmojiGear from "~icons/fluent-emoji/gear";
	import FluentEmojiCollision from "~icons/fluent-emoji/collision";
	import FluentEmojiWood from "~icons/fluent-emoji/wood";
	import FluentEmojiRock from "~icons/fluent-emoji/rock";
	import FluentEmojiWaterPistol from "~icons/fluent-emoji/water-pistol";
	import FluentEmojiBomb from "~icons/fluent-emoji/bomb";
	import FluentEmojiAutomobile from "~icons/fluent-emoji/automobile";
	import FluentEmojiFireworks from "~icons/fluent-emoji/fireworks";
	import FluentEmojiPackage from "~icons/fluent-emoji/package";

	type Props = {
		name: string;
		class?: string;
	};

	let { name, class: className = "" }: Props = $props();

	const icons: Record<string, typeof FluentEmojiPackage> = {
		// Raw resources
		iron: FluentEmojiPickaxe,
		copper: FluentEmojiGem,
		steel: FluentEmojiGear,
		gunpowder: FluentEmojiCollision,
		wood: FluentEmojiWood,
		coal: FluentEmojiRock,
		// Manufactured products
		rifles: FluentEmojiWaterPistol,
		ammunition: FluentEmojiWaterPistol,
		artillery: FluentEmojiBomb,
		vehicles: FluentEmojiAutomobile,
		explosives: FluentEmojiFireworks
	};

	const IconComponent = $derived(icons[name] ?? FluentEmojiPackage);
</script>

<IconComponent class={className} />
