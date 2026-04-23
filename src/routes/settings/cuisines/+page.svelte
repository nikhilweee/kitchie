<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import { Pencil, Trash2, GripVertical } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let addName = $state('');

	// Edit sheet state
	let editTarget = $state<{ id: string; name: string } | null>(null);
	let editName = $state('');
	let editEl = $state<HTMLInputElement | undefined>(undefined);

	function openEdit(c: PageData['cuisines'][0]) {
		editTarget = { id: c.id, name: c.name };
		editName = c.name;
		setTimeout(() => editEl?.focus(), 50);
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

		<!-- Add cuisine form -->
		<div class="mb-6 rounded-xl bg-white px-4 py-4 shadow-xs">
			<h2 class="mb-3 text-sm font-semibold text-stone-700">Add cuisine</h2>
			<form
				method="POST"
				action="?/add"
				use:enhance={() => async ({ update }) => {
					await update({ reset: false });
					addName = '';
				}}
			>
				<div class="flex items-center gap-2">
					<input
						name="name"
						type="text"
						bind:value={addName}
						placeholder="e.g. Ethiopian"
						required
						autocapitalize="sentences"
						class="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
					/>
					<button
						type="submit"
						disabled={!addName.trim()}
						class="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
					>Add</button>
				</div>
			</form>
		</div>

		<!-- Hidden reorder form -->
		<form bind:this={reorderForm} method="POST" action="?/reorder" use:enhance class="hidden">
			<input type="hidden" name="ids" value="" />
		</form>

		<ul class="space-y-2">
			{#each items as cuisine (cuisine.id)}
				<li
					class="rounded-xl bg-white px-4 py-3 shadow-xs transition-opacity {draggedId === cuisine.id ? 'opacity-40' : ''}"
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
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={cuisine.id} />
							<button
								type="submit"
								aria-label="Delete {cuisine.name}"
								disabled={cuisine.usageCount > 0}
								class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
							><Trash2 class="h-3.5 w-3.5" /></button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	</main>
</div>

<BottomSheet open={editTarget !== null} onclose={() => (editTarget = null)}>
	<form method="POST" action="?/update" use:enhance={() => async ({ update }) => {
		await update();
		editTarget = null;
	}}>
		<input type="hidden" name="id" value={editTarget?.id} />
		<h2 class="mb-4 text-base font-semibold text-stone-900">Edit cuisine</h2>
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
			<button type="button" onclick={() => (editTarget = null)}
				class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600">
				Cancel
			</button>
			<button type="submit" data-shortcut="primary"
				class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
				Save
			</button>
		</div>
	</form>
</BottomSheet>
