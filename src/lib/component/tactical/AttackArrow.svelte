<!-- src/lib/component/tactical/AttackArrow.svelte -->
<!-- An axis of attack (SVG group): a slightly curved red arrow from (x1, y1)
     to (x2, y2). `headSize` is in map units, so pass a zoom-compensated value
     to keep the head the same size on screen. -->
<svelte:options namespace="svg" />

<script lang="ts">
	import { HOSTILE_RED } from "./colors";

	interface Props {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		headSize?: number;
		color?: string;
		/** Stop this far short of the target (map units), e.g. at a range ring. */
		inset?: number;
	}

	let { x1, y1, x2, y2, headSize = 6, color = HOSTILE_RED, inset = 0 }: Props = $props();

	const geom = $derived.by(() => {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		const ex = x2 - ux * Math.min(inset, len * 0.4);
		const ey = y2 - uy * Math.min(inset, len * 0.4);
		// Bow the shaft a little to the left of travel.
		const bow = len * 0.18;
		const cx = (x1 + ex) / 2 - uy * bow;
		const cy = (y1 + ey) / 2 + ux * bow;
		// Head points along the curve's end tangent (control → end).
		const tx = ex - cx;
		const ty = ey - cy;
		const tl = Math.hypot(tx, ty) || 1;
		const hx = tx / tl;
		const hy = ty / tl;
		const bx = ex - hx * headSize;
		const by = ey - hy * headSize;
		const head = `${ex},${ey} ${bx - hy * headSize * 0.6},${by + hx * headSize * 0.6} ${bx + hy * headSize * 0.6},${by - hx * headSize * 0.6}`;
		return { d: `M${x1} ${y1} Q${cx} ${cy} ${bx} ${by}`, head };
	});
</script>

<g class="attack-arrow">
	<path
		d={geom.d}
		fill="none"
		stroke="#05080f"
		stroke-opacity="0.6"
		stroke-width="4.5"
		stroke-linecap="round"
		vector-effect="non-scaling-stroke"
	/>
	<path
		d={geom.d}
		fill="none"
		stroke={color}
		stroke-width="2.2"
		stroke-linecap="round"
		vector-effect="non-scaling-stroke"
	/>
	<polygon points={geom.head} fill={color} />
</g>
