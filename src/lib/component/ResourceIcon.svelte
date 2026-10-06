<!-- /lib/component/ResourceIcon.svelte -->
<script module lang="ts">
	// Tailwind arbitrary-value color classes, one per resource/product, chosen to
	// evoke the material itself (copper's orange patina, brass casings, rusted shells, ...).
	export const resourceColors: Record<string, string> = {
		iron: "text-[#b8bcc4]",
		copper: "text-[#d98c4a]",
		steel: "text-[#9db4c9]",
		gunpowder: "text-[#8a8a8a]",
		wood: "text-[#b58552]",
		coal: "text-[#7d7d7d]",
		rifles: "text-[#ab9a7c]",
		ammunition: "text-[#c9a227]",
		artillery: "text-[#b5533c]",
		vehicles: "text-[#7a8b6f]",
		explosives: "text-[#d9622b]",
		// Raw regional resources (region/state pages)
		oil: "text-[#caa23c]",
		chromium: "text-[#8ec6e0]",
		tungsten: "text-[#c08cf0]",
		rubber: "text-[#7fc25c]",
		aluminium: "text-[#b0b4ba]"
	};
</script>

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
	import GameIconsOilDrum from "~icons/game-icons/oil-drum";
	import GameIconsCrystalCluster from "~icons/game-icons/crystal-cluster";
	import GameIconsMetalPlate from "~icons/game-icons/metal-plate";
	import GameIconsRubberBoot from "~icons/game-icons/rubber-boot";
	import GameIconsPlaneWing from "~icons/game-icons/plane-wing";
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
		explosives: GameIconsDynamite,
		// Raw regional resources (region/state pages)
		oil: GameIconsOilDrum,
		chromium: GameIconsCrystalCluster,
		tungsten: GameIconsMetalPlate,
		rubber: GameIconsRubberBoot,
		aluminium: GameIconsPlaneWing
	};

	const IconComponent = $derived(icons[name] ?? FluentEmojiPackage);
</script>

<IconComponent class="{resourceColors[name] ?? ''} {className}" />
