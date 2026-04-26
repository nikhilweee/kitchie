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
	let editTarget = $state<{ id: string; name: string; ttlDays: number; usageCount: number } | null>(null);
	let editName = $state('');
	let editTtl = $state(30);
	let editEl = $state<HTMLInputElement | undefined>(undefined);

	function openAdd() {
		editTarget = null;
		editName = '';
		editTtl = 30;
		sheetMode = 'add';
		setTimeout(() => editEl?.focus(), 50);
	}

	function openEdit(cat: PageData['categories'][0]) {
		editTarget = { id: cat.id, name: cat.name, ttlDays: cat.ttlDays, usageCount: cat.usageCount };
		editName = cat.name;
		editTtl = cat.ttlDays;
		sheetMode = 'edit';
		setTimeout(() => editEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
		editTarget = null;
	}

	// Drag state
	let items = $state<typeof data.categories>([]);
	let draggedId = $state<string | null>(null);
	let reorderForm: HTMLFormElement;

	$effect(() => {
		items = data.categories.map((c) => c);
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

<svelte:head><title>Kitchie | Categories</title></svelte:head>

<PageShell title="Categories" back={true} mainClass="px-4 py-6 pb-28">
	{#if form?.error}
		<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
	{/if}

	<!-- Hidden reorder form -->
	<form bind:this={reorderForm} method="POST" action="?/reorder" use:enhance class="hidden">
		<input type="hidden" name="ids" value="" />
	</form>

	<ul class="space-y-2">
		{#each items as cat (cat.id)}
			<ListRow
				draggable={true}
				ondragstart={() => onDragStart(cat.id)}
				ondragover={(e) => onDragOver(e, cat.id)}
				ondrop={onDrop}
				ondragend={onDragEnd}
				faded={draggedId === cat.id}
			>
				<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-stone-300 active:cursor-grabbing" />
				<button type="button" onclick={() => openEdit(cat)} class="min-w-0 flex-1 text-left">
					<p class="text-sm font-medium text-stone-900 density-text">{cat.name}</p>
					<p class="text-xs text-stone-400 density-hide">{cat.ttlDays} day shelf life</p>
				</button>
				{#if cat.usageCount > 0}
					<span class="shrink-0 text-xs text-stone-400">{cat.usageCount} item{cat.usageCount !== 1 ? 's' : ''}</span>
				{/if}
			</ListRow>
		{/each}
	</ul>
</PageShell>

<AddButton label="Add category" onclick={openAdd} />

<BottomSheet open={sheetMode !== null} onclose={closeSheet}>
	<form id="cat-form" method="POST" action={sheetMode === 'add' ? '?/add' : '?/update'}
		use:enhance={() => async ({ update }) => {
			await update({ reset: false });
			closeSheet();
		}}>
		{#if sheetMode === 'edit' && editTarget}
			<input type="hidden" name="id" value={editTarget.id} />
		{/if}
		<h2 class="mb-4 text-base font-semibold text-stone-900 density-sheet-header">
			{sheetMode === 'add' ? 'Add category' : 'Edit category'}
		</h2>
		<label class="mb-1 block text-xs font-medium text-stone-500" for="edit-cat-name">Name</label>
		<input
			id="edit-cat-name"
			bind:this={editEl}
			bind:value={editName}
			name="name"
			type="text"
			required
			autocapitalize="sentences"
			class="mb-4 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
		/>
		<label class="mb-1 block text-xs font-medium text-stone-500" for="edit-cat-ttl">Default shelf life (days)</label>
		<input
			id="edit-cat-ttl"
			bind:value={editTtl}
			name="ttlDays"
			type="number"
			min="1"
			required
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
					{editTarget.usageCount > 0 ? `In use by ${editTarget.usageCount} item${editTarget.usageCount !== 1 ? 's' : ''}` : 'Delete category'}
				</button>
			</form>
			<button type="submit" form="cat-form" data-shortcut="primary"
				class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
				Save
			</button>
		</div>
	{/if}
</BottomSheet>
