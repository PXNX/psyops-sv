<!--
  ThreeAnimation.svelte – full-screen particle overlay powered by Three.js.
  Renders a short, satisfying particle effect then auto-removes.
-->
<script lang="ts">
	import { onMount } from "svelte";

	interface Props {
		variant: "battle" | "vote" | "collect" | "company" | "party" | "production" | "training";
		duration?: number;
		onComplete?: () => void;
	}

	let { variant, duration, onComplete }: Props = $props();
	let el: HTMLDivElement;

	const DURATIONS: Record<string, number> = {
		battle: 3200,
		vote: 1900,
		collect: 1900,
		company: 2100,
		party: 2300,
		production: 1700,
		training: 1700
	};

	/* ── tiny helpers (no THREE needed) ── */
	function rr(a: number, b: number) {
		return a + Math.random() * (b - a);
	}
	function pick<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	onMount(async () => {
		const THREE = await import("three");

		const dur = duration ?? DURATIONS[variant];
		const W = window.innerWidth;
		const H = window.innerHeight;

		/* ── renderer / scene / camera ── */
		const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
		renderer.setSize(W, H);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		el.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		const cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
		cam.position.z = 5;

		/* ── glow sprite texture ── */
		const tex = (() => {
			const s = 64;
			const c = document.createElement("canvas");
			c.width = c.height = s;
			const x = c.getContext("2d")!;
			const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
			g.addColorStop(0, "rgba(255,255,255,1)");
			g.addColorStop(0.35, "rgba(255,255,255,.7)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, s, s);
			return new THREE.CanvasTexture(c);
		})();

		/* ── variant data ── */
		interface V {
			pos: Float32Array;
			col: Float32Array;
			sz: Float32Array;
			tick: (t: number, dt: number) => void;
			extras?: (s: THREE.Scene) => THREE.Object3D[];
			tickExtras?: (e: THREE.Object3D[], t: number) => void;
		}

		function color(hex: string) {
			return new THREE.Color(hex);
		}

		/* ———— BATTLE: brutal multi-origin edge-to-edge explosion ———— */
		function mkBattle(): V {
			const N = 900;
			const pos = new Float32Array(N * 3);
			const vel = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const baseSz = new Float32Array(N);
			const spawnT = new Float32Array(N);

			/* 3 explosion origins spread across the screen */
			const origins = [
				[0, 0] /* center */,
				[-3.5, -1.5] /* bottom-left */,
				[3.5, 1.0] /* top-right */
			];

			/* Phase 1 (0-200): Core blasts from all 3 origins – massive, white-hot */
			for (let i = 0; i < 200; i++) {
				const origin = origins[i % 3];
				const th = Math.random() * Math.PI * 2;
				const ph = Math.acos(2 * Math.random() - 1);
				const sp = rr(8, 28);
				pos[i * 3] = origin[0];
				pos[i * 3 + 1] = origin[1];
				vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
				vel[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * sp;
				vel[i * 3 + 2] = Math.cos(ph) * sp * 0.4;
				const c = pick([color("#ffffff"), color("#fff4cc"), color("#ffee88"), color("#ffcc00")]);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				baseSz[i] = rr(0.6, 2.0);
				spawnT[i] = (i % 3) * 0.04;
			}

			/* Phase 2 (200-450): Fire debris – violent, edge-reaching */
			for (let i = 200; i < 450; i++) {
				const origin = origins[i % 3];
				const th = Math.random() * Math.PI * 2;
				const ph = Math.acos(2 * Math.random() - 1);
				const sp = rr(6, 18);
				pos[i * 3] = origin[0] + rr(-0.3, 0.3);
				pos[i * 3 + 1] = origin[1] + rr(-0.3, 0.3);
				vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
				vel[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * sp + rr(0, 3);
				vel[i * 3 + 2] = Math.cos(ph) * sp * 0.3;
				const c = pick([color("#ff2200"), color("#ff4400"), color("#ff6600"), color("#ff0000"), color("#cc0000")]);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				baseSz[i] = rr(0.3, 1.0);
				spawnT[i] = rr(0.02, 0.15);
			}

			/* Phase 3 (450-650): Screaming sparks – ultra-fast, reach far edges */
			for (let i = 450; i < 650; i++) {
				const origin = origins[i % 3];
				const th = Math.random() * Math.PI * 2;
				const sp = rr(15, 40);
				pos[i * 3] = origin[0];
				pos[i * 3 + 1] = origin[1];
				vel[i * 3] = Math.cos(th) * sp;
				vel[i * 3 + 1] = Math.sin(th) * sp;
				vel[i * 3 + 2] = rr(-2, 2);
				const c = pick([color("#ffee66"), color("#ffffff"), color("#ffcc00"), color("#ff8800")]);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				baseSz[i] = rr(0.05, 0.18);
				spawnT[i] = rr(0.0, 0.1);
			}

			/* Phase 4 (650-800): Edge smoke – large, dark, spread from edges */
			for (let i = 650; i < 800; i++) {
				const edge = rr(0, 1) > 0.5 ? 1 : -1;
				pos[i * 3] = edge * rr(3, 6);
				pos[i * 3 + 1] = rr(-4, 4);
				vel[i * 3] = -edge * rr(0.5, 2);
				vel[i * 3 + 1] = rr(0.5, 3);
				vel[i * 3 + 2] = rr(-0.2, 0.2);
				const c = pick([color("#331100"), color("#442200"), color("#221100"), color("#552200")]);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				baseSz[i] = rr(1.5, 4.0);
				spawnT[i] = rr(0.05, 0.25);
			}

			/* Phase 5 (800-900): Rising embers everywhere */
			for (let i = 800; i < N; i++) {
				pos[i * 3] = rr(-6, 6);
				pos[i * 3 + 1] = rr(-4, -1);
				vel[i * 3] = rr(-1, 1);
				vel[i * 3 + 1] = rr(2, 7);
				vel[i * 3 + 2] = rr(-0.3, 0.3);
				const c = pick([color("#ff6600"), color("#ff4400"), color("#ffaa33"), color("#ff2200")]);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				baseSz[i] = rr(0.04, 0.15);
				spawnT[i] = rr(0.08, 0.45);
			}

			let elapsed = 0;
			return {
				pos,
				col,
				sz,
				tick(t, dt) {
					elapsed += dt;

					/* Violent camera shake – harsh early, lingers */
					const shakeAmt = Math.max(0, 1 - t * 2) * 0.35;
					cam.position.x = (Math.random() - 0.5) * 2 * shakeAmt;
					cam.position.y = (Math.random() - 0.5) * 2 * shakeAmt;

					for (let i = 0; i < N; i++) {
						const i3 = i * 3;

						if (t < spawnT[i]) {
							sz[i] = 0;
							continue;
						}

						const age = t - spawnT[i];

						/* Hard pop-in then fade */
						if (age < 0.03) {
							sz[i] = baseSz[i] * (age / 0.03);
						} else if (i >= 650 && i < 800) {
							/* Smoke fades slower */
							sz[i] = baseSz[i] * Math.max(0, 1 - age * 0.7);
						} else {
							sz[i] = baseSz[i] * Math.max(0, 1 - age * 1.0);
						}

						/* Physics */
						const drag = i < 450 ? 0.96 : i < 650 ? 0.99 : 0.98;
						vel[i3] *= drag;
						vel[i3 + 1] *= drag;
						vel[i3 + 2] *= drag;
						vel[i3 + 1] -= (i >= 800 ? 1.0 : i >= 650 ? 0.3 : 3.5) * dt;
						pos[i3] += vel[i3] * dt;
						pos[i3 + 1] += vel[i3 + 1] * dt;
						pos[i3 + 2] += vel[i3 + 2] * dt;

						/* Ember flicker */
						if (i >= 800) sz[i] *= 0.5 + 0.5 * Math.sin(elapsed * 22 + i * 7);
					}
				},
				extras(sc) {
					const objs: THREE.Object3D[] = [];

					/* 5 shockwave rings from each origin */
					for (let o = 0; o < 3; o++) {
						for (let r = 0; r < 2; r++) {
							const rg = new THREE.RingGeometry(0.1, 0.4 - r * 0.08, 96);
							const rm = new THREE.MeshBasicMaterial({
								color: [0xff4400, 0xff2200][r],
								transparent: true,
								opacity: 1,
								side: THREE.DoubleSide,
								blending: THREE.AdditiveBlending
							});
							const ring = new THREE.Mesh(rg, rm);
							ring.position.set(origins[o][0], origins[o][1], 0);
							sc.add(ring);
							objs.push(ring);
						}
					}

					/* Full-screen white flash */
					const fg = new THREE.PlaneGeometry(1, 1);
					const fm = new THREE.MeshBasicMaterial({
						color: 0xffffff,
						transparent: true,
						opacity: 1,
						side: THREE.DoubleSide,
						blending: THREE.AdditiveBlending
					});
					const flash = new THREE.Mesh(fg, fm);
					sc.add(flash);
					objs.push(flash);

					/* Blood-red afterglow covering whole screen */
					const ag = new THREE.PlaneGeometry(1, 1);
					const am = new THREE.MeshBasicMaterial({
						color: 0xff2200,
						transparent: true,
						opacity: 0.8,
						side: THREE.DoubleSide,
						blending: THREE.AdditiveBlending
					});
					const glow = new THREE.Mesh(ag, am);
					sc.add(glow);
					objs.push(glow);

					return objs; /* [6 rings, flash, glow] */
				},
				tickExtras(e, t) {
					/* Shockwave rings from each origin */
					for (let i = 0; i < 6; i++) {
						const ring = e[i] as THREE.Mesh;
						const originIdx = Math.floor(i / 2);
						const ringIdx = i % 2;
						const delay = originIdx * 0.04 + ringIdx * 0.03;
						const rt = Math.max(0, t - delay);
						const s = rt * 35;
						ring.scale.set(s, s, 1);
						(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - rt * 2.5);
					}

					/* White flash – full screen, fast */
					const flash = e[6] as THREE.Mesh;
					(flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t * 5);
					const fs = 4 + t * 20;
					flash.scale.set(fs, fs, 1);

					/* Blood-red afterglow – covers entire viewport */
					const glow = e[7] as THREE.Mesh;
					(glow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - t * 1.5);
					const gs = 3 + t * 15;
					glow.scale.set(gs, gs, 1);
				}
			};
		}

		/* ———— VOTE: dignified upward rise ———— */
		function mkVote(): V {
			const N = 140;
			const pos = new Float32Array(N * 3);
			const vel = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const phase = new Float32Array(N);
			const pal = [color("#8b5cf6"), color("#6366f1"), color("#3b82f6"), color("#a78bfa"), color("#e0e7ff")];

			for (let i = 0; i < N; i++) {
				pos[i * 3] = rr(-1.2, 1.2);
				pos[i * 3 + 1] = rr(-3, -1);
				pos[i * 3 + 2] = rr(-0.4, 0.4);
				vel[i * 3 + 1] = rr(2.5, 5.5);
				vel[i * 3] = rr(-0.4, 0.4);
				phase[i] = Math.random() * Math.PI * 2;
				const c = pick(pal);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				sz[i] = rr(0.07, 0.2);
			}
			let elapsed = 0;
			return {
				pos,
				col,
				sz,
				tick(_, dt) {
					elapsed += dt;
					for (let i = 0; i < N; i++) {
						const i3 = i * 3;
						pos[i3 + 1] += vel[i3 + 1] * dt;
						pos[i3] += Math.sin(elapsed * 2.5 + phase[i]) * 0.4 * dt;
						sz[i] = rr(0.05, 0.18) * (0.6 + 0.4 * Math.sin(elapsed * 4 + i));
					}
				}
			};
		}

		/* ———— COLLECT: golden fountain upward ———— */
		function mkCollect(): V {
			const N = 160;
			const pos = new Float32Array(N * 3);
			const vel = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const pal = [color("#fbbf24"), color("#f59e0b"), color("#d97706"), color("#fef3c7"), color("#34d399")];

			for (let i = 0; i < N; i++) {
				pos[i * 3] = rr(-0.4, 0.4);
				pos[i * 3 + 1] = rr(-0.4, 0.2);
				pos[i * 3 + 2] = rr(-0.3, 0.3);
				const angle = rr(Math.PI * 0.15, Math.PI * 0.85);
				const sp = rr(3, 7);
				vel[i * 3] = Math.cos(angle) * sp * (Math.random() > 0.5 ? 1 : -1);
				vel[i * 3 + 1] = Math.sin(angle) * sp;
				vel[i * 3 + 2] = rr(-0.5, 0.5);
				const c = pick(pal);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				sz[i] = rr(0.08, 0.24);
			}
			let elapsed = 0;
			return {
				pos,
				col,
				sz,
				tick(_, dt) {
					elapsed += dt;
					for (let i = 0; i < N; i++) {
						const i3 = i * 3;
						vel[i3] *= 0.98;
						vel[i3 + 1] *= 0.98;
						vel[i3 + 1] -= 4 * dt;
						pos[i3] += vel[i3] * dt;
						pos[i3 + 1] += vel[i3 + 1] * dt;
						pos[i3 + 2] += vel[i3 + 2] * dt;
						sz[i] = Math.max(0.03, sz[i] * (1 - 0.15 * dt));
						sz[i] *= 0.85 + 0.15 * Math.sin(elapsed * 8 + i * 0.5);
					}
				}
			};
		}

		/* ———— COMPANY: professional blue-gold starburst ———— */
		function mkCompany(): V {
			const N = 180;
			const pos = new Float32Array(N * 3);
			const vel = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const pal = [color("#3b82f6"), color("#06b6d4"), color("#fbbf24"), color("#e0e7ff"), color("#ffffff")];

			for (let i = 0; i < N; i++) {
				const angle = (i / N) * Math.PI * 2 + rr(-0.3, 0.3);
				const sp = rr(2.5, 6);
				vel[i * 3] = Math.cos(angle) * sp;
				vel[i * 3 + 1] = Math.sin(angle) * sp + rr(0, 1.5);
				vel[i * 3 + 2] = rr(-0.5, 0.5);
				const c = pick(pal);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				sz[i] = rr(0.08, 0.26);
			}
			return {
				pos,
				col,
				sz,
				tick(_, dt) {
					for (let i = 0; i < N; i++) {
						const i3 = i * 3;
						vel[i3] *= 0.97;
						vel[i3 + 1] *= 0.97;
						vel[i3 + 1] -= 1.5 * dt;
						pos[i3] += vel[i3] * dt;
						pos[i3 + 1] += vel[i3 + 1] * dt;
						pos[i3 + 2] += vel[i3 + 2] * dt;
						sz[i] *= 1 - 0.2 * dt;
					}
				},
				extras(sc) {
					const rg = new THREE.RingGeometry(0.05, 0.15, 64);
					const rm = new THREE.MeshBasicMaterial({
						color: 0x3b82f6,
						transparent: true,
						opacity: 0.7,
						side: THREE.DoubleSide,
						blending: THREE.AdditiveBlending
					});
					const ring = new THREE.Mesh(rg, rm);
					sc.add(ring);
					return [ring];
				},
				tickExtras(e, t) {
					const ring = e[0] as THREE.Mesh;
					const s = t * 14;
					ring.scale.set(s, s, 1);
					(ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - t * 1.4);
				}
			};
		}

		/* ———— PARTY: celebratory confetti ———— */
		function mkParty(): V {
			const N = 220;
			const pos = new Float32Array(N * 3);
			const vel = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const pal = [
				color("#8b5cf6"),
				color("#ec4899"),
				color("#ef4444"),
				color("#f59e0b"),
				color("#10b981"),
				color("#3b82f6"),
				color("#ffffff"),
				color("#fbbf24")
			];

			for (let i = 0; i < N; i++) {
				pos[i * 3] = rr(-0.5, 0.5);
				pos[i * 3 + 1] = rr(-1.5, -0.5);
				pos[i * 3 + 2] = rr(-0.4, 0.4);
				vel[i * 3] = rr(-3, 3);
				vel[i * 3 + 1] = rr(4, 9);
				vel[i * 3 + 2] = rr(-0.6, 0.6);
				const c = pick(pal);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				sz[i] = rr(0.08, 0.28);
			}
			return {
				pos,
				col,
				sz,
				tick(_, dt) {
					for (let i = 0; i < N; i++) {
						const i3 = i * 3;
						vel[i3] *= 0.985;
						vel[i3 + 1] *= 0.985;
						vel[i3 + 1] -= 5.5 * dt;
						pos[i3] += vel[i3] * dt;
						pos[i3 + 1] += vel[i3 + 1] * dt;
						pos[i3 + 2] += vel[i3 + 2] * dt;
						sz[i] *= 1 - 0.12 * dt;
					}
				}
			};
		}

		/* ———— PRODUCTION: mechanical spinning pulse ———— */
		function mkProduction(): V {
			const N = 150;
			const pos = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const baseAngle = new Float32Array(N);
			const baseRadius = new Float32Array(N);
			const speed = new Float32Array(N);
			const pal = [color("#f59e0b"), color("#f97316"), color("#06b6d4"), color("#fbbf24"), color("#ffffff")];

			for (let i = 0; i < N; i++) {
				baseAngle[i] = (i / N) * Math.PI * 2 + rr(-0.15, 0.15);
				baseRadius[i] = rr(0.3, 1.2);
				speed[i] = rr(2, 5);
				const c = pick(pal);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				sz[i] = rr(0.07, 0.22);
			}
			let elapsed = 0;
			return {
				pos,
				col,
				sz,
				tick(t, dt) {
					elapsed += dt;
					const expand = t < 0.4 ? t / 0.4 : 1 + (t - 0.4) * 3;
					for (let i = 0; i < N; i++) {
						const a = baseAngle[i] + elapsed * speed[i];
						const r = baseRadius[i] * expand;
						pos[i * 3] = Math.cos(a) * r;
						pos[i * 3 + 1] = Math.sin(a) * r;
						pos[i * 3 + 2] = rr(-0.05, 0.05);
						sz[i] = rr(0.06, 0.2) * (0.7 + 0.3 * Math.sin(elapsed * 6 + i));
					}
				}
			};
		}

		/* ———— TRAINING: disciplined upward column burst ———— */
		function mkTraining(): V {
			const N = 160;
			const pos = new Float32Array(N * 3);
			const vel = new Float32Array(N * 3);
			const col = new Float32Array(N * 3);
			const sz = new Float32Array(N);
			const pal = [color("#34d399"), color("#10b981"), color("#059669"), color("#6ee7b7"), color("#d1fae5")];

			const cols = 5;
			for (let i = 0; i < N; i++) {
				const colIdx = i % cols;
				const xSpread = ((colIdx - (cols - 1) / 2) / cols) * 2;
				pos[i * 3] = xSpread + rr(-0.15, 0.15);
				pos[i * 3 + 1] = rr(-0.3, 0.1);
				pos[i * 3 + 2] = rr(-0.3, 0.3);
				vel[i * 3] = rr(-0.6, 0.6);
				vel[i * 3 + 1] = rr(3, 7);
				vel[i * 3 + 2] = rr(-0.3, 0.3);
				const c = pick(pal);
				col[i * 3] = c.r;
				col[i * 3 + 1] = c.g;
				col[i * 3 + 2] = c.b;
				sz[i] = rr(0.07, 0.22);
			}
			return {
				pos,
				col,
				sz,
				tick(_, dt) {
					for (let i = 0; i < N; i++) {
						const i3 = i * 3;
						vel[i3] *= 0.98;
						vel[i3 + 1] *= 0.98;
						vel[i3 + 1] -= 2.0 * dt;
						pos[i3] += vel[i3] * dt;
						pos[i3 + 1] += vel[i3 + 1] * dt;
						pos[i3 + 2] += vel[i3 + 2] * dt;
						sz[i] *= 1 - 0.18 * dt;
					}
				}
			};
		}

		/* ── build selected variant ── */
		const builders: Record<string, () => V> = {
			battle: mkBattle,
			vote: mkVote,
			collect: mkCollect,
			company: mkCompany,
			party: mkParty,
			production: mkProduction,
			training: mkTraining
		};
		const v = builders[variant]();

		/* ── particle geometry + shader ── */
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.Float32BufferAttribute(v.pos, 3));
		geo.setAttribute("aColor", new THREE.Float32BufferAttribute(v.col, 3));
		geo.setAttribute("aSize", new THREE.Float32BufferAttribute(v.sz, 1));

		const mat = new THREE.ShaderMaterial({
			uniforms: { uTex: { value: tex }, uAlpha: { value: 1.0 } },
			vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vCol;
        void main() {
          vCol = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
			fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        uniform float uAlpha;
        varying vec3 vCol;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vCol, t.a * uAlpha);
        }
      `,
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});

		const pts = new THREE.Points(geo, mat);
		scene.add(pts);

		const extras = v.extras?.(scene) ?? [];

		/* ── animation loop ── */
		let disposed = false;
		let raf: number;
		const t0 = performance.now();
		let prev = t0;

		function loop() {
			if (disposed) return;
			const now = performance.now();
			const t = Math.min((now - t0) / dur, 1);
			const dt = Math.min((now - prev) / 1000, 0.05);
			prev = now;

			v.tick(t, dt);

			geo.attributes.position.needsUpdate = true;
			(geo.attributes as any).aSize.needsUpdate = true;

			mat.uniforms.uAlpha.value = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;

			v.tickExtras?.(extras, t);

			renderer.render(scene, cam);

			if (t < 1) {
				raf = requestAnimationFrame(loop);
			} else {
				dispose();
				onComplete?.();
			}
		}
		raf = requestAnimationFrame(loop);

		/* ── cleanup ── */
		function dispose() {
			if (disposed) return;
			disposed = true;
			cancelAnimationFrame(raf);
			geo.dispose();
			mat.dispose();
			tex.dispose();
			for (const o of extras) {
				scene.remove(o);
				if ("geometry" in o && typeof (o as any).geometry?.dispose === "function") (o as any).geometry.dispose();
				if ("material" in o) {
					const m = (o as any).material;
					if (Array.isArray(m)) m.forEach((x: any) => x.dispose());
					else if (typeof m?.dispose === "function") m.dispose();
				}
			}
			renderer.dispose();
			if (el?.contains(renderer.domElement)) el.removeChild(renderer.domElement);
		}

		return dispose;
	});
</script>

<div bind:this={el} class="fixed inset-0 z-[9999] pointer-events-none"></div>
