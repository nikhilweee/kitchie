<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import { Pencil, GripVertical } from 'lucide-svelte';

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

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Cuisines" back={true} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
		{#if form?.error}
			<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
		{/if}

		<!-- Hidden reorder form -->
		<form bind:this={reorderForm} method="POST" action="?/reorder" use:enhance class="hidden">
			<input type="hidden" name="ids" value="" />
		</form>

		<ul class="space-y-2">
			{#each items as cuisine (cuisine.id)}
				<li
					class="rounded-xl bg-white px-4 py-3 shadow-xs transition-opacity density-li {draggedId === cuisine.id ? 'opacity-40' : ''}"
					draggable={true}
					ondragstart={() => onDragStart(cuisine.id)}
					ondragover={(e) => onDragOver(e, cuisine.id)}
					ondrop={onDrop}
					ondragend={onDragEnd}
				>
					<div class="flex items-center gap-3">
						<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-stone-300 active:cursor-grabbing" />
						<p class="min-w-0 flex-1 text-sm font-medium text-stone-900">{cuisine.name}</p>
						{#if cuisine.usageCount > 0}
							<span class="shrink-0 text-xs text-stone-400">{cuisine.usageCount} recipe{cuisine.usageCount !== 1 ? 's' : ''}</span>
						{/if}
						<button type="button" onclick={() => openEdit(cuisine)} aria-label="Edit {cuisine.name}"
							class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600">
							<Pencil class="h-3.5 w-3.5" />
						</button>
					</div>
				</li>
			{/each}
		</ul>
	</main>

	<AddButton label="Add cuisine" onclick={openAdd} />
</div>

<BottomSheet open={sheetMode !== null} onclose={closeSheet}>
	<form method="POST" action={sheetMode === 'add' ? '?/add' : '?/update'}
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
	</form>
	{#if sheetMode === 'edit' && editTarget}
		<form method="POST" action="?/delete" use:enhance={() => async ({ update }) => {
			await update({ reset: false });
			closeSheet();
		}}>
			<input type="hidden" name="id" value={editTarget.id} />
			<button type="submit" data-shortcut="delete"
				disabled={editTarget.usageCount > 0}
				class="mt-2 w-full py-2 text-xs text-stone-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
				{editTarget.usageCount > 0 ? `In use by ${editTarget.usageCount} recipe${editTarget.usageCount !== 1 ? 's' : ''}` : 'Delete cuisine'}
			</button>
		</form>
	{/if}
</BottomSheet>
