<!-- Order of battle: commander → division/airgroup → battalions, as a tree.
     Units ticked in the roster can be moved into any formation from here, or
     bundled into a new one. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import CommanderPortrait from "#lib/component/CommanderPortrait.svelte";
	import { commanderLevel } from "#lib/config/index.js";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import FluentDismiss12Filled from "~icons/fluent/dismiss-12-filled";
	import FluentArrowEnter20Regular from "~icons/fluent/arrow-enter-20-regular";
	import FluentAirplane20Regular from "~icons/fluent/airplane-20-regular";
	import ForceSymbol from "./ForceSymbol.svelte";
	import { act, unitLabel } from "./forces";

	type Officer = {
		id: number;
		name: string;
		alive: boolean;
		experience: number;
		portrait: number;
		health: number;
		traitIds: string[];
	};
	type Group = {
		id: number;
		name: string;
		kind: string;
		commanderId: number | null;
		supportsGroupId?: number | null;
	};
	type Unit = {
		id: number;
		name: string;
		unitType: string;
		groupId: number | null;
		health: number;
		isTraining: boolean;
	};

	interface Props {
		kind: "division" | "airgroup";
		groups: Group[];
		/** Every formation of the state, both kinds: air wings ↔ divisions. */
		allGroups?: Group[];
		units: Unit[];
		officers: Officer[];
		/** Units ticked in the roster. */
		selected: number[];
		/** Units that could join but have no formation yet. */
		unassigned: number;
	}
	let { kind, groups, allGroups = [], units, officers, selected = $bindable(), unassigned }: Props = $props();

	const divisions = $derived(allGroups.filter((g) => g.kind === "division"));
	const wingsFor = (divisionId: number) =>
		allGroups.filter((g) => g.kind === "airgroup" && g.supportsGroupId === divisionId);

	let busy = $state(false);
	let root = $state<HTMLElement>();

	const noun = $derived(kind === "division" ? "division" : "airgroup");
	const memberNoun = $derived(kind === "division" ? "battalions" : "squadrons");
	const echelon = $derived(kind === "division" ? "XX" : "III");
	const alive = $derived(officers.filter((o) => o.alive));
	const byOfficer = $derived(new Map(officers.map((o) => [o.id, o])));
	const membersOf = (groupId: number) => units.filter((u) => u.groupId === groupId);

	// Top level of the tree: every commander that holds a formation, then the
	// formations nobody commands yet.
	const commands = $derived.by(() => {
		const out: { officer: Officer | null; groups: Group[] }[] = [];
		const seen = new Map<number, Group[]>();
		const orphan: Group[] = [];
		for (const g of groups) {
			const o = g.commanderId != null ? byOfficer.get(g.commanderId) : undefined;
			if (!o) orphan.push(g);
			else if (seen.has(o.id)) seen.get(o.id)!.push(g);
			else {
				const list = [g];
				seen.set(o.id, list);
				out.push({ officer: o, groups: list });
			}
		}
		if (orphan.length) out.push({ officer: null, groups: orphan });
		return out;
	});

	const clear = () => (selected = []);
	const avgStr = (members: Unit[]) =>
		members.length ? Math.round(members.reduce((s, u) => s + u.health, 0) / members.length) : null;
</script>

<div bind:this={root} class="space-y-3">
	{#if commands.length === 0}
		<p class="rounded-sm border border-dashed border-line/25 px-4 py-5 text-center text-sm text-fg-muted">
			No {noun}s yet.
			{#if unassigned}Tick ready {memberNoun} in the roster below, then form one.{:else}Recruit {memberNoun} first, then group
				them here.{/if}
		</p>
	{/if}

	{#each commands as command (command.officer?.id ?? "none")}
		<div>
			<!-- Commander -->
			<div class="flex items-center gap-2">
				{#if command.officer}
					<CommanderPortrait seed={command.officer.portrait} alive={command.officer.alive} size={26} />
					<span class="text-sm font-medium text-heading">
						{command.officer.name}{command.officer.alive ? "" : " †"}
					</span>
					<span class="data text-[10px] text-fg-faint">L{commanderLevel(command.officer.experience)}</span>
				{:else}
					<span
						class="grid size-[26px] place-items-center rounded-full border border-dashed border-line/40 text-[10px] text-fg-faint"
					>
						?
					</span>
					<span class="text-sm text-fg-muted">No commander</span>
				{/if}
			</div>

			<ul class="ml-[12px] mt-1 border-l border-line/25">
				{#each command.groups as group (group.id)}
					{@const members = membersOf(group.id)}
					{@const str = avgStr(members)}
					<li
						class="relative pl-5 pt-2 before:absolute before:left-0 before:top-[22px] before:h-px before:w-4 before:bg-line/25"
					>
						<!-- Formation -->
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
							<ForceSymbol unitType={null} {echelon} size={26} title="{group.name} ({noun})" />
							<span class="font-semibold text-fg">{group.name}</span>
							<Badge tone="neutral" size="xs">
								{members.length}
								{members.length === 1 ? memberNoun.slice(0, -1) : memberNoun}
							</Badge>
							{#if str != null}<span class="data text-[11px] text-fg-muted" title="Average strength">
									STR {str}%
								</span>{/if}
							<div class="ml-auto flex flex-wrap items-center gap-1">
								{#if selected.length}
									<form
										method="POST"
										action="?/setUnitGroup"
										use:enhance={act({ busy: (v) => (busy = v), glow: () => root, after: clear })}
									>
										{#each selected as id (id)}<input type="hidden" name="unitIds" value={id} />{/each}
										<input type="hidden" name="groupId" value={group.id} />
										<Button
											type="submit"
											size="xs"
											variant="secondary"
											icon={FluentArrowEnter20Regular}
											disabled={busy}
										>
											Move {selected.length} here
										</Button>
									</form>
								{/if}
								<form method="POST" action="?/assignCommander" use:enhance={act()} class="flex items-center">
									<input type="hidden" name="kind" value={kind} />
									<input type="hidden" name="id" value={group.id} />
									<select
										name="commanderId"
										aria-label="Commander of {group.name}"
										class="field-control max-w-36 rounded-sm px-1.5 py-1 text-[11px]"
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
									>
										<option value="">No commander</option>
										{#each alive as o (o.id)}
											<option value={o.id} selected={o.id === group.commanderId}>{o.name}</option>
										{/each}
									</select>
								</form>
								<form method="POST" action="?/disbandUnitGroup" use:enhance={act()}>
									<input type="hidden" name="groupId" value={group.id} />
									<Button
										type="submit"
										size="xs"
										variant="ghost"
										class="text-fg-muted hover:text-error"
										title="Disband: its units stay, unassigned"
									>
										Disband
									</Button>
								</form>
							</div>
						</div>

						<!-- Air support: wing → division, shown on both sides -->
						{#if kind === "airgroup"}
							<form
								method="POST"
								action="?/assignAirSupport"
								use:enhance={act()}
								class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted"
							>
								<input type="hidden" name="wingId" value={group.id} />
								<FluentAirplane20Regular class="size-3.5 text-primary-fg" />
								<label for="support-{group.id}">Supports</label>
								<select
									id="support-{group.id}"
									name="divisionId"
									class="field-control max-w-44 rounded-sm px-1.5 py-1 text-[11px]"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
									disabled={!divisions.length}
								>
									<option value="">{divisions.length ? "No division" : "No divisions formed"}</option>
									{#each divisions as dv (dv.id)}
										<option value={dv.id} selected={dv.id === group.supportsGroupId}>{dv.name}</option>
									{/each}
								</select>
							</form>
						{:else}
							{@const wings = wingsFor(group.id)}
							{#if wings.length}
								<div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
									<FluentAirplane20Regular class="size-3.5 text-primary-fg" />
									Air cover
									{#each wings as w (w.id)}
										<form method="POST" action="?/assignAirSupport" use:enhance={act()}>
											<input type="hidden" name="wingId" value={w.id} />
											<input type="hidden" name="divisionId" value="" />
											<span
												class="inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/10 py-0.5 pr-0.5 pl-1.5 text-primary-fg"
											>
												{w.name}
												<button
													type="submit"
													class="grid size-4 place-items-center rounded-sm hover:bg-error/15 hover:text-error"
													title="Release {w.name} from {group.name}"
													aria-label="Release {w.name} from {group.name}"
												>
													<FluentDismiss12Filled class="size-2.5" />
												</button>
											</span>
										</form>
									{/each}
								</div>
							{/if}
						{/if}

						<!-- Units -->
						{#if members.length}
							<ul class="ml-[12px] mt-1.5 border-l border-line/20 pb-1">
								{#each members as unit (unit.id)}
									<li
										class="group relative flex items-center gap-2 py-1 pl-5 before:absolute before:left-0 before:top-1/2 before:h-px before:w-4 before:bg-line/20"
									>
										<ForceSymbol unitType={unit.unitType} size={18} title={unitLabel(unit.unitType)} />
										<span class="min-w-0 truncate text-[13px] text-fg-body">{unit.name}</span>
										<span class="hidden truncate text-[11px] text-fg-faint sm:inline">{unitLabel(unit.unitType)}</span>
										<span
											class="data ml-auto text-[11px] {unit.health < 50 ? 'text-warning' : 'text-fg-muted'}"
											title="Strength"
										>
											{unit.health}%
										</span>
										<form method="POST" action="?/setUnitGroup" use:enhance={act()}>
											<input type="hidden" name="unitIds" value={unit.id} />
											<input type="hidden" name="groupId" value="" />
											<button
												type="submit"
												class="grid size-6 place-items-center rounded-sm text-fg-faint transition-colors hover:bg-error/10 hover:text-error"
												title="Detach from {group.name}"
												aria-label="Detach {unit.name} from {group.name}"
											>
												<FluentDismiss12Filled class="size-3" />
											</button>
										</form>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="ml-[32px] py-1 text-xs text-fg-faint">
								Empty — tick {memberNoun} in the roster and move them here.
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>
