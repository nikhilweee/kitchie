<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { GripVertical } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type SheetMode = 'add' | 'edit' | null;
	let sheetMode = $state<SheetMode>(null);
	let editTarget = $state<{ id: string; name: string; usageCount: number } | null>(null);
	let editName = $state('');
	let editEl = $state<HTMLInputElement | undefined>(undefined);

	function openAdd() {
		editTarget = null;
		editName = '';
		sheetMode = 'add';
		setTimeout(() => editEl?.focus(), 50);
	}

	function openEdit(c: PageData['cuisines'][0]) {
		editTarget = { id: c.id, name: c.name, usageCount: c.usageCount };
		editName = c.name;
		sheetMode = 'edit';
		setTimeout(() => editEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
		editTarget = null;
	}

	// Drag state
	let items = $state<typeof data.cuisines>([]);
	let draggedId = $state<string | null>(null);
	let reorderForm: HTMLFormElement;

	$effect(() => {
		items = data.cuisines.map((c) => c);
	});

	function onDragStart(id: string) {
		draggedId = id;
	}

	function onDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		if (!draggedId || draggedId === id) return;
		const from = items.findIndex((c) => c.id === draggedId);
		const to = items.findIndex((c) => c.id === id);
		if (from === -1 || to === -1) return;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		items = next;
	}

	function onDrop() {
		draggedId = null;
		const input = reorderForm.querySelector<HTMLInputElement>('input[name="ids"]')!;
		input.value = items.map((c) => c.id).join(',');
		reorderForm.requestSubmit();
	}

	function onDragEnd() {
		draggedId = null;
	}
</script>

<svelte:head><title>Kitchie | Cuisines</title></svelte:head>

<PageShell title="Cuisines" back={true} mainClass="px-4 py-6 pb-28">
	{#if form?.error}
		<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
	{/if}

	<!-- Hidden reorder form -->
	<form bind:this={reorderForm} method="POST" action="?/reorder" use:enhance class="hidden">
		<input type="hidden" name="ids" value="" />
	</form>

	<ul class="space-y-2">
		{#each items as cuisine (cuisine.id)}
			<ListRow
				onclick={() => openEdit(cuisine)}
				draggable={true}
				ondragstart={() => onDragStart(cuisine.id)}
				ondragover={(e) => onDragOver(e, cuisine.id)}
				ondrop={onDrop}
				ondragend={onDragEnd}
				faded={draggedId === cuisine.id}
			>
				<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-stone-300 active:cursor-grabbing" />
				<p class="min-w-0 flex-1 text-sm font-medium text-stone-900 density-text">{cuisine.name}</p>
				{#if cuisine.usageCount > 0}
					<span class="shrink-0 text-xs text-stone-400">{cuisine.usageCount} recipe{cuisine.usageCount !== 1 ? 's' : ''}</span>
				{/if}
			</ListRow>
		{/each}
	</ul>
</PageShell>

<AddButton label="Add cuisine" onclick={openAdd} />

<BottomSheet open={sheetMode !== null} onclose={closeSheet}>
	<form id="cuisine-form" method="POST" action={sheetMode === 'add' ? '?/add' : '?/update'}
		use:enhance={() => async ({ update }) => {
			await update({ reset: false });
			closeSheet();
		}}>
		{#if sheetMode === 'edit' && editTarget}
			<input type="hidden" name="id" value={editTarget.id} />
		{/if}
		<h2 class="mb-4 text-base font-semibold text-stone-900 density-sheet-header">
			{sheetMode === 'add' ? 'Add cuisine' : 'Edit cuisine'}
		</h2>
		<label class="mb-1 block text-xs font-medium text-stone-500" for="edit-cuisine-name">Name</label>
		<input
			id="edit-cuisine-name"
			bind:this={editEl}
			bind:value={editName}
			name="name"
			type="text"
			required
			autocapitalize="sentences"
			class="mb-4 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
		/>
		{#if sheetMode === 'add'}
			<div class="flex gap-2">
				<button type="button" onclick={closeSheet}
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600">
					Cancel
				</button>
				<button type="submit" data-shortcut="primary"
					class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
					Save
				</button>
			</div>
		{/if}
	</form>
	{#if sheetMode === 'edit' && editTarget}
		<div class="flex gap-2">
			<form method="POST" action="?/delete" class="contents" use:enhance={() => async ({ update }) => {
				await update({ reset: false });
				closeSheet();
			}}>
				<input type="hidden" name="id" value={editTarget.id} />
				<button type="submit" data-shortcut="delete"
					disabled={editTarget.usageCount > 0}
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
					{editTarget.usageCount > 0 ? `In use by ${editTarget.usageCount} recipe${editTarget.usageCount !== 1 ? 's' : ''}` : 'Delete cuisine'}
				</button>
			</form>
			<button type="submit" form="cuisine-form" data-shortcut="primary"
				class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
				Save
			</button>
		</div>
	{/if}
</BottomSheet>
