<!-- One comment with its replies. Replies nest until a sensible depth. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import FluentMore20Filled from "~icons/fluent/more-20-filled";
	import FluentLink20Filled from "~icons/fluent/link-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import { REPORT_REASONS } from "#lib/component/report/reasons.js";
	import { stamp } from "./time.js";

	export interface CommentNode {
		id: number;
		content: string;
		createdAt: Date | string;
		authorId: string;
		authorName: string | null;
		parentId: number | null;
		votes: number;
		hasVoted: boolean;
		replies?: CommentNode[];
	}

	let { comments, articleId }: { comments: CommentNode[]; articleId: number } = $props();

	let replyingTo = $state<number | null>(null);
	let sheetComment = $state<CommentNode | null>(null);
	let violationType = $state("");
	let description = $state("");
	let copied = $state(false);

	const enhanceToast = () => async ({ result, update }: { result: any; update: () => Promise<void> }) => {
		toastResult(result);
		await update();
		replyingTo = null;
	};

	function nest(list: CommentNode[]): CommentNode[] {
		const byParent = new Map<number | null, CommentNode[]>();
		for (const c of list) {
			const bucket = byParent.get(c.parentId) ?? [];
			bucket.push(c);
			byParent.set(c.parentId, bucket);
		}
		const build = (parent: number | null): CommentNode[] =>
			(byParent.get(parent) ?? []).map((c) => ({ ...c, replies: build(c.id) }));
		return build(null);
	}
	const tree = $derived(nest(comments));

	async function copyLink(comment: CommentNode) {
		try {
			await navigator.clipboard.writeText(`${page.url.origin}/posts/${articleId}#comment-${comment.id}`);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

{#snippet node(comment: CommentNode)}
	<article id="comment-{comment.id}" class="panel animate-soft-in rounded-sm p-3 text-sm">
		<div class="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
			<UserLink id={comment.authorId} name={comment.authorName ?? "Reader"} size="xs" plain />
			<span>· {stamp(comment.createdAt)}</span>
			<div class="ml-auto">
				<IconButton
					icon={FluentMore20Filled}
					label="Comment options"
					size="xs"
					shape="square"
					variant="ghost"
					onclick={() => { sheetComment = comment; violationType = ""; description = ""; }}
				/>
			</div>
		</div>
		<p class="mt-2 whitespace-pre-wrap text-fg-body">{comment.content}</p>
		<div class="mt-2 flex items-center gap-2">
			<form method="POST" action="?/commentVote" use:enhance={enhanceToast}>
				<input type="hidden" name="commentId" value={comment.id} />
				<button type="submit" class="press-spring rounded-sm border px-2 py-1 text-xs {comment.hasVoted ? 'border-primary/50 bg-primary/12 text-primary-fg' : 'border-line/25 text-fg-muted hover:border-primary/40'}">
					▲ {comment.votes}
				</button>
			</form>
			<button
				type="button"
				class="text-xs text-fg-muted hover:text-primary-fg"
				onclick={() => (replyingTo = replyingTo === comment.id ? null : comment.id)}
			>Reply</button>
		</div>

		{#if replyingTo === comment.id}
			<form method="POST" action="?/addComment" use:enhance={enhanceToast} class="mt-2 flex gap-2 border-l-2 border-primary/30 pl-2">
				<input type="hidden" name="parentId" value={comment.id} />
				<input name="content" required maxlength="2000" placeholder="Write a reply…" class="field-control min-w-0 flex-1 rounded-sm px-2 py-1.5 text-xs" />
				<Button type="submit" size="xs">Reply</Button>
			</form>
		{/if}

		{#if comment.replies?.length}
			<div class="mt-2 space-y-2 border-l-2 border-line/20 pl-3">
				{#each comment.replies as reply (reply.id)}
					{@render node(reply)}
				{/each}
			</div>
		{/if}
	</article>
{/snippet}

{#if comments.length === 0}
	<p class="text-sm text-fg-muted">No comments yet. Start the conversation.</p>
{:else}
	<div class="space-y-2">
		{#each tree as comment (comment.id)}
			{@render node(comment)}
		{/each}
	</div>
{/if}

<BottomSheet bind:open={sheetComment} title="Comment options">
	{#if sheetComment}
		<div class="space-y-3">
			<p class="text-xs text-fg-muted line-clamp-3">“{sheetComment.content}”</p>
			<Button variant="secondary" block icon={FluentLink20Filled} onclick={() => copyLink(sheetComment!)}>
				{copied ? "Link copied" : "Copy link to comment"}
			</Button>
			<form method="POST" action="?/reportComment" use:enhance={enhanceToast} class="space-y-2">
				<input type="hidden" name="commentId" value={sheetComment.id} />
				<label class="block">
					<span class="field-label">Reason *</span>
					<select name="violationType" bind:value={violationType} required class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm">
						<option value="" disabled>Select a reason</option>
						{#each REPORT_REASONS as r}
							<option value={r.value}>{r.label}</option>
						{/each}
					</select>
				</label>
				<label class="block">
					<span class="field-label">Additional details (optional)</span>
					<textarea name="description" rows="3" maxlength="500" bind:value={description} placeholder="Provide any additional context…" class="field-control mt-1 w-full rounded-sm px-3 py-2 text-sm"></textarea>
				</label>
				<Button type="submit" size="sm" variant="ghost" icon={FluentFlag20Filled} disabled={!violationType}>Report to moderators</Button>
			</form>
		</div>
	{/if}
</BottomSheet>
