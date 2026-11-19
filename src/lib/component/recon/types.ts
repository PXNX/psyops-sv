// src/lib/component/recon/types.ts
import type { ImageryInput } from "#lib/utils/sensor-image.js";

/** One recon frame as the UI lists it. */
export interface ImageryItem {
	input: ImageryInput;
	fresh: boolean;
	regionName: string;
}
