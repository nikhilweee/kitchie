<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { ShoppingCart, Pencil } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	type SheetMode = 'create' | 'rename' | null;
	let sheetMode = $state<SheetMode>(null);
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let renameTarget = $state<{ id: string; name: string } | null>(null);

	function openNew() {
		nameInput = '';
		renameTarget = null;
		sheetMode = 'create';
		setTimeout(() => nameEl?.focus(), 50);
	}

	function openRename(list: { id: string; name: string }) {
		renameTarget = list;
		nameInput = list.name;
		sheetMode = 'rename';
		setTimeout(() => nameEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
	}
</script>

<svelte:head><title>Kitchie | Carts</title></svelte:head>

<PageShell title="Carts">
	{#if data.lists.length === 0}
		<EmptyState icon={ShoppingCart} heading="No carts yet" detail="Tap + to create a cart" />
	{:else}
		<ul class="space-y-2">
			{#each data.lists as list (list.id)}
				<ListRow>
					<a href="/shopping/{list.id}" class="min-w-0 flex-1">
						<p class="truncate font-medium text-stone-900 density-text">{list.name}</p>
						<p class="text-xs text-stone-400 density-hide">{list.shoppedCount}/{list.itemCount} items</p>
					</a>
					<span class="hidden shrink-0 items-center text-xs text-stone-400 density-show-slim">{list.shoppedCount}/{list.itemCount}</span>
					<button type="button" onclick={() => openRename(list)}
						class="flex shrink-0 items-center justify-center text-stone-300 hover:text-stone-500 transition-colors"
						aria-label="Rename {list.name}">
						<Pencil class="h-3.5 w-3.5" />
					</button>
				</ListRow>
			{/each}
		</ul>
	{/if}
</PageShell>

<AddButton label="New cart" onclick={openNew} />

<BottomSheet open={sheetMode !== null} onclose={closeSheet}>
	<form id="rename-form" method="POST" action={sheetMode === 'rename' ? '?/rename' : '?/create'}
		use:enhance={() => async ({ result, update }) => {
			await update();
			if (result.type === 'redirect' || result.type === 'success') closeSheet();
		}}>
		{#if sheetMode === 'rename'}
			<input type="hidden" name="id" value={renameTarget?.id} />
		{/if}
		<h2 class="mb-4 text-base font-semibold text-stone-900">
			{sheetMode === 'rename' ? 'Rename cart' : 'New cart'}
		</h2>
		<label class="mb-1 block text-xs font-medium text-stone-500" for="list-name">Cart name</label>
		<input
			id="list-name"
			bind:this={nameEl}
			bind:value={nameInput}
			name="name"
			type="text"
			placeholder="e.g. Whole Foods, Costco…"
			class="mb-4 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
		/>
		{#if sheetMode !== 'rename'}
			<div class="flex gap-2">
				<button type="button" onclick={closeSheet}
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600">
					Cancel
				</button>
				<button type="submit" data-shortcut="primary"
					class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
					Create cart
				</button>
			</div>
		{/if}
	</form>
	{#if sheetMode === 'rename' && renameTarget}
		<div class="flex gap-2">
			<form method="POST" action="?/delete" class="contents" use:enhance={() => async ({ update }) => {
				await update();
				closeSheet();
			}}>
				<input type="hidden" name="id" value={renameTarget.id} />
				<button type="submit" data-shortcut="delete"
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-red-400 hover:bg-red-50 transition-colors">
					Delete
				</button>
			</form>
			<button type="submit" form="rename-form" data-shortcut="primary"
				class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
				Save
			</button>
		</div>
	{/if}
</BottomSheet>
