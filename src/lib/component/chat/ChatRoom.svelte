<!-- A full-height conversation: floating header, message list and composer.
     Used by the global, party and direct chat pages, which only supply the
     header, the messages and which form action sends. -->
<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import { onMount, tick, untrack } from "svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { cubicOut } from "svelte/easing";
	import { enhance } from "$app/forms";
	import { invalidate } from "$app/navigation";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import FluentArrowDown20Filled from "~icons/fluent/arrow-down-20-filled";
	import FluentCopy20Filled from "~icons/fluent/copy-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentPersonProhibited20Filled from "~icons/fluent/person-prohibited-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import ReportMessageModal from "#lib/component/ReportMessageModal.svelte";
	import BlockUserModal from "#lib/component/BlockUserModal.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Button, IconButton, Badge, ActionListItem } from "#lib/component/ui/index.js";
	import { settings } from "#lib/settings.svelte.js";
	import { toast, toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmAction } from "#lib/ui/confirm.svelte.js";
	import { vanish } from "#lib/utils/motion.js";
	import { type ChatMessage, clockTime, dayKey, dayLabel, isEmojiOnly, isImageUrl, linkify, markSeen } from "./chat";

	interface Props {
		/** Stable id of the conversation, for unread tracking ("global", "party:3", "user:abc"). */
		conversation: string;
		messages: ChatMessage[];
		currentUserId: string;
		/** Form action that sends: "?/send" or "?/postMessage". */
		sendAction: string;
		/** Group channels show who wrote each run of messages; a direct chat does not. */
		showSenders?: boolean;
		canModerate?: boolean;
		/** Offer "Block" in the message sheet (group channels; direct chats block from the header). */
		allowBlock?: boolean;
		placeholder?: string;
		emptyIcon: Component;
		emptyText?: string;
		/** Title area of the header (avatar + name). */
		header: Snippet;
		headerActions?: Snippet;
		/** Replaces the composer, e.g. when the conversation is blocked. */
		locked?: Snippet;
	}

	let {
		conversation,
		messages,
		currentUserId,
		sendAction,
		showSenders = true,
		canModerate = false,
		allowBlock = false,
		placeholder = "Message",
		emptyIcon: EmptyIcon,
		emptyText = "No messages yet",
		header,
		headerActions,
		locked
	}: Props = $props();

	const MAX_LENGTH = 500;
	const GROUP_GAP_MS = 5 * 60_000;

	// ---- Sending, with the message shown straight away -------------------------
	type Pending = ChatMessage & { key: string; realId: number | null };

	let draft = $state("");
	let sending = $state(false);
	let pending = $state<Pending[]>([]);
	let seq = 0;
	let textarea = $state<HTMLTextAreaElement>();

	/** Real ids that took over a pending message's row key, so the bubble stays put when it's confirmed. */
	const aliases = new Map<number, string>();
	/** Messages being deleted: hidden at once, restored if the delete fails. */
	const hidden = new SvelteSet<number>();

	const canSend = $derived(draft.trim().length > 0 && draft.length <= MAX_LENGTH);

	function resizeInput() {
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
	}

	function onKeydown(e: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
		if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			e.currentTarget.form?.requestSubmit();
		}
	}

	// ---- Rows: day separators, sender headers and bubbles in one flat keyed list
	type Row =
		| { kind: "day"; key: string; label: string }
		| { kind: "sender"; key: string; msg: ChatMessage }
		| {
				kind: "msg";
				key: string;
				msg: ChatMessage;
				mine: boolean;
				first: boolean;
				last: boolean;
				optimistic: boolean;
		  };

	const timeline = $derived.by(() => {
		const real = messages.filter((m) => !hidden.has(m.id));

		// A pending message is replaced by its stored copy once that arrives,
		// matched by id (from the action) or, if the live update won the race,
		// by content.
		const claimed = new Set<number>();
		const shown: Pending[] = [];
		for (const p of pending) {
			const match =
				real.find((m) => p.realId != null && m.id === p.realId) ??
				real.find(
					(m) =>
						m.isFromCurrentUser &&
						!claimed.has(m.id) &&
						!aliases.has(m.id) &&
						m.content === p.content &&
						new Date(m.sentAt).getTime() >= new Date(p.sentAt).getTime() - 15_000
				);
			if (match) {
				claimed.add(match.id);
				aliases.set(match.id, p.key);
			} else {
				shown.push(p);
			}
		}

		const all: (ChatMessage & { key: string; optimistic: boolean })[] = [
			...real.map((m) => ({ ...m, key: aliases.get(m.id) ?? `m${m.id}`, optimistic: false })),
			...shown.map((p) => ({ ...p, optimistic: true }))
		];

		const rows: Row[] = [];
		let prev: (typeof all)[number] | null = null;
		all.forEach((msg, i) => {
			const day = dayKey(msg.sentAt);
			const newDay = !prev || dayKey(prev.sentAt) !== day;
			const sameRun = (a: typeof msg | undefined | null, b: typeof msg) =>
				!!a &&
				a.senderId === b.senderId &&
				dayKey(a.sentAt) === dayKey(b.sentAt) &&
				Math.abs(new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()) < GROUP_GAP_MS;

			if (newDay) rows.push({ kind: "day", key: `d${day}`, label: dayLabel(msg.sentAt) });
			const first = !sameRun(prev, msg);
			const last = !sameRun(all[i + 1], msg) || dayKey(all[i + 1].sentAt) !== day;
			if (first && showSenders && !msg.isFromCurrentUser) rows.push({ kind: "sender", key: `s${msg.key}`, msg });
			rows.push({
				kind: "msg",
				key: msg.key,
				msg,
				mine: msg.isFromCurrentUser,
				first,
				last,
				optimistic: msg.optimistic
			});
			prev = msg;
		});
		return { rows, count: all.length, latest: all.at(-1) ?? null };
	});

	// ---- Scrolling: open at the newest message and stay pinned while at the bottom
	let scroller = $state<HTMLDivElement>();
	let list = $state<HTMLDivElement>();
	let atBottom = $state(true);
	let unseen = $state(0);
	let ready = $state(false);

	function scrollToBottom(smooth = false) {
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? "smooth" : "auto" });
	}

	function onScroll() {
		if (!scroller) return;
		atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
		if (atBottom) unseen = 0;
	}

	onMount(() => {
		scrollToBottom();
		// Images and arriving bubbles grow the list; keep the newest message in view.
		const ro = new ResizeObserver(() => {
			if (atBottom) scrollToBottom();
		});
		if (list) ro.observe(list);
		requestAnimationFrame(() => (ready = true));
		return () => ro.disconnect();
	});

	let lastCount = 0;
	let lastLatestKey: string | null = null;
	$effect(() => {
		const { count, latest } = timeline;
		if (ready && latest && latest.key !== lastLatestKey && count > lastCount) {
			if (latest.isFromCurrentUser || atBottom) tick().then(() => scrollToBottom(true));
			else unseen = untrack(() => unseen) + count - lastCount;
		}
		lastCount = count;
		lastLatestKey = latest?.key ?? null;
	});

	// Everything on screen counts as read.
	$effect(() => {
		const latest = messages.at(-1);
		markSeen(conversation, latest?.sentAt ?? new Date(0).toISOString());
	});

	// ---- Live updates ------------------------------------------------------------
	onMount(() => {
		const source = new EventSource("/chat/stream");
		let connectedOnce = false;
		source.addEventListener("message", (event) => {
			const payload = JSON.parse(event.data);
			if (payload.type === "new_messages") invalidate("app:chat");
			// Catch up on anything missed while the stream was reconnecting.
			if (payload.type === "connected") {
				if (connectedOnce) invalidate("app:chat");
				connectedOnce = true;
			}
		});
		return () => source.close();
	});

	// ---- Arrival animation: bubbles pop up from their own side -------------------
	function arrive(node: Element, { mine }: { mine: boolean }) {
		const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (!ready || reduced) return { duration: 0 };
		return {
			duration: 260,
			css: (t: number) => {
				const e = cubicOut(t);
				return `opacity: ${Math.min(1, t * 1.6)}; transform: translate(${(1 - e) * (mine ? 10 : -10)}px, ${(1 - e) * 6}px);`;
			}
		};
	}

	// ---- Message actions ---------------------------------------------------------
	let sheetFor = $state<ChatMessage | null>(null);
	let sheetOpen = $state(false);
	let reportOpen = $state(false);
	let reportTarget = $state<ChatMessage | null>(null);
	let blockOpen = $state(false);
	let blockTarget = $state<ChatMessage | null>(null);
	let deleteForm = $state<HTMLFormElement>();
	let deleteId = $state<number | null>(null);

	function openSheet(msg: ChatMessage, e?: Event) {
		// Selecting text or tapping a link should not open the sheet.
		if (e && (e.target as HTMLElement).closest("a")) return;
		if (window.getSelection()?.toString()) return;
		sheetFor = msg;
		sheetOpen = true;
	}

	async function copyMessage(msg: ChatMessage) {
		sheetOpen = false;
		try {
			await navigator.clipboard.writeText(msg.content);
			toast.info("Copied");
		} catch {
			toast.error("Couldn't copy the message");
		}
	}

	async function deleteMessage(msg: ChatMessage) {
		sheetOpen = false;
		const ok = await confirmAction({
			title: "Delete message?",
			confirmLabel: "Delete",
			danger: true
		});
		if (!ok) return;
		deleteId = msg.id;
		await tick();
		deleteForm?.requestSubmit();
	}

	// ---- Links: external ones get a warning first --------------------------------
	let pendingLink = $state<string | null>(null);
	let linkWarningOpen = $state(false);

	function onLinkClick(e: MouseEvent, url: string) {
		e.stopPropagation();
		try {
			if (new URL(url).origin === location.origin) return;
		} catch {
			// Not a valid URL: treat it as external.
		}
		e.preventDefault();
		pendingLink = url;
		linkWarningOpen = true;
	}
</script>

<ReportMessageModal
	bind:open={reportOpen}
	messageId={reportTarget?.id ?? null}
	senderId={reportTarget?.senderId ?? null}
	onClose={() => (reportTarget = null)}
/>

{#if allowBlock}
	<BlockUserModal
		bind:open={blockOpen}
		userId={blockTarget?.senderId ?? null}
		userName={blockTarget?.senderName ?? null}
		onClose={() => (blockTarget = null)}
	/>
{/if}

<Modal bind:open={linkWarningOpen} title="Leaving PsyOps" size="small">
	<div class="space-y-4">
		<div class="panel-muted rounded-sm p-3 break-all text-sm text-fg-soft">{pendingLink}</div>
		<div class="flex gap-2 justify-end">
			<Button variant="ghost" onclick={() => (linkWarningOpen = false)}>Cancel</Button>
			<Button
				variant="primary"
				onclick={() => {
					if (pendingLink) window.open(pendingLink, "_blank", "noopener,noreferrer");
					linkWarningOpen = false;
				}}>Open link</Button
			>
		</div>
	</div>
</Modal>

<BottomSheet bind:open={sheetOpen} title="Message">
	{#if sheetFor}
		{@const msg = sheetFor}
		<div class="space-y-1">
			<ActionListItem icon={FluentCopy20Filled} tone="blue" title="Copy text" onclick={() => copyMessage(msg)} />
			{#if !msg.isFromCurrentUser}
				<ActionListItem
					icon={FluentFlag20Filled}
					tone="amber"
					title="Report message"
					onclick={() => {
						sheetOpen = false;
						reportTarget = msg;
						reportOpen = true;
					}}
				/>
				{#if allowBlock}
					<ActionListItem
						icon={FluentPersonProhibited20Filled}
						tone="red"
						title="Block {msg.senderName}"
						onclick={() => {
							sheetOpen = false;
							blockTarget = msg;
							blockOpen = true;
						}}
					/>
				{/if}
			{/if}
			{#if msg.isFromCurrentUser || canModerate}
				<ActionListItem
					icon={FluentDelete20Filled}
					tone="red"
					danger
					title="Delete message"
					onclick={() => deleteMessage(msg)}
				/>
			{/if}
		</div>
	{/if}
</BottomSheet>

<form
	bind:this={deleteForm}
	method="POST"
	action="?/deleteMessage"
	class="hidden"
	use:enhance={() => {
		const id = deleteId;
		if (id != null) hidden.add(id);
		return async ({ result }) => {
			if (result.type === "success") await invalidate("app:chat");
			else if (id != null) hidden.delete(id);
			toastResult(result);
		};
	}}
>
	<input type="hidden" name="messageId" value={deleteId ?? ""} />
</form>

<div class="room">
	<!-- Header -->
	<header class="shrink-0 px-3 pt-2 md:pt-3">
		<div class="room-bar panel mx-auto flex w-full max-w-3xl items-center gap-2 py-1.5 pl-1 pr-2">
			<IconButton icon={FluentArrowLeft20Filled} label="Back to messages" href="/chat" size="sm" />
			<div class="flex min-w-0 flex-1 items-center gap-3">
				{@render header()}
			</div>
			{@render headerActions?.()}
		</div>
	</header>

	<!-- Messages -->
	<div class="relative min-h-0 flex-1">
		<div bind:this={scroller} onscroll={onScroll} class="room-scroll h-full overflow-y-auto overflow-x-hidden">
			<div bind:this={list} class="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end px-3 pt-4 pb-3">
				{#key conversation}
					{#if timeline.rows.length === 0}
						<div class="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
							<div
								class="flex size-12 items-center justify-center rounded-sm border border-[var(--color-primary-hi)]/30 bg-[var(--color-primary-hi)]/10 text-primary-fg"
							>
								<EmptyIcon class="size-6" />
							</div>
							<p class="text-sm text-fg-muted">{emptyText}</p>
						</div>
					{/if}

					{#each timeline.rows as row (row.key)}
						<div
							in:arrive={{ mine: row.kind === "msg" && row.mine }}
							out:vanish={{ duration: row.kind === "msg" && row.optimistic ? 0 : 280 }}
						>
							{#if row.kind === "day"}
								<div class="day-rule">
									<span>{row.label}</span>
								</div>
							{:else if row.kind === "sender"}
								<div class="mt-3 mb-1 flex items-center gap-2 text-sm">
									<UserLink
										id={row.msg.senderId}
										name={row.msg.senderName}
										avatar={settings.loadImages ? row.msg.senderLogo : null}
										party={{ abbreviation: row.msg.senderPartyAbbreviation, color: row.msg.senderPartyColor }}
										size="sm"
									/>
									{#if row.msg.isLeader}
										<Badge tone="amber" size="xs" icon={FluentShield20Filled}>Leader</Badge>
									{/if}
								</div>
							{:else}
								{@const msg = row.msg}
								{@const emoji = isEmojiOnly(msg.content)}
								<div
									class="flex {row.mine ? 'justify-end' : 'justify-start'} {row.first
										? 'mt-2'
										: 'mt-0.5'} {showSenders && !row.mine ? 'pl-10' : ''}"
								>
									<div
										role="button"
										tabindex="0"
										aria-label="Message from {row.mine ? 'you' : msg.senderName}, {clockTime(msg.sentAt)}"
										onclick={(e) => !row.optimistic && openSheet(msg, e)}
										onkeydown={(e) => {
											if ((e.key === "Enter" || e.key === " ") && !row.optimistic && e.target === e.currentTarget) {
												e.preventDefault();
												openSheet(msg);
											}
										}}
										class="bubble {emoji ? 'emoji' : row.mine ? 'mine' : 'theirs'}"
										class:first={row.first}
										class:last={row.last}
										class:sending={row.optimistic}
									>
										{#if emoji}
											<span class="text-3xl leading-tight">{msg.content}</span>
										{:else}
											<span class="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
												>{#each linkify(msg.content) as part, i (i)}{#if part.link}{#if isImageUrl(part.text) && settings.loadImages}<a
																href={part.text}
																onclick={(e) => onLinkClick(e, part.text)}
																class="my-1 block"
																><img
																	loading="lazy"
																	decoding="async"
																	src={part.text}
																	alt=""
																	class="max-h-72 max-w-full rounded-sm"
																/></a
															>{:else}<a
																href={part.text}
																onclick={(e) => onLinkClick(e, part.text)}
																target="_blank"
																rel="noopener noreferrer"
																class="link-in-bubble">{part.text}</a
															>{/if}{:else}{part.text}{/if}{/each}</span
											>
										{/if}
										<span class="stamp">{clockTime(msg.sentAt)}</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				{/key}
			</div>
		</div>

		{#if !atBottom}
			<button
				type="button"
				class="jump press-spring tap-target"
				aria-label="Jump to newest message"
				onclick={() => {
					unseen = 0;
					scrollToBottom(true);
				}}
			>
				<FluentArrowDown20Filled class="size-5" />
				{#if unseen > 0}
					<span class="jump-count">{unseen > 99 ? "99+" : unseen}</span>
				{/if}
			</button>
		{/if}
	</div>

	<!-- Composer -->
	<div class="shrink-0 px-3 pt-1 pb-2 md:pb-3">
		<div class="mx-auto w-full max-w-3xl">
			{#if locked}
				{@render locked()}
			{:else}
				<form
					method="POST"
					action={sendAction}
					use:enhance={({ cancel }) => {
						const content = draft.trim();
						if (!content || sending || content.length > MAX_LENGTH) {
							cancel();
							return;
						}
						const key = `p${++seq}`;
						pending = [
							...pending,
							{
								key,
								realId: null,
								id: -seq,
								content,
								sentAt: new Date().toISOString(),
								senderId: currentUserId,
								senderName: "You",
								senderLogo: null,
								isFromCurrentUser: true
							}
						];
						draft = "";
						sending = true;
						tick().then(resizeInput);

						return async ({ result }) => {
							sending = false;
							if (result.type === "success") {
								const id = Number((result.data as { id?: unknown } | undefined)?.id);
								if (Number.isFinite(id)) pending = pending.map((p) => (p.key === key ? { ...p, realId: id } : p));
								await invalidate("app:chat");
							} else if (!draft) {
								draft = content;
								tick().then(resizeInput);
							}
							pending = pending.filter((p) => p.key !== key);
							toastResult(result);
							textarea?.focus();
						};
					}}
					class="composer"
				>
					<textarea
						bind:this={textarea}
						bind:value={draft}
						name="content"
						rows="1"
						maxlength={MAX_LENGTH}
						{placeholder}
						aria-label="Message"
						autocomplete="off"
						enterkeyhint="send"
						oninput={resizeInput}
						onkeydown={onKeydown}
						class="composer-input"></textarea>
					{#if draft.length > MAX_LENGTH - 80}
						<span class="self-center font-mono text-xs {draft.length >= MAX_LENGTH ? 'text-red-400' : 'text-fg-muted'}">
							{MAX_LENGTH - draft.length}
						</span>
					{/if}
					<IconButton
						type="submit"
						icon={FluentSend20Filled}
						label="Send"
						variant={canSend ? "primary" : "subtle"}
						disabled={!canSend}
						class="send shrink-0"
					/>
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	@reference "../../../app.css";

	/* Field-comms look: flat surfaces, 1px lines, small radius, tactical blue for own traffic. */
	.room {
		@apply flex min-h-0 flex-1 flex-col;
	}

	.room-bar {
		@apply rounded-sm;
	}

	.room-scroll {
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: rgba(142, 166, 224, 0.2) transparent;
	}

	/* Day separator: a thin rule with the date in monospace caps. */
	.day-rule {
		@apply my-3 flex items-center gap-3 font-mono text-[11px] tracking-[0.12em] text-fg-muted uppercase;
	}
	.day-rule::before,
	.day-rule::after {
		content: "";
		@apply h-px flex-1 bg-white/10;
	}

	.bubble {
		@apply relative max-w-[85%] cursor-pointer rounded-[6px] border px-3 pt-1.5 pb-1 text-[15px] leading-snug outline-none sm:max-w-[70%];
		transition:
			background-color 150ms ease,
			border-color 150ms ease,
			opacity 200ms ease;
		-webkit-tap-highlight-color: transparent;
	}
	.bubble:focus-visible {
		@apply ring-1 ring-[var(--color-primary-hi)];
	}
	.bubble.sending {
		@apply cursor-default opacity-60;
	}

	.bubble.mine {
		@apply border-[var(--color-primary-hi)]/40 bg-primary-lo/35 text-fg;
	}
	.bubble.mine:hover {
		@apply border-[var(--color-primary-hi)]/70;
	}
	.bubble.theirs {
		@apply border-white/10 bg-surface-5 text-fg-body;
	}
	.bubble.theirs:hover {
		@apply border-white/20;
	}
	.bubble.emoji {
		@apply border-transparent bg-transparent px-1 pt-0 pb-0;
	}

	/* Runs of messages sit tight; the sender's side of inner bubbles is squared off. */
	.bubble.mine:not(.first) {
		border-top-right-radius: 2px;
	}
	.bubble.mine:not(.last) {
		border-bottom-right-radius: 2px;
	}
	.bubble.theirs:not(.first) {
		border-top-left-radius: 2px;
	}
	.bubble.theirs:not(.last) {
		border-bottom-left-radius: 2px;
	}

	/* HH:MM in the bubble's bottom corner, after the text. */
	.stamp {
		@apply relative -bottom-0.5 float-right ml-2.5 font-mono text-[10.5px] tabular-nums select-none;
		line-height: 1.7;
	}
	.mine .stamp {
		@apply text-primary-fg;
	}
	.theirs .stamp,
	.emoji .stamp {
		@apply text-fg-muted;
	}

	.link-in-bubble {
		@apply underline underline-offset-2 [overflow-wrap:anywhere];
	}
	.mine .link-in-bubble {
		@apply text-primary-soft;
	}
	.theirs .link-in-bubble {
		@apply text-primary-fg;
	}

	.jump {
		@apply absolute right-4 bottom-3 flex size-10 items-center justify-center rounded-sm border border-white/15 bg-surface-5 text-fg-body hover:border-[var(--color-primary-hi)]/60;
		animation: pop-in 220ms ease-out backwards;
	}
	.jump-count {
		@apply absolute -top-2 -right-2 min-w-5 rounded-[4px] bg-[var(--color-primary-hi)] px-1 text-center font-mono text-[11px] leading-5 font-bold text-white;
	}

	.composer {
		@apply flex items-end gap-2 rounded-sm border border-white/10 bg-surface-3 py-1 pr-1 pl-3 transition-colors duration-150;
	}
	.composer:focus-within {
		@apply border-[var(--color-primary-hi)]/70;
	}
	.composer-input {
		@apply max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-0 py-2 text-base leading-6 text-fg shadow-none placeholder:text-fg-muted/70 focus:ring-0 focus:outline-none;
	}

	@media (prefers-reduced-motion: reduce) {
		.jump {
			animation: none;
		}
	}
</style>
