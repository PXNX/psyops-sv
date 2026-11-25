<!-- src/lib/component/infiltration/HackTerminal.svelte -->
<!-- The operator terminal, full screen: green phosphor on black, scanlines,
     a gently curved and flickering CRT, typewriter output and (optionally)
     glyphs raining down behind it. Typed commands are a skin over the network
     page's existing form actions (scan, access, escalate, pivot, browse, read,
     grep, copy, cameras, cover tracks, payloads): the server still decides
     every roll, this only makes it look like the movies. -->
<script lang="ts">
	import { deserialize } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { onMount, tick } from "svelte";
	import { ATTACK_VECTORS, COVERT_OPS, INFILTRATION_ACTIONS, INTRUSION, type LogLine } from "#lib/config/index.js";
	import CameraWall from "./CameraWall.svelte";

	interface Props {
		site: any;
		asset: any;
		session: any | null;
		treasury: number;
		onClose: () => void;
		onResult?: (data: any) => void;
	}
	let { site, asset, session, treasury, onClose, onResult }: Props = $props();

	type Tone = LogLine["tone"] | "cmd" | "plain";
	type Out = { text: string; tone: Tone; shown: number };

	const PAYLOADS = [
		"grid_attack",
		"c2_disruption",
		"comms_intercept",
		"air_defence_spoof",
		"supply_chain",
		"financial_theft"
	] as const;

	let out = $state<Out[]>([]);
	let input = $state("");
	let busy = $state(false);
	let cwd = $state("/");
	let listing = $state<{ id: string; name: string; path: string }[]>([]);
	let history: string[] = [];
	let historyAt = -1;
	let camsOpen = $state(false);
	let camsTapped = $state(false);
	let rain = $state(true);
	let reduced = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();
	let screenEl: HTMLElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();

	/** Index of the line still being typed; later lines wait their turn. */
	const pending = $derived(out.findIndex((l) => l.shown < l.text.length));
	const stage = $derived<string | null>(session?.stage ?? null);
	const exploitable = $derived(
		((session?.ports ?? []) as { port: number; service: string; vector?: string }[]).filter((p) => p.vector)
	);
	const camsReady = $derived(camsTapped || (site?.cameras ?? 0) > 0);
	const prompt = $derived(
		`${asset.codename.toLowerCase().replace(/\s+/g, "-")}@${stage === "pivot" ? (session?.host ?? site.code) : "relay"}:${stage === "pivot" ? cwd : "~"}$`
	);

	// ── Output ──────────────────────────────────────────────────────────────
	function say(text: string, tone: Tone = "plain") {
		out.push({ text, tone, shown: reduced ? text.length : 0 });
		if (out.length > 400) out.splice(0, out.length - 400);
	}
	const sayAll = (lines: { line: string; tone: LogLine["tone"] }[] = []) => lines.forEach((l) => say(l.line, l.tone));

	// Typewriter: reveal the first unfinished line a few characters per tick.
	// A timer rather than requestAnimationFrame, which some embedded and
	// background views throttle to a crawl; it only runs while text is waiting,
	// and a long backlog types faster so the player is never kept waiting.
	$effect(() => {
		if (reduced || pending < 0) return;
		const timer = setInterval(() => {
			const at = out.findIndex((l) => l.shown < l.text.length);
			const next = out[at];
			if (!next) return;
			const backlog = out.length - at;
			const step = Math.max(3, Math.ceil(next.text.length / (backlog > 8 ? 4 : 12)));
			next.shown = Math.min(next.text.length, next.shown + step);
		}, 24);
		return () => clearInterval(timer);
	});
	/** Show everything at once (a click or a new command skips the animation). */
	const skipTyping = () => {
		for (const l of out) l.shown = l.text.length;
	};
	// Keep the newest line in view.
	$effect(() => {
		void out.length;
		void out.at(-1)?.shown;
		if (screenEl) screenEl.scrollTop = screenEl.scrollHeight;
	});

	// ── Server ──────────────────────────────────────────────────────────────
	async function post(action: string, fields: Record<string, string | number>) {
		const body = new FormData();
		body.set("assetId", String(asset.id));
		body.set("siteId", site.id);
		for (const [k, v] of Object.entries(fields)) body.set(k, String(v));
		const res = await fetch(`?/${action}`, {
			method: "POST",
			body,
			headers: { "x-sveltekit-action": "true" }
		});
		const result = deserialize(await res.text());
		if (result.type === "success") {
			await invalidateAll();
			onResult?.(result.data);
			return result.data as any;
		}
		if (result.type === "failure") throw new Error((result.data as any)?.error ?? "The server said no.");
		if (result.type === "error") throw new Error(result.error?.message ?? "Connection dropped.");
		throw new Error("Unexpected answer from the relay.");
	}

	const money = (n: number) => `$${n.toLocaleString()}`;
	const resolvePath = (arg: string) => {
		if (arg.startsWith("/")) return arg.replace(/\/+$/, "") || "/";
		const base = cwd === "/" ? "" : cwd;
		const parts = `${base}/${arg}`.split("/").filter(Boolean);
		const stack: string[] = [];
		for (const p of parts) {
			if (p === "..") stack.pop();
			else if (p !== ".") stack.push(p);
		}
		return "/" + stack.join("/");
	};
	const recordId = (arg: string) => {
		const hit = listing.find((f) => f.name === arg || f.path === arg);
		return hit ? hit.id : resolvePath(arg).slice(1);
	};
	const needPivot = () => {
		if (stage === "pivot") return false;
		say("Not inside yet! Scan, exploit, sudo and ssh first. (try `help`)", "warn");
		return true;
	};

	// ── Commands ────────────────────────────────────────────────────────────
	const HELP: [string, string][] = [
		["help", "this friendly list"],
		["scan", `map the host's open ports · ${money(INTRUSION.SCAN_COST)}`],
		["exploit <port>", `try a way in through a port · ${money(INTRUSION.ACCESS_COST)}`],
		["sudo", `escalate to admin · ${money(INTRUSION.ESCALATE_COST)}`],
		["ssh <host>", `hop into the internal network · ${money(INTRUSION.PIVOT_COST)}`],
		["ls [dir] · cd <dir>", "look around the host"],
		["cat <file>", "read a file"],
		["grep <word>", "search every file"],
		["copy <file>", "copy a file into the dossier (adds heat)"],
		["cams", `the camera wall (first tap ${money(INFILTRATION_ACTIONS.camera.cost)})`],
		["probe", `count the guards · ${money(INFILTRATION_ACTIONS.probe.cost)}`],
		["wipe logs", `cover your tracks, −heat · ${money(INFILTRATION_ACTIONS.cover.cost)}`],
		["deploy <payload>", "launch a cyber payload once inside"],
		["reset", "drop the session and start over"],
		["rain", "toggle the falling glyphs"],
		["clear · exit", "tidy up · leave (or press Esc)"]
	];

	async function run(raw: string) {
		const line = raw.trim();
		if (!line || busy) return;
		skipTyping();
		history.unshift(line);
		historyAt = -1;
		say(`${prompt} ${line}`, "cmd");
		const [cmd = "", ...rest] = line.split(/\s+/);
		const arg = rest.join(" ");
		busy = true;
		try {
			await exec(cmd.toLowerCase(), arg);
		} catch (err) {
			say(`✗ ${(err as Error).message}`, "bad");
		} finally {
			busy = false;
			await tick();
			inputEl?.focus();
		}
	}

	async function exec(cmd: string, arg: string) {
		switch (cmd) {
			case "help":
			case "?":
				say("Available commands (all moves are rolled on the server):", "info");
				for (const [c, d] of HELP) say(`  ${c.padEnd(20)} ${d}`, "plain");
				return;
			case "clear":
				out.length = 0;
				return;
			case "exit":
			case "quit":
			case "logout":
				onClose();
				return;
			case "rain":
				rain = !rain;
				say(rain ? "☔ It's raining glyphs again." : "The glyph rain stops. How calm.", "info");
				return;
			case "whoami":
				say(`${asset.codename} · L${asset.access} access · heat ${asset.heat}%`, "info");
				return;
			case "pwd":
				say(cwd, "plain");
				return;
			case "scan":
			case "nmap": {
				if (session) {
					say(`Already mapped ${session.host} (${session.ip}):`, "info");
					for (const p of session.ports) {
						say(`  ${String(p.port).padEnd(6)} ${p.service.padEnd(11)} ${p.version}${p.vector ? "  ★" : ""}`, "ok");
					}
					say("★ = a way in. Try `exploit <port>`.", "info");
					return;
				}
				say("Knocking politely on every port…", "info");
				const d = await post("intrude", { step: "scan" });
				sayAll(d.intrusion?.lines);
				return;
			}
			case "exploit": {
				if (!session) return say("Scan first so we know which doors exist.", "warn");
				if (stage !== "scan") return say("You already have a way in. Next up: `sudo`.", "info");
				const port = Number(arg);
				const target = exploitable.find((p) => p.port === port) ?? (arg ? undefined : exploitable[0]);
				if (!target?.vector) {
					return say(
						`Port ${arg || "?"} has no known way in. Try: ${exploitable.map((p) => p.port).join(", ")}`,
						"warn"
					);
				}
				const v = ATTACK_VECTORS[target.vector];
				say(`Trying ${v?.label ?? target.vector} on :${target.port}…`, "info");
				const d = await post("intrude", { step: "access", vector: target.vector });
				sayAll(d.intrusion?.lines);
				return;
			}
			case "sudo":
			case "escalate": {
				if (stage !== "access") {
					return say(stage ? "Nothing to escalate right now." : "Get a shell first (`scan`, `exploit`).", "warn");
				}
				const d = await post("intrude", { step: "escalate" });
				sayAll(d.intrusion?.lines);
				return;
			}
			case "ssh":
			case "pivot": {
				if (stage === "pivot")
					return say(`You're already inside ${session.segment ?? "the network"}. Make yourself at home.`, "info");
				if (stage !== "escalate") return say("The jump host wants admin rights. Run `sudo` first.", "warn");
				say(`Hopping to ${arg || "the internal segment"}…`, "info");
				const d = await post("intrude", { step: "pivot" });
				sayAll(d.intrusion?.lines);
				if (d.intrusion?.success) say("Welcome in! Try `ls`, `cams` or `deploy`.", "ok");
				return;
			}
			case "ls":
			case "dir":
			case "cd": {
				if (needPivot()) return;
				const path = arg ? resolvePath(arg) : cmd === "cd" ? "/" : cwd;
				const d = await post("browse", { path });
				cwd = d.browse.path;
				listing = d.browse.files;
				if (cmd !== "cd") sayAll(d.browse.lines);
				else say(`→ ${cwd}`, "info");
				return;
			}
			case "cat":
			case "less":
			case "more": {
				if (needPivot()) return;
				if (!arg) return say("cat what? Try `ls` first.", "warn");
				const d = await post("read", { recordId: recordId(arg) });
				const r = d.read.record;
				say(`── ${r.name} · ${r.classification} · ${r.author} · ${r.date} ──`, "warn");
				for (const l of String(r.body).split("\n")) say(l, "plain");
				say(`── end · \`copy ${r.name}\` to keep it ──`, "info");
				return;
			}
			case "grep":
			case "find": {
				if (needPivot()) return;
				if (!arg) return say("grep for what? e.g. `grep plan`", "warn");
				const d = await post("grep", { query: arg });
				sayAll(d.grep.lines);
				return;
			}
			case "copy":
			case "scp":
			case "exfil": {
				if (needPivot()) return;
				if (!arg) return say("copy which file?", "warn");
				const d = await post("exfil", { recordId: recordId(arg) });
				say(`📎 ${d.exfil.file.title} is in the dossier. −${money(d.exfil.cost)}, heat now ${d.exfil.heat}%.`, "ok");
				if (d.exfil.burned) say(`${asset.codename} got burned on the way out. Oops.`, "bad");
				return;
			}
			case "cams":
			case "cctv": {
				if (!camsReady) {
					say("Tapping the camera network…", "info");
					const d = await post("act", { action: "camera" });
					const o = d.outcome;
					say(o.detail, o.success ? "ok" : "bad");
					if (!o.success) return say(`No picture this time (${o.chance}% chance). Try again?`, "warn");
					camsTapped = true;
				}
				say("📺 Camera wall online. Grid, single view, night vision, thermal, PTZ and fisheye are all yours.", "ok");
				camsOpen = true;
				return;
			}
			case "probe": {
				const d = await post("act", { action: "probe" });
				say(d.outcome.detail, d.outcome.success ? "ok" : "bad");
				return;
			}
			case "wipe":
			case "cover": {
				if (cmd === "wipe" && arg && !/^logs?$/i.test(arg)) return say("Usage: `wipe logs`", "warn");
				say("Sweeping the logs under the rug…", "info");
				const d = await post("act", { action: "cover" });
				say(`🧹 ${d.outcome.detail} Heat now ${d.outcome.heatAfter}%.`, "ok");
				return;
			}
			case "deploy": {
				if (needPivot()) return;
				const kind = PAYLOADS.find((k) => k === arg || COVERT_OPS[k].label.toLowerCase() === arg.toLowerCase());
				if (!kind) {
					say("Pick a payload:", "info");
					for (const k of PAYLOADS)
						say(`  deploy ${k.padEnd(18)} ${COVERT_OPS[k].label} · ${money(COVERT_OPS[k].cost)}`, "plain");
					return;
				}
				say(`Deploying ${COVERT_OPS[kind].label.toLowerCase()}… fingers crossed.`, "info");
				const d = await post("payload", { kind, targetStateId: session.targetStateId });
				const p = d.payload;
				say(
					p.succeeded
						? `🎉 ${COVERT_OPS[kind].label} landed on ${p.target}! (traced ${p.attributionChance}%)`
						: `${COVERT_OPS[kind].label} fizzled against ${p.target}. Better luck next time.`,
					p.succeeded ? "ok" : "bad"
				);
				return;
			}
			case "reset": {
				if (!session) return say("No session to reset.", "info");
				await post("intrude", { step: "reset" });
				cwd = "/";
				listing = [];
				say("Session dropped. Fresh start!", "info");
				return;
			}
			default:
				say(`${cmd}: command not found. Type \`help\` for the list.`, "warn");
		}
	}

	// Context-sensitive one-tap suggestions (mobile has no fun keyboard).
	const suggestions = $derived.by(() => {
		const s: string[] = [];
		if (!session) s.push("scan");
		else if (stage === "scan") s.push(...exploitable.map((p) => `exploit ${p.port}`), "scan");
		else if (stage === "access") s.push("sudo");
		else if (stage === "escalate") s.push(`ssh ${session.segment ?? "jump-host"}`);
		else s.push("ls", ...listing.slice(0, 2).map((f) => `cat ${f.name}`), "grep plan", "deploy");
		s.push("cams", "wipe logs", "help", "exit");
		return [...new Set(s)];
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			if (camsOpen) camsOpen = false;
			else onClose();
		}
	}
	function onInputKey(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			const v = input;
			input = "";
			void run(v);
		} else if (e.key === "ArrowUp" && history.length) {
			e.preventDefault();
			historyAt = Math.min(history.length - 1, historyAt + 1);
			input = history[historyAt] ?? "";
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			historyAt = Math.max(-1, historyAt - 1);
			input = historyAt < 0 ? "" : (history[historyAt] ?? "");
		}
	}

	// ── Glyph rain ──────────────────────────────────────────────────────────
	$effect(() => {
		if (!rain || reduced || !canvas) return;
		const c = canvas;
		const ctx = c.getContext("2d");
		if (!ctx) return;
		const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789$#*+<>=";
		const size = 16;
		let drops: number[] = [];
		const resize = () => {
			c.width = c.clientWidth;
			c.height = c.clientHeight;
			drops = Array.from({ length: Math.ceil(c.width / size) }, () => Math.random() * -50);
		};
		resize();
		window.addEventListener("resize", resize);
		let last = 0;
		let raf = 0;
		const draw = (t: number) => {
			raf = requestAnimationFrame(draw);
			if (t - last < 60) return;
			last = t;
			ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
			ctx.fillRect(0, 0, c.width, c.height);
			ctx.font = `${size}px ui-monospace, monospace`;
			for (let i = 0; i < drops.length; i++) {
				const y = drops[i]! * size;
				ctx.fillStyle = Math.random() < 0.05 ? "#d8ffe2" : "#1fbf5a";
				ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)]!, i * size, y);
				drops[i] = y > c.height && Math.random() > 0.97 ? 0 : drops[i]! + 1;
			}
		};
		raf = requestAnimationFrame(draw);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
			ctx.clearRect(0, 0, c.width, c.height);
		};
	});

	onMount(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		reduced = mq.matches;
		try {
			rain = localStorage.getItem("hack-terminal-rain") !== "off";
		} catch {
			/* storage blocked: keep the default */
		}
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		say(`PSYOPS NETSHELL v4.2 · secure relay via “${asset.codename}”`, "ok");
		say(`Target: ${site.name} (${site.code}) · treasury ${money(treasury ?? 0)}`, "info");
		if ((session?.log ?? []).length) {
			say("── replaying this session ──", "info");
			for (const l of (session.log as LogLine[]).slice(-12)) say(l.line, l.tone);
			say("── live ──", "info");
		}
		say(
			stage === "pivot"
				? "You're inside. `ls`, `cams` or `deploy` when ready."
				: "Type `help` to see what you can do, or tap a suggestion below. Have fun!",
			"plain"
		);
		inputEl?.focus();
		return () => {
			document.body.style.overflow = prev;
		};
	});
	$effect(() => {
		const v = rain ? "on" : "off";
		try {
			localStorage.setItem("hack-terminal-rain", v);
		} catch {
			/* ignore */
		}
	});

	const toneClass: Record<Tone, string> = {
		cmd: "text-[#d8ffe2]",
		plain: "text-[#8dffb0]",
		info: "text-[#5fd389]",
		ok: "text-[#b6ffcb]",
		warn: "text-[#ffe27a]",
		bad: "text-[#ff8a7a]"
	};
</script>

<svelte:window onkeydown={onKey} />

<div
	class="fixed inset-0 z-[100] bg-black"
	role="dialog"
	aria-modal="true"
	aria-label="Operator terminal for {site.code}"
>
	<div class="crt-frame absolute inset-0 sm:inset-3">
		<div class="crt-screen relative flex h-full flex-col overflow-hidden" class:flicker={!reduced}>
			{#if rain && !reduced}
				<canvas
					bind:this={canvas}
					class="pointer-events-none absolute inset-0 h-full w-full opacity-25"
					aria-hidden="true"
				></canvas>
			{/if}

			<header
				class="relative z-10 flex items-center justify-between gap-2 border-b border-[#1f6f3a]/70 px-3 py-2 font-mono text-[11px] tracking-[0.18em] text-[#5fd389] uppercase"
			>
				<span class="truncate">▌netshell · {site.code} · {asset.codename}</span>
				<span class="flex shrink-0 items-center gap-3">
					<span class="hidden sm:inline">heat {asset.heat}%</span>
					<button
						type="button"
						class="text-[#5fd389] hover:text-[#d8ffe2]"
						onclick={() => (rain = !rain)}
						aria-pressed={rain}
						disabled={reduced}
						title={reduced ? "Off while reduced motion is on" : "Toggle glyph rain"}
					>
						rain {rain && !reduced ? "on" : "off"}
					</button>
					<button
						type="button"
						class="text-[#ff8a7a] hover:text-white"
						onclick={onClose}
						aria-label="Leave the terminal"
					>
						[esc] exit
					</button>
				</span>
			</header>

			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				bind:this={screenEl}
				class="crt-text relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-3 font-mono text-[13px] leading-relaxed sm:px-5 sm:text-sm"
				aria-live="polite"
				role="log"
				onclick={() => {
					skipTyping();
					inputEl?.focus();
				}}
				onkeydown={() => {}}
				tabindex="-1"
			>
				{#each out as l, i (i)}
					{#if pending < 0 || i <= pending}
						<div class="break-words whitespace-pre-wrap {toneClass[l.tone]}">
							{l.text.slice(0, l.shown)}{#if l.shown < l.text.length}<span class="caret">█</span>{/if}
						</div>
					{/if}
				{/each}
				{#if busy}<div class="text-[#5fd389]">working<span class="dots">…</span></div>{/if}

				{#if camsOpen}
					<div class="mt-3 border border-[#1f6f3a] bg-black/80 p-2">
						<div class="mb-2 flex items-center justify-between text-[11px] tracking-[0.18em] text-[#5fd389] uppercase">
							<span>camera wall · {site.name}</span>
							<button type="button" class="hover:text-[#d8ffe2]" onclick={() => (camsOpen = false)}>[x] close</button>
						</div>
						<CameraWall {site} observedAt={site.lastSeen ?? undefined} terminal />
					</div>
				{/if}
			</div>

			<div class="relative z-10 border-t border-[#1f6f3a]/70 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<div class="mb-2 flex flex-wrap gap-1.5" aria-label="Suggested commands">
					{#each suggestions as s (s)}
						<button
							type="button"
							disabled={busy}
							onclick={() => run(s)}
							class="border border-[#1f6f3a] bg-black/70 px-2 py-1 font-mono text-[11px] text-[#8dffb0] hover:bg-[#0f3a1f] disabled:opacity-40"
						>
							{s}
						</button>
					{/each}
				</div>
				<label class="flex items-center gap-2 font-mono text-[13px] text-[#b6ffcb] sm:text-sm">
					<span class="hidden shrink-0 text-[#5fd389] sm:inline">{prompt}</span>
					<span class="shrink-0 text-[#5fd389] sm:hidden">$</span>
					<input
						bind:this={inputEl}
						bind:value={input}
						onkeydown={onInputKey}
						disabled={busy}
						class="crt-input min-w-0 flex-1 bg-transparent text-[#d8ffe2] caret-[#7dffa0] outline-none"
						autocomplete="off"
						autocapitalize="off"
						spellcheck="false"
						enterkeyhint="send"
						aria-label="Command"
						placeholder="type a command, e.g. help"
					/>
				</label>
			</div>

			<div class="crt-lines pointer-events-none absolute inset-0 z-20" aria-hidden="true"></div>
			<div class="crt-vignette pointer-events-none absolute inset-0 z-20" aria-hidden="true"></div>
		</div>
	</div>
</div>

<style>
	.crt-frame {
		background: #020402;
		border-radius: 0;
	}
	.crt-screen {
		background: radial-gradient(ellipse at center, #031a0b 0%, #010a04 70%, #000 100%);
	}
	@media (min-width: 640px) {
		.crt-frame {
			border-radius: 28px / 22px;
			box-shadow:
				0 0 0 2px #0b2a15,
				0 0 60px rgba(31, 191, 90, 0.18);
			overflow: hidden;
		}
		/* A slight barrel: the glass bulges toward the viewer. */
		.crt-screen {
			border-radius: 28px / 22px;
			transform: perspective(1400px) scale(0.995);
			box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.85);
		}
	}
	.crt-text,
	.crt-input {
		text-shadow:
			0 0 2px rgba(125, 255, 160, 0.8),
			0 0 10px rgba(31, 191, 90, 0.45);
	}
	.crt-input::placeholder {
		color: rgba(125, 255, 160, 0.35);
	}
	.crt-lines {
		background: repeating-linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0) 0 2px,
			rgba(0, 0, 0, 0.28) 3px,
			rgba(0, 0, 0, 0) 4px
		);
	}
	.crt-vignette {
		background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.75) 100%);
	}
	.flicker {
		animation: flicker 6s infinite steps(1, end);
	}
	.caret {
		animation: blink 0.8s steps(1, end) infinite;
	}
	@keyframes flicker {
		0%,
		100% {
			opacity: 1;
		}
		47% {
			opacity: 0.96;
		}
		48% {
			opacity: 1;
		}
		81% {
			opacity: 0.94;
		}
		82% {
			opacity: 1;
		}
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.flicker,
		.caret {
			animation: none;
		}
	}
</style>
