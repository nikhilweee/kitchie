<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Pencil, Trash2, Check, X, GripVertical } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Add form state
	let addName = $state('');
	let addTtl = $state(30);

	// Edit state: which category is being edited
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editTtl = $state(30);

	// Drag state
	let items = $state(data.categories.map((c) => c));
	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);
	let reorderForm: HTMLFormElement;

	$effect(() => {
		items = data.categories.map((c) => c);
	});

	function startEdit(cat: PageData['categories'][0]) {
		editingId = cat.id;
		editName = cat.name;
		editTtl = cat.ttlDays;
	}

	function cancelEdit() {
		editingId = null;
	}

	function onDragStart(id: string) {
		draggedId = id;
	}

	function onDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		dragOverId = id;
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
		dragOverId = null;
		// Submit new order
		const input = reorderForm.querySelector<HTMLInputElement>('input[name="ids"]')!;
		input.value = items.map((c) => c.id).join(',');
		reorderForm.requestSubmit();
	}

	function onDragEnd() {
		draggedId = null;
		dragOverId = null;
	}
</script>

<svelte:head><title>Kitchie | Categories</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Categories" back={true} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
		{#if form?.error}
			<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
		{/if}

		<!-- Add category form -->
		<div class="mb-6 rounded-xl bg-white px-4 py-4 shadow-xs">
			<h2 class="mb-3 text-sm font-semibold text-stone-700">Add category</h2>
			<form
				method="POST"
				action="?/add"
				use:enhance={() => async ({ update }) => {
					await update({ reset: false });
					addName = '';
					addTtl = 30;
				}}
			>
				<div class="flex items-center gap-2">
					<input
						name="name"
						type="text"
						bind:value={addName}
						placeholder="Name"
						required
						autocapitalize="sentences"
						class="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
					/>
					<input
						name="ttlDays"
						type="number"
						bind:value={addTtl}
						min="1"
						required
						class="w-16 rounded-lg border border-stone-300 px-2 py-2 text-center text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
					/>
					<span class="shrink-0 text-xs text-stone-400">days</span>
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
			{#each items as cat (cat.id)}
				<li
					class="rounded-xl bg-white px-4 py-3 shadow-xs transition-opacity {draggedId === cat.id ? 'opacity-40' : ''}"
					draggable={editingId !== cat.id}
					ondragstart={() => onDragStart(cat.id)}
					ondragover={(e) => onDragOver(e, cat.id)}
					ondrop={onDrop}
					ondragend={onDragEnd}
				>
					{#if editingId === cat.id}
						<form
							method="POST"
							action="?/update"
							use:enhance={() => async ({ update }) => {
								await update();
								editingId = null;
							}}
						>
							<input type="hidden" name="id" value={cat.id} />
							<div class="flex items-center gap-2">
								<input
									name="name"
									type="text"
									bind:value={editName}
									required
									class="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
								/>
								<input
									name="ttlDays"
									type="number"
									bind:value={editTtl}
									min="1"
									required
									class="w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-center text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
								/>
								<span class="shrink-0 text-xs text-stone-400">days</span>
								<button type="submit" aria-label="Save" class="flex h-7 w-7 items-center justify-center rounded-full text-green-600 hover:bg-green-50"><Check class="h-4 w-4" /></button>
								<button type="button" onclick={cancelEdit} aria-label="Cancel" class="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"><X class="h-4 w-4" /></button>
							</div>
						</form>
					{:else}
						<div class="flex items-center gap-3">
							<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-stone-300 active:cursor-grabbing" />
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-stone-900">{cat.name}</p>
								<p class="text-xs text-stone-400">{cat.ttlDays} day shelf life</p>
							</div>
							{#if cat.usageCount > 0}
								<span class="shrink-0 text-xs text-stone-400">{cat.usageCount} item{cat.usageCount !== 1 ? 's' : ''}</span>
							{/if}
							<button type="button" onclick={() => startEdit(cat)} aria-label="Edit {cat.name}" class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600"><Pencil class="h-3.5 w-3.5" /></button>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<button
									type="submit"
									aria-label="Delete {cat.name}"
									disabled={cat.usageCount > 0}
									class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
								><Trash2 class="h-3.5 w-3.5" /></button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</main>
</div>
