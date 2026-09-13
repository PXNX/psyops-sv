<!-- /lib/component/ResourceIcon.svelte -->
<script lang="ts">
	import GameIconsOre from "~icons/game-icons/ore";
	import GameIconsMinerals from "~icons/game-icons/minerals";
	import GameIconsMetalBar from "~icons/game-icons/metal-bar";
	import GameIconsPowderBag from "~icons/game-icons/powder-bag";
	import GameIconsWoodPile from "~icons/game-icons/wood-pile";
	import GameIconsCoalPile from "~icons/game-icons/coal-pile";
	import GameIconsRifle from "~icons/game-icons/rifle";
	import GameIconsBullets from "~icons/game-icons/bullets";
	import GameIconsArtilleryShell from "~icons/game-icons/artillery-shell";
	import GameIconsTruck from "~icons/game-icons/truck";
	import GameIconsDynamite from "~icons/game-icons/dynamite";
	import FluentEmojiPackage from "~icons/fluent-emoji/package";

	type Props = {
		name: string;
		class?: string;
	};

	let { name, class: className = "" }: Props = $props();

	const icons: Record<string, typeof FluentEmojiPackage> = {
		// Raw resources
		iron: GameIconsOre,
		copper: GameIconsMinerals,
		steel: GameIconsMetalBar,
		gunpowder: GameIconsPowderBag,
		wood: GameIconsWoodPile,
		coal: GameIconsCoalPile,
		// Manufactured products
		rifles: GameIconsRifle,
		ammunition: GameIconsBullets,
		artillery: GameIconsArtilleryShell,
		vehicles: GameIconsTruck,
		explosives: GameIconsDynamite
	};

	const IconComponent = $derived(icons[name] ?? FluentEmojiPackage);
</script>

<IconComponent class={className} />
