<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { daysUntilExpiry } from '$lib/expiry';
	import ListRow from '$lib/components/ListRow.svelte';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import SearchFilterBar from '$lib/components/SearchFilterBar.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { ShoppingBasket, Search, Trash2, ShoppingCart, UtensilsCrossed } from 'lucide-svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import { pf, pantrySort, syncPantrySort, resetPantryFilters, type PantrySortField } from '$lib/pantry-filters.svelte';

	// ── Bulk selection ─────────────────────────────────────────────────────────
	let selectionMode = $state(false);
	let selectedIds = $state(new SvelteSet<string>());
	let listPickerOpen = $state(false);

	let longPressTimer: ReturnType<typeof setTimeout> | undefined;
	const LONG_PRESS_MS = 500;

	function startLongPress(id: string) {
		longPressTimer = setTimeout(() => {
			selectionMode = true;
			selectedIds.add(id);
		}, LONG_PRESS_MS);
	}

	function cancelLongPress() {
		clearTimeout(longPressTimer);
	}

	function toggleItem(id: string) {
		selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
	}

	function toggleSelectAll() {
		if (selectedIds.size === filteredItems.length) {
			selectedIds = new SvelteSet();
		} else {
			filteredItems.forEach((i) => selectedIds.add(i.id));
		}
	}

	function exitSelection() {
		selectionMode = false;
		selectedIds = new SvelteSet();
	}

	let { data }: { data: PageData } = $props();

	type Item = PageData['items'][0];

	// Toast
	const toast = createToast();

	// Read ?toast= param on arrival and show the message once
	$effect(() => {
		const msg = page.url.searchParams.get('toast');
		if (msg) {
			toast.show(decodeURIComponent(msg.replace(/\+/g, ' ')));
			history.replaceState(history.state, '', location.pathname);
		}
	});

	// Sync sort changes back to localStorage
	$effect(() => syncPantrySort(pantrySort.by, pantrySort.dir));

	function categoryLabel(id: string): string {
		return data.categories.find((c) => c.id === id)?.name ?? id;
	}

	function expiryLabel(iso: string) {
		const d = daysUntilExpiry(new Date(iso));
		const abs = Math.abs(d);
		let value: number, unit: string;
		if (abs < 30)       { value = abs;                    unit = 'd'; }
		else if (abs < 365) { value = Math.round(abs / 30);   unit = 'm'; }
		else                { value = Math.round(abs / 365);  unit = 'y'; }
		return d < 0 ? `-${value}${unit}` : `${value}${unit}`;
	}

	function purchaseLabel(iso: string) {
		const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
		const abs = Math.abs(days);
		let value: number, unit: string;
		if (abs < 30)       { value = abs;                   unit = 'd'; }
		else if (abs < 365) { value = Math.round(abs / 30);  unit = 'm'; }
		else                { value = Math.round(abs / 365); unit = 'y'; }
		return days <= 0 ? `${value}${unit}` : `-${value}${unit}`;
	}

	function expiryColor(iso: string) {
		const d = daysUntilExpiry(new Date(iso));
		if (d < 0)  return 'text-red-500';
		if (d <= 3) return 'text-yellow-500';
		return 'text-stone-400';
	}

	// ── Search + filter ───────────────────────────────────────────────────────
	const s = pantrySort;

	const SORT_FIELDS: { field: PantrySortField; label: string }[] = [
		{ field: 'name', label: 'Name' },
		{ field: 'category', label: 'Category' },
		{ field: 'expiry', label: 'Expiry date' },
		{ field: 'purchased', label: 'Purchase date' },
	];

	function toggleStatus(status: typeof pf.activeStatus) {
		pf.activeStatus = pf.activeStatus === status ? null : status;
	}

	function toggleCategory(id: string) {
		const cats = pf.activeCategories;
		pf.activeCategories = cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id];
	}

	function itemStatus(item: Item) {
		const days = daysUntilExpiry(new Date(item.expiryDate));
		const isLow = item.quantityType === 'estimate' ? item.quantity <= 0.15 : item.quantity <= 1;
		if (days <= 3) return 'expiring';
		if (isLow) return 'low';
		return 'normal';
	}

	const activeFilterCount = $derived(pf.activeCategories.length);

	const onListIds = $derived(new Set(
		[...data.listMembership].map((key) => key.split(':')[1])
	));

	function sortItems(items: Item[]): Item[] {
		if (!s.key) return items;
		return [...items].sort((a, b) => {
			if (s.key === 'name-asc') return a.name.localeCompare(b.name);
			if (s.key === 'name-desc') return b.name.localeCompare(a.name);
			if (s.key === 'category-asc' || s.key === 'category-desc') {
				const catCmp = categoryLabel(a.category).localeCompare(categoryLabel(b.category));
				const dir = s.key === 'category-asc' ? 1 : -1;
				if (catCmp !== 0) return catCmp * dir;
				if (s.key === 'category-asc')
					return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
				return b.name.localeCompare(a.name);
			}
			if (s.key === 'expiry-asc') return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
			if (s.key === 'expiry-desc') return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
			if (s.key === 'purchased-asc') return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
			return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
		});
	}

	type Group = { label: string; items: Item[] };

	const groupedItems = $derived.by((): Group[] => {
		const items = filteredItems;
		if (!s.key) return [{ label: '', items }];

		if (s.key === 'name-asc' || s.key === 'name-desc') {
			const map = new SvelteMap<string, Item[]>();
			for (const item of items) {
				const letter = item.name[0]?.toUpperCase() ?? '#';
				if (!map.has(letter)) map.set(letter, []);
				map.get(letter)!.push(item);
			}
			return [...map.entries()].map(([label, items]) => ({ label, items }));
		}

		if (s.key === 'category-asc' || s.key === 'category-desc') {
			const map = new SvelteMap<string, Item[]>();
			for (const item of items) {
				const label = categoryLabel(item.category);
				if (!map.has(label)) map.set(label, []);
				map.get(label)!.push(item);
			}
			return [...map.entries()].map(([label, items]) => ({ label, items }));
		}

		if (s.key === 'purchased-asc' || s.key === 'purchased-desc') {
			const PURCHASE_BUCKET_ORDER = ['Today', 'This Week', 'Earlier'];
			const bucketFor = (item: Item) => {
				const days = Math.floor((Date.now() - new Date(item.purchaseDate).getTime()) / 86400000);
				if (days <= 0) return 'Today';
				if (days <= 7) return 'This Week';
				return 'Earlier';
			};
			const map = new SvelteMap<string, Item[]>(PURCHASE_BUCKET_ORDER.map((b) => [b, []]));
			for (const item of items) map.get(bucketFor(item))!.push(item);
			let groups = [...map.entries()]
				.filter(([, items]) => items.length > 0)
				.map(([label, items]) => ({ label, items }));
			if (s.key === 'purchased-desc') groups = groups.reverse();
			return groups;
		}

		// expiry-asc or expiry-desc
		const BUCKET_ORDER = ['Expired', 'This Week', 'Later'];
		const bucketFor = (item: Item) => {
			const days = daysUntilExpiry(new Date(item.expiryDate));
			if (days <= 0) return 'Expired';
			if (days <= 7) return 'This Week';
			return 'Later';
		};
		const map = new SvelteMap<string, Item[]>(BUCKET_ORDER.map((b) => [b, []]));
		for (const item of items) map.get(bucketFor(item))!.push(item);
		let groups = [...map.entries()]
			.filter(([, items]) => items.length > 0)
			.map(([label, items]) => ({ label, items }));
		if (s.key === 'expiry-desc') groups = groups.reverse();
		return groups;
	});

	const filteredItems = $derived(
		sortItems(data.items.filter((i) => {
			if (pf.search.trim() && !i.name.toLowerCase().includes(pf.search.trim().toLowerCase())) return false;
			if (pf.activeStatus === 'done') {
				if (i.status === 'active') return false;
			} else {
				if (i.status !== 'active') return false;
				if (pf.activeStatus !== null && itemStatus(i) !== pf.activeStatus) return false;
			}
			if (pf.activeCategories.length > 0 && !pf.activeCategories.includes(i.category)) return false;
			return true;
		}))
	);

	// Only show categories that have at least one item
	const presentCategories = $derived(
		data.categories.filter((cat) => data.items.some((i) => i.category === cat.id))
	);
</script>

<svelte:head><title>Kitchie | Pantry</title></svelte:head>

<Toast message={toast.message} />

<PageShell title="Pantry" mainClass="px-4 py-4 pb-36">
		{#if data.items.length === 0}
			<EmptyState icon={ShoppingBasket} heading="Pantry is empty" detail="Add items after your next shopping trip." />
		{:else}
			<SearchFilterBar
				search={pf.search}
				onsearch={(v) => (pf.search = v)}
				placeholder="Search pantry…"
				activeFilterCount={activeFilterCount}
				onClearFilters={resetPantryFilters}
			>
				{#snippet filterOptions()}
					<div class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Sort</div>
					{#each SORT_FIELDS as f (f.field)}
						<button type="button" onclick={() => s.cycle(f.field)}
							class="flex w-full items-center gap-2 px-3 py-2 hover:bg-stone-50">
							<span class="flex h-4 w-4 shrink-0 items-center justify-center text-xs {s.by === f.field ? 'text-orange-500' : 'text-stone-300'}">
								{s.by === f.field ? (s.dir === 'asc' ? '↑' : '↓') : '•'}
							</span>
							<span class="text-sm {s.by === f.field ? 'font-medium text-stone-900' : 'text-stone-700'}">{f.label}</span>
						</button>
					{/each}
					{#if presentCategories.length > 0}
						<div class="border-t border-stone-100 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Category</div>
						{#each presentCategories as cat (cat.id)}
							<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-stone-50">
								<input type="checkbox" checked={pf.activeCategories.includes(cat.id)} onchange={() => toggleCategory(cat.id)} class="accent-orange-500" />
								<span class="text-sm text-stone-700">{cat.name}</span>
							</label>
						{/each}
					{/if}
				{/snippet}
			</SearchFilterBar>
			<div class="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
				<button type="button" onclick={() => toggleStatus('normal')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {pf.activeStatus === 'normal' ? 'border-green-600 bg-green-600 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>In Stock</button>
				<button type="button" onclick={() => toggleStatus('expiring')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {pf.activeStatus === 'expiring' ? 'border-red-600 bg-red-600 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>Expiring Soon</button>
				<button type="button" onclick={() => toggleStatus('low')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {pf.activeStatus === 'low' ? 'border-yellow-500 bg-yellow-500 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>Running Low</button>
				<button type="button" onclick={() => toggleStatus('done')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {pf.activeStatus === 'done' ? 'border-stone-500 bg-stone-500 text-white dark:text-stone-50' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>Out of Stock</button>
			</div>
			{#if selectionMode}
				<div class="mb-3 flex items-center gap-3">
					<span class="flex-1 text-sm font-medium text-stone-700">{selectedIds.size} selected</span>
					<button type="button" onclick={toggleSelectAll}
						class="text-xs font-medium text-orange-500">
						{selectedIds.size === filteredItems.length ? 'Deselect all' : 'Select all'}
					</button>
					<button type="button" onclick={exitSelection}
						class="text-xs font-medium text-stone-400">Cancel</button>
				</div>
			{/if}
			{#if filteredItems.length === 0}
				<EmptyState icon={Search} heading="No matches" detail="Try a different search or filter." />
			{:else}
				{#each groupedItems as group (group.label)}
					{#if group.label}
						<div class="mt-4 mb-1 flex items-center gap-3 px-4">
							<h2 class="flex-1 text-xs font-semibold uppercase tracking-wider text-stone-400">{group.label}</h2>
							<span class="w-8 shrink-0"></span>
							{#if pf.activeStatus === 'done'}
							<span class="w-8 shrink-0"></span>
							<span class="w-8 shrink-0"></span>
							<span class="w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-400">Out</span>
						{:else}
							<span class="w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-400">Qty</span>
							<span class="w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-400">
								{s.by === 'purchased' ? 'Buy' : 'Exp'}
							</span>
						{/if}
						</div>
					{/if}
					{@render itemList(group.items)}
				{/each}
			{/if}
		{/if}
</PageShell>

{#if !selectionMode}
	<AddButton label="Add to Pantry" onclick={() => goto('/pantry/add')} />
{/if}

{#if selectionMode && selectedIds.size > 0}
		<div class="fixed left-0 right-0 z-10 px-4 pb-2" style="bottom: calc(3.5rem + env(safe-area-inset-bottom))">
			<div class="mx-auto flex w-full max-w-lg items-center gap-2">
				<form method="POST" action="?/bulkConsume" use:enhance={() => async ({ update }) => {
					const count = selectedIds.size;
					await update({ reset: false });
					toast.show(`${count} item${count !== 1 ? 's' : ''} finished`);
					exitSelection();
				}} class="contents">
					{#each [...selectedIds] as id}
						<input type="hidden" name="id" value={id} />
					{/each}
					<button type="submit"
						class="flex-1 rounded-2xl bg-stone-700 py-4 text-base font-semibold text-white dark:text-stone-50 shadow-lg density-fab">
						Consume
					</button>
				</form>
				<button type="button" onclick={() => (listPickerOpen = true)}
					class="flex-1 rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg density-fab">
					Add to cart
				</button>
				<form method="POST" action="?/bulkTrash" use:enhance={() => async ({ update }) => {
					const count = selectedIds.size;
					await update({ reset: false });
					toast.show(`${count} item${count !== 1 ? 's' : ''} deleted`);
					exitSelection();
				}} class="contents">
					{#each [...selectedIds] as id}
						<input type="hidden" name="id" value={id} />
					{/each}
					<button type="submit" aria-label="Delete selected"
						class="flex w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-red-200 bg-white py-4 text-red-400 shadow-lg hover:bg-red-50 density-fab">
						<Trash2 class="h-5 w-5" />
					</button>
				</form>
			</div>
		</div>
	{/if}

<BottomSheet open={listPickerOpen} onclose={() => (listPickerOpen = false)}>
	<h2 class="mb-4 text-base font-semibold text-stone-900">Add to cart</h2>
	{#if data.lists.length === 0}
		<p class="text-sm text-stone-400">No carts yet. Create one from the Carts tab.</p>
	{:else}
		<ul class="space-y-2">
			{#each data.lists as list (list.id)}
				<li>
					<form method="POST" action="/carts/{list.id}?/addItems"
						use:enhance={() => async ({ update }) => {
							await update({ reset: false });
							toast.show(`Added to ${list.name}`);
							listPickerOpen = false;
							exitSelection();
						}}>
						{#each [...selectedIds] as id}
							<input type="hidden" name="pantryItemId" value={id} />
						{/each}
						<button type="submit"
							class="flex w-full items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-left text-sm font-medium text-stone-800 hover:bg-stone-100">
							{list.name}
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</BottomSheet>

{#snippet itemList(items: Item[])}
	<ul class="space-y-2">
		{#each items as item (item.id)}
			<ListRow>
				{#if selectionMode}
					<button type="button" onclick={() => toggleItem(item.id)}
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors
							{selectedIds.has(item.id) ? 'border-orange-500 bg-orange-500 text-white' : 'border-stone-300'}">
						{#if selectedIds.has(item.id)}✓{/if}
					</button>
				{/if}
				<button
					type="button"
					onpointerdown={() => startLongPress(item.id)}
					onpointerup={cancelLongPress}
					onpointerleave={cancelLongPress}
					onclick={() => selectionMode ? toggleItem(item.id) : goto(`/pantry/${item.id}`)}
					class="min-w-0 flex-1 text-left"
				>
					<p class="truncate font-medium text-stone-900 density-text">{item.name}</p>
					<p class="text-xs text-stone-400 density-hide">{categoryLabel(item.category)}</p>
				</button>
				{#if item.status !== 'active'}
					<span class="flex w-8 shrink-0 items-center justify-center">
						{#if onListIds.has(item.id)}
							<ShoppingCart class="h-3 w-3 text-stone-300" />
						{/if}
					</span>
					<div class="flex w-8 shrink-0 items-center justify-center">
						{#if item.status === 'finished'}
							<UtensilsCrossed class="h-3.5 w-3.5 text-stone-400" />
						{:else}
							<Trash2 class="h-3.5 w-3.5 text-red-400" />
						{/if}
					</div>
					<span class="w-8 shrink-0 text-right text-xs font-medium text-stone-400">
						{item.finishedAt ? purchaseLabel(new Date(item.finishedAt).toISOString()) : '—'}
					</span>
				{:else}
					<span class="flex w-8 shrink-0 items-center justify-center">
						{#if onListIds.has(item.id)}
							<ShoppingCart class="h-3 w-3 text-stone-300" />
						{/if}
					</span>
					<div class="flex w-8 shrink-0 items-center justify-end">
						{#if item.quantityType === 'estimate'}
							<EstimatePicker value={item.quantity} readonly />
						{:else}
							<span class="text-sm font-medium text-stone-600">
								×{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}{item.unit && item.unit !== 'count' ? ' ' + item.unit : ''}
							</span>
						{/if}
					</div>
					{#if s.by === 'purchased'}
						<span class="w-8 shrink-0 text-right text-xs font-medium text-stone-400">
							{purchaseLabel(item.purchaseDate)}
						</span>
					{:else}
						<span class="w-8 shrink-0 text-right text-xs font-medium {expiryColor(item.expiryDate)}">
							{expiryLabel(item.expiryDate)}
						</span>
					{/if}
				{/if}
			</ListRow>
		{/each}
	</ul>
{/snippet}
