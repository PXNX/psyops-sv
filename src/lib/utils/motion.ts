import { writable } from "svelte/store";

/**
 * True while a view-transition page swap is in flight.
 *
 * Page-level entrance animations must not run inside a view transition: the
 * browser snapshots the DOM while the animation is still in its `from` state,
 * so the incoming page would render blank and then jump to a mid-animation
 * pose when the transition ends. Components read this once at mount (non-
 * reactively, via `get`) and skip their entrance class when it is true.
 */
export const viewTransitionActive = writable(false);
