// Extra CCTV angles for a tapped site: the gate, the lobby, the server room and
// the perimeter fence. Each is drawn from the site's seed, so every visitor
// sees the same lobby plant and the same parked car. The site's own establishing
// shot ("main") stays in CameraFeed.svelte.

export type CamView = "main" | "gate" | "lobby" | "server" | "perimeter";
export type CamMode = "day" | "night" | "thermal";
export type CamLens = "wide" | "fisheye";

export const CAM_VIEWS: { id: CamView; label: string }[] = [
	{ id: "main", label: "Overview" },
	{ id: "gate", label: "Main gate" },
	{ id: "lobby", label: "Lobby" },
	{ id: "server", label: "Server room" },
	{ id: "perimeter", label: "Perimeter" }
];

export const CAM_MODES: { id: CamMode; label: string }[] = [
	{ id: "day", label: "Day" },
	{ id: "night", label: "Night vision" },
	{ id: "thermal", label: "Thermal" }
];

export interface Pen {
	line: (d: string, stroke?: string, sw?: number, op?: number) => void;
	rect: (x: number, y: number, w: number, h: number, fill: string, op?: number, stroke?: string) => void;
	circle: (cx: number, cy: number, r: number, fill: string, op?: number) => void;
	poly: (pts: string, fill: string, stroke?: string, op?: number) => void;
	blip: (x: number, y: number, r: number, delay: number) => void;
}

const W = 640;

/** A little person, seen from the ceiling camera's angle. */
function person(pen: Pen, x: number, y: number, s: number, coat: string) {
	pen.circle(x, y - 34 * s, 7 * s, "#c9d8cd", 0.9);
	pen.rect(x - 8 * s, y - 27 * s, 16 * s, 22 * s, coat, 0.95);
	pen.rect(x - 7 * s, y - 5 * s, 5 * s, 16 * s, "#2a332d");
	pen.rect(x + 2 * s, y - 5 * s, 5 * s, 16 * s, "#2a332d");
}

export function drawView(view: Exclude<CamView, "main">, rng: () => number, pen: Pen) {
	const tint = "#b9d8c4";
	const amber = "#ffcf3f";
	if (view === "gate") {
		pen.rect(0, 0, W, 360, "#141b17");
		pen.rect(0, 190, W, 170, "#1e2721");
		// The road running into the site.
		pen.poly("270,190 370,190 600,360 40,360", "#262f29", "#55705f");
		for (let y = 205; y < 360; y += 26) pen.line(`M320 ${y}v12`, amber, 2, 0.6);
		// Guard booth with a lit window.
		pen.rect(460, 140, 90, 90, "#38463d", 1, "#7d9a86");
		pen.rect(474, 156, 62, 30, "#ffe9a8", 0.35, "#9cb7a5");
		pen.rect(450, 132, 110, 12, "#4a5b50", 1, "#8ba897");
		person(pen, 505, 222, 0.9, "#53675a");
		// Barrier boom, striped.
		pen.rect(150, 210, 300, 8, "#d7e7d9", 0.9);
		for (let x = 160; x < 450; x += 40) pen.rect(x, 210, 20, 8, "#ff6b5b", 0.8);
		pen.rect(440, 200, 14, 40, "#4a5b50", 1, "#8ba897");
		// A car waiting politely at the barrier.
		const cx = 210 + rng() * 60;
		pen.rect(cx, 262, 120, 40, "#5f7466", 1, "#9cb7a5");
		pen.rect(cx + 18, 240, 80, 26, "#4b5d51", 1, "#9cb7a5");
		pen.circle(cx + 24, 304, 12, "#111814");
		pen.circle(cx + 96, 304, 12, "#111814");
		pen.blip(cx + 4, 276, 4, 0);
		pen.blip(cx + 116, 276, 4, 0.3);
		// Fence either side.
		for (let x = 0; x < 150; x += 18) pen.line(`M${x} 190v-48`, "#6f8877", 1.4, 0.6);
		pen.line("M0 150H150", "#6f8877", 1.2, 0.5);
		for (let x = 560; x < W; x += 18) pen.line(`M${x} 190v-48`, "#6f8877", 1.4, 0.6);
		return;
	}
	if (view === "lobby") {
		pen.rect(0, 0, W, 360, "#18201b");
		// Floor tiles in perspective.
		pen.poly("120,170 520,170 640,360 0,360", "#232d26", "#4e6a58");
		for (let i = 0; i <= 8; i++) {
			const x = 120 + i * 50;
			pen.line(`M${x} 170L${(x - 320) * 2 + 320} 360`, "#3c5044", 1, 0.6);
		}
		for (const y of [200, 240, 290, 350]) pen.line(`M0 ${y}H${W}`, "#3c5044", 1, 0.5);
		// Back wall with the site's logo and a clock.
		pen.rect(120, 40, 400, 130, "#2b3730", 1, "#5d7a68");
		pen.circle(320, 80, 22, "#3d5144", 1);
		pen.line("M320 80V64M320 80h11", tint, 2, 0.9);
		// Reception desk and its lamp.
		pen.rect(210, 150, 220, 50, "#46574b", 1, "#8ba897");
		pen.rect(220, 140, 200, 12, "#5d7466", 1);
		pen.circle(400, 132, 6, amber, 0.8);
		person(pen, 300, 150, 0.85, "#5d7a68");
		// Potted plants, because every lobby has them.
		for (const x of [80, 560]) {
			pen.rect(x - 16, 240, 32, 40, "#4a5b50", 1, "#7d9a86");
			for (let l = 0; l < 6; l++) pen.circle(x + (rng() - 0.5) * 34, 220 - rng() * 40, 12, "#5f8a6a", 0.85);
		}
		// A visitor crossing the hall.
		person(pen, 140 + rng() * 340, 320, 1.3, "#6c8475");
		for (let x = 160; x < 500; x += 60) pen.blip(x, 30, 2.4, rng() * 2);
		return;
	}
	if (view === "server") {
		pen.rect(0, 0, W, 360, "#0b110d");
		pen.poly("270,110 370,110 640,360 0,360", "#121a15", "#405a49");
		for (const side of [-1, 1]) {
			for (let i = 0; i < 6; i++) {
				const t = i / 6;
				const x = side < 0 ? 40 + t * 200 : 600 - t * 200;
				const h = 230 - t * 120;
				const y = 120 + t * 10;
				const w = 50 - t * 28;
				pen.rect(side < 0 ? x : x - w, y, w, h, "#1f2a23", 1, "#4e6a58");
				for (let k = 0; k < 10; k++) {
					pen.blip((side < 0 ? x : x - w) + 6 + rng() * (w - 12), y + 10 + k * (h / 11), 1.6, rng() * 3);
				}
			}
		}
		// Cable trays overhead and a cheerful technician.
		pen.line("M240 40H400", "#7ea78b", 3, 0.4);
		pen.line("M200 60H440", "#7ea78b", 2, 0.3);
		person(pen, 320, 300, 1.1, "#5d7a68");
		pen.rect(300, 230, 40, 26, "#2e3d34", 1, tint);
		return;
	}
	// Perimeter: a long fence line, floodlights and the odd fox.
	pen.rect(0, 0, W, 360, "#121915");
	pen.rect(0, 220, W, 140, "#1b241e");
	for (let x = 0; x < W; x += 26) pen.line(`M${x} 220v-70`, "#6f8877", 1.6, 0.7);
	pen.line("M0 160H640M0 185H640", "#6f8877", 1, 0.55);
	for (let x = 0; x < W; x += 13) pen.line(`M${x} 150l6 -8l6 8`, "#8ba897", 1, 0.5);
	for (const x of [120, 380, 600]) {
		pen.rect(x - 3, 90, 6, 130, "#4a5b50");
		pen.rect(x - 14, 84, 28, 10, "#d7e7d9", 0.8);
		pen.poly(`${x - 10},94 ${x + 10},94 ${x + 60},220 ${x - 60},220`, "#e9f2d8", undefined, 0.07);
		pen.blip(x, 89, 3, rng() * 2);
	}
	// Footpath and a fox who does not care about any of this.
	pen.line("M0 300C200 280 420 320 640 290", "#5d7a68", 6, 0.35);
	const fx = 160 + rng() * 300;
	pen.rect(fx, 284, 34, 12, "#d08a4a", 0.85);
	pen.circle(fx + 38, 284, 7, "#d08a4a", 0.85);
	pen.line(`M${fx} 288l-16 -6`, "#d08a4a", 4, 0.8);
}
