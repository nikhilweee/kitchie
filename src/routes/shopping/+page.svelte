<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { ShoppingCart } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let sidebarOpen = $state(false);
	let sheetOpen = $state(false);
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);

	function openNew() {
		nameInput = '';
		sheetOpen = true;
		setTimeout(() => nameEl?.focus(), 50);
	}

	function closeSheet() {
		sheetOpen = false;
	}
</script>

<svelte:head><title>Kitchie | Shopping</title></svelte:head>

<Sidebar open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Shopping lists" onhamburger={() => (sidebarOpen = true)} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4">
		{#if data.lists.length === 0}
			<EmptyState icon={ShoppingCart} heading="No lists yet" detail="Tap + to create a shopping list" />
		{:else}
			<ul class="space-y-2">
				{#each data.lists as list (list.id)}
					<li class="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs">
						<a href="/shopping/{list.id}" class="min-w-0 flex-1">
							<p class="truncate font-medium text-stone-900">{list.name}</p>
							<p class="text-xs text-stone-400">
								{list.shoppedCount}/{list.itemCount} items
							</p>
						</a>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={list.id} />
							<button type="submit" class="p-1 text-stone-300 hover:text-red-400 transition-colors" aria-label="Delete {list.name}">
								×
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</main>

	<AddButton label="New list" onclick={openNew} />
</div>

<BottomSheet open={sheetOpen} onclose={closeSheet}>
	<form method="POST" action="?/create" use:enhance={() => async ({ result, update }) => {
		await update();
		if (result.type === 'redirect') closeSheet();
	}}>
		<h2 class="mb-4 text-base font-semibold text-stone-900">New shopping list</h2>
		<label class="mb-1 block text-xs font-medium text-stone-500" for="list-name">List name</label>
		<input
			id="list-name"
			bind:this={nameEl}
			bind:value={nameInput}
			name="name"
			type="text"
			placeholder="e.g. Whole Foods, Costco…"
			class="mb-4 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
		/>
		<div class="flex gap-2">
			<button type="button" onclick={closeSheet}
				class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-stone-600">
				Cancel
			</button>
			<button type="submit" data-shortcut="primary"
				class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white">
				Create list
			</button>
		</div>
	</form>
</BottomSheet>
