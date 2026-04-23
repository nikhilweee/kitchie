<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { onMount, untrack } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SmallEstimatePicker from '$lib/components/SmallEstimatePicker.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';

	import Sidebar from '$lib/components/Sidebar.svelte';
	import { clickOutside } from '$lib/actions/click-outside';
	import { ShoppingCart, X, CheckCheck, ListFilter, Plus } from 'lucide-svelte';
	import { estimateLabel } from '$lib/quantity';
	import SmallCountPicker from '$lib/components/SmallCountPicker.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let { data }: { data: PageData } = $props();

	let sidebarOpen = $state(false);

	// FAB scroll-hide (mirrors AddButton logic)
	let fabHidden = $state(false);
	onMount(() => {
		let lastY = 0;
		function onScroll() {
			const y = window.scrollY;
			if (y > lastY + 4) fabHidden = true;
			else if (y < lastY - 4) fabHidden = false;
			lastY = y;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// Toast
	const toast = createToast();
	const showToast = toast.show;

	// Sheet state
	type SheetMode = 'add' | null;
	let sheetMode = $state<SheetMode>(null);

	// Add items state
	let search = $state('');
	let selectedIds = $state<Set<string>>(new Set());
	let freeTextItems = $state<string[]>([]);
	let searchEl = $state<HTMLInputElement | undefined>(undefined);

	// Add sheet filter/sort state
	type AddStatus = 'normal' | 'low' | 'done' | null;
	let addStatus = $state<AddStatus>(null);
	let addCategories = $state(new SvelteSet<string>());
	type AddSortField = 'name' | 'category';
	let addSortBy = $state<AddSortField>('name');
	let addSortDir = $state<'asc' | 'desc'>('asc');
	let addFilterOpen = $state(false);

	function addCategoryLabel(id: string) {
		return data.categories.find((c) => c.id === id)?.name ?? id;
	}

	function addItemStatus(p: typeof data.pantryItems[0]): 'normal' | 'low' | 'done' {
		if (p.status !== 'active') return 'done';
		const isLow = p.quantityType === 'estimate' ? p.quantity <= 0.15 : p.quantity <= 1;
		return isLow ? 'low' : 'normal';
	}

	function addToggleSort(field: AddSortField) {
		if (addSortBy === field) { addSortDir = addSortDir === 'asc' ? 'desc' : 'asc'; }
		else { addSortBy = field; addSortDir = 'asc'; }
	}

	// Current list item IDs mapped to pantryItemId for fast lookup
	const currentPantryIds = $derived(new Set(data.items.map((i) => i.pantryItemId).filter(Boolean)));

	const presentAddCategories = $derived(
		data.categories.filter((cat) => data.pantryItems.some((p) => p.category === cat.id))
	);

	const addFilterCount = $derived(addCategories.size);

	const filteredPantry = $derived.by(() => {
		let items = data.pantryItems.filter((p) => {
			if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
			if (addStatus === 'done') { if (p.status === 'active') return false; }
			else {
				if (p.status !== 'active') return false;
				if (addStatus !== null && addItemStatus(p) !== addStatus) return false;
			}
			if (addCategories.size > 0 && !addCategories.has(p.category)) return false;
			return true;
		});
		return [...items].sort((a, b) => {
			const dir = addSortDir === 'asc' ? 1 : -1;
			if (addSortBy === 'category') {
				const catCmp = addCategoryLabel(a.category).localeCompare(addCategoryLabel(b.category));
				return catCmp !== 0 ? catCmp * dir : a.name.localeCompare(b.name) * dir;
			}
			return a.name.localeCompare(b.name) * dir;
		});
	});

	const searchIsExact = $derived(
		data.pantryItems.some((p) => p.name.toLowerCase() === search.trim().toLowerCase())
	);

	function openAdd() {
		// Pre-select items already on the list
		selectedIds = new Set(data.items.map((i) => i.pantryItemId).filter(Boolean) as string[]);
		freeTextItems = data.items.filter((i) => !i.pantryItemId).map((i) => i.name);
		search = '';
		addStatus = null;
		addCategories = new SvelteSet();
		addSortBy = 'name';
		addSortDir = 'asc';
		addFilterOpen = false;
		sheetMode = 'add';
		setTimeout(() => searchEl?.focus(), 50);
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		selectedIds = next;
	}

	function addFreeText(name: string) {
		if (!freeTextItems.some((f) => f.toLowerCase() === name.toLowerCase())) {
			freeTextItems = [...freeTextItems, name];
		}
		search = '';
	}

	function removeFreeText(name: string) {
		freeTextItems = freeTextItems.filter((f) => f !== name);
	}

	// Finish flow state: tracks quantities for every list item
	type FinishItem = {
		id: string;
		name: string;
		pantryItemId: string | null;
		quantityType: 'count' | 'estimate';
		unit: string | null;
		newQuantity: number;
	};

	let finishItems = $state<FinishItem[]>([]);

	$effect(() => {
		const all = data.items;
		untrack(() => {
			const allIds = new Set(all.map((i) => i.id));
			finishItems = finishItems.filter((f) => allIds.has(f.id));
			for (const item of all) {
				if (!finishItems.find((f) => f.id === item.id)) {
					const pantry = data.pantryItems.find((p) => p.id === item.pantryItemId);
					finishItems.push({
						id: item.id,
						name: item.name,
						pantryItemId: item.pantryItemId ?? null,
						quantityType: (pantry?.quantityType ?? 'estimate') as 'count' | 'estimate',
						unit: pantry?.unit ?? null,
						newQuantity: 1
					});
				}
			}
		});
	});

	const shoppedItems = $derived(data.items.filter((i) => i.shopped));
	const activeItems = $derived(data.items.filter((i) => !i.shopped));
	// Only checked items go to the server on Checkout
	const checkoutItems = $derived(finishItems.filter((f) => shoppedItems.some((s) => s.id === f.id)));
	let pickedUpOpen = $state(true);
</script>

{#snippet qtyPicker(fi: { quantityType: 'count' | 'estimate'; unit: string | null; newQuantity: number })}
	{#if fi.quantityType === 'count'}
		<SmallCountPicker bind:value={fi.newQuantity} unit={fi.unit} />
	{:else}
		<SmallEstimatePicker bind:value={fi.newQuantity} />
	{/if}
{/snippet}

<svelte:head><title>Kitchie | {data.list.name}</title></svelte:head>

<Toast message={toast.message} />
<Sidebar open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title={data.list.name} onhamburger={() => (sidebarOpen = true)} back="/shopping" />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4">
		{#if data.items.length === 0}
			<EmptyState icon={ShoppingCart} heading="No items yet" detail="Tap + to add items" />
		{:else}
			<!-- Active (unshopped) items -->
			{#if activeItems.length > 0}
				<ul class="mb-4 space-y-2">
					{#each activeItems as item (item.id)}
						{@const fi = finishItems.find((f) => f.id === item.id)}
						<li class="flex items-center gap-2 rounded-xl bg-white px-3 shadow-xs py-2.5 density-li-sm">
							<form method="POST" action="?/toggleShopped" use:enhance={() => async ({ update }) => {
								await update({ reset: false });
							}}>
								<input type="hidden" name="id" value={item.id} />
								<input type="hidden" name="shopped" value={String(item.shopped)} />
								<button type="submit" aria-label="Mark {item.name} as picked up"
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 text-white hover:border-orange-400 transition-colors">
								</button>
							</form>
							<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">{item.name}</span>
							{#if fi}{@render qtyPicker(fi)}{/if}
							<form method="POST" action="?/removeItem" use:enhance={() => async ({ update }) => {
								await update({ reset: false });
							}}>
								<input type="hidden" name="id" value={item.id} />
								<button type="submit"
									class="flex h-6 w-6 shrink-0 items-center justify-center text-stone-300 hover:text-red-400 transition-colors"
									aria-label="Remove {item.name}">
									<X class="h-3.5 w-3.5" />
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Picked up section -->
			{#if shoppedItems.length > 0}
				<button type="button" onclick={() => (pickedUpOpen = !pickedUpOpen)}
					class="mb-2 flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
					<CheckCheck class="h-3.5 w-3.5" />
					Picked up ({shoppedItems.length})
					<span class="ml-auto">{pickedUpOpen ? '▴' : '▾'}</span>
				</button>
				{#if pickedUpOpen}
					<ul class="space-y-2">
						{#each shoppedItems as item (item.id)}
							{@const fi = finishItems.find((f) => f.id === item.id)}
							<li class="flex items-center gap-2 rounded-xl bg-white px-3 shadow-xs py-2.5 density-li-sm">
								<form method="POST" action="?/toggleShopped" use:enhance={() => async ({ update }) => {
									await update({ reset: false });
								}}>
									<input type="hidden" name="id" value={item.id} />
									<input type="hidden" name="shopped" value={String(item.shopped)} />
									<button type="submit"
										class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-400 border-2 border-orange-400 text-white hover:opacity-80 transition-opacity">
										✓
									</button>
								</form>
								<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{item.name}</span>
								{#if fi}{@render qtyPicker(fi)}{/if}
								<form method="POST" action="?/removeItem" use:enhance={() => async ({ update }) => {
									await update({ reset: false });
								}}>
									<input type="hidden" name="id" value={item.id} />
									<button type="submit"
										class="flex h-6 w-6 shrink-0 items-center justify-center text-stone-300 hover:text-red-400 transition-colors"
										aria-label="Remove {item.name}">
										<X class="h-3.5 w-3.5" />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		{/if}
	</main>

	<!-- FAB: compact + when finishing, full-width Add items otherwise -->
	<div class="fixed bottom-14 left-0 right-0 z-10 flex items-center gap-2 px-4 pb-2 transition-transform duration-200 {fabHidden ? 'translate-y-28' : ''}">
		{#if shoppedItems.length > 0}
			<form method="POST" action="?/finish" use:enhance={() => async ({ update }) => {
				await update({ reset: false });
				showToast('Added to pantry');
			}} class="flex flex-1">
				{#each checkoutItems as item (item.id)}
					<input type="hidden" name="itemId" value={item.id} />
					<input type="hidden" name="pantryItemId" value={item.pantryItemId ?? ''} />
					<input type="hidden" name="newQuantity" value={item.newQuantity} />
				{/each}
				<button type="submit"
					class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95">
					Checkout
				</button>
			</form>
			<button type="button" onclick={openAdd} aria-label="Add items"
				class="flex w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-orange-500 bg-white py-4 text-orange-500 shadow-lg hover:bg-orange-50 active:scale-95 transition-colors">
				<Plus class="h-5 w-5" />
			</button>
		{:else}
			<button type="button" onclick={openAdd}
				class="flex w-full max-w-lg mx-auto items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95">
				<Plus class="h-5 w-5" />
				Add items
			</button>
		{/if}
	</div>
</div>

<!-- Add items sheet -->
<BottomSheet open={sheetMode === 'add'} onclose={() => (sheetMode = null)}>
	<h2 class="mb-3 text-base font-semibold text-stone-900">Add items</h2>

	<!-- Search -->
	<div class="relative mb-3" use:clickOutside={() => {}}>
		<input
			bind:this={searchEl}
			bind:value={search}
			type="text"
			placeholder="Search pantry or type a name…"
			autocomplete="off"
			class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
		/>
		{#if search.trim() && !searchIsExact}
			<div class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
				<button type="button" onclick={() => addFreeText(search.trim())}
					class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50">
					Add "{search.trim()}" to list
				</button>
			</div>
		{/if}
	</div>

	<!-- Status chips + filter button -->
	<div class="relative mb-3 flex items-center gap-2" use:clickOutside={() => (addFilterOpen = false)}>
		<div class="flex flex-1 gap-2 overflow-x-auto scrollbar-none">
			{#each ([['All', null], ['In Stock', 'normal'], ['Running Low', 'low'], ['Out of Stock', 'done']] as const) as [label, val]}
				<button type="button" onclick={() => { addStatus = addStatus === val ? null : val; }}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {addStatus === val ? 'border-stone-700 bg-stone-700 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}">
					{label}
				</button>
			{/each}
		</div>
		<button type="button" onclick={() => (addFilterOpen = !addFilterOpen)}
			class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors {addFilterCount > 0 ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400'}"
			aria-label="Filters">
			<ListFilter class="h-3.5 w-3.5" />
			{#if addFilterCount > 0}
				<span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{addFilterCount}</span>
			{/if}
		</button>
		{#if addFilterOpen}
			<div class="absolute top-full right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
				<div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Sort</div>
				{#each ([['name', 'Name'], ['category', 'Category']] as const) as [field, label]}
					<button type="button" onclick={() => addToggleSort(field)}
						class="flex w-full items-center gap-2 px-3 py-2 hover:bg-stone-50">
						<span class="flex h-4 w-4 shrink-0 items-center justify-center text-xs {addSortBy === field ? 'text-orange-500' : 'text-stone-300'}">
							{addSortBy === field ? (addSortDir === 'asc' ? '↑' : '↓') : '•'}
						</span>
						<span class="text-sm {addSortBy === field ? 'font-medium text-stone-900' : 'text-stone-700'}">{label}</span>
					</button>
				{/each}
				{#if presentAddCategories.length > 0}
					<div class="border-t border-stone-100 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Category</div>
					{#each presentAddCategories as cat (cat.id)}
						<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-stone-50">
							<input type="checkbox" checked={addCategories.has(cat.id)}
								onchange={() => { const s = new SvelteSet(addCategories); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); addCategories = s; }}
								class="accent-orange-500" />
							<span class="text-sm text-stone-700">{cat.name}</span>
						</label>
					{/each}
				{/if}
				<div class="border-t border-stone-100 p-2">
					<button type="button" onclick={() => { addCategories = new SvelteSet(); addSortBy = 'name'; addSortDir = 'asc'; }}
						class="w-full rounded-lg py-1.5 text-xs text-stone-400 hover:bg-stone-50">Clear filters</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Free-text items (not in pantry) -->
	{#if freeTextItems.length > 0}
		<div class="mb-3">
			<p class="mb-1.5 text-xs font-medium text-stone-400">Added manually</p>
			<div class="flex flex-wrap gap-2">
				{#each freeTextItems as ft (ft)}
					<span class="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
						{ft}
						<button type="button" onclick={() => removeFreeText(ft)} class="text-stone-400 hover:text-red-400">
							<X class="h-3 w-3" />
						</button>
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Pantry item list -->
	<div class="-mx-4 px-4">
		{#if filteredPantry.length === 0}
			<p class="py-4 text-center text-sm text-stone-400">No pantry items match</p>
		{:else}
			{@const allSelected = filteredPantry.every((p) => selectedIds.has(p.id))}
			<div class="mb-1 flex items-center justify-end px-2">
				<button type="button"
					onclick={() => {
						const next = new Set(selectedIds);
						if (allSelected) { filteredPantry.forEach((p) => next.delete(p.id)); }
						else { filteredPantry.forEach((p) => next.add(p.id)); }
						selectedIds = next;
					}}
					class="text-xs font-medium text-orange-500 hover:text-orange-600">
					{allSelected ? 'Deselect all' : 'Select all'}
				</button>
			</div>
			<ul class="space-y-1">
				{#each filteredPantry as p (p.id)}
					{@const isOnThisList = currentPantryIds.has(p.id)}
					<li>
						<label class="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-stone-50">
							<input
								type="checkbox"
								checked={selectedIds.has(p.id)}
								onchange={() => toggleSelect(p.id)}
								class="h-4 w-4 shrink-0 accent-orange-500"
							/>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm {p.status !== 'active' ? 'text-stone-400' : 'text-stone-800'}">{p.name}</span>
								<span class="text-xs text-stone-400">{addCategoryLabel(p.category)}</span>
							</span>
							<span class="shrink-0 text-xs text-stone-400">
								{#if p.status !== 'active'}
									{p.status}
								{:else if p.quantityType === 'estimate'}
									{estimateLabel(p.quantity)}
								{:else}
									×{p.quantity % 1 === 0 ? p.quantity : p.quantity.toFixed(1)}
								{/if}
							</span>
						</label>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Submit -->
	<form method="POST" action="?/addItems" use:enhance={() => async ({ result, update }) => {
		await update({ reset: false });
		if (result.type === 'success') { sheetMode = null; showToast('List updated'); }
	}} class="mt-4">
		{#each [...selectedIds] as pid (pid)}
			<input type="hidden" name="pantryItemId" value={pid} />
		{/each}
		{#each freeTextItems as ft (ft)}
			<input type="hidden" name="freeText" value={ft} />
		{/each}
		<button type="submit" data-shortcut="primary"
			class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white">
			Done
		</button>
	</form>
</BottomSheet>

