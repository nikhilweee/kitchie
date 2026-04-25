<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { daysUntilExpiry } from '$lib/expiry';
	import { guessQuantityType } from '$lib/quantity';
	import ListRow from '$lib/components/ListRow.svelte';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import { guessCategory } from '$lib/infer';
	import { UNITS, guessUnit } from '$lib/units';
	import { toDateStr } from '$lib/date-format';
	import { clickOutside } from '$lib/actions/click-outside';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { createSort } from '$lib/sort.svelte';
	import { ListFilter, ShoppingBasket, Search, Trash2, X, ShoppingCart } from 'lucide-svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';

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
	import type { QuantityType } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	type Item = PageData['items'][0];
	type Category = PageData['categories'][0];

	// ── Sheet mode: 'add' | 'edit' | null ────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingItem = $state<Item | null>(null);
	let confirmingDelete = $state(false);

	// Shared form state
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let showNameSuggestions = $state(false);
	let categoryId = $state('');
	let quantityType = $state<QuantityType>('estimate');
	let quantity = $state(1);
	let unit = $state('count');
	let expiryDate = $state('');
	let expiryMode = $state<'relative' | 'exact'>('relative');
	let expiryDays = $state(30);
	let purchaseDate = $state(todayStr()); // persists across adds
	let categoryLocked = $state(false);
	let expiryLocked = $state(false);

	const EXPIRY_OPTIONS = [
		{ label: 'in 1d',  days: 1   },
		{ label: 'in 3d',  days: 3   },
		{ label: 'in 1w',  days: 7   },
		{ label: 'in 2w',  days: 14  },
		{ label: 'in 1m',  days: 30  },
		{ label: 'in 2m',  days: 60  },
		{ label: 'in 3m',  days: 90  },
		{ label: 'in 6m',  days: 180 },
		{ label: 'in 1y',  days: 365 },
		{ label: 'in 2y',  days: 730 },
	] as const;

	const PURCHASE_OPTIONS = [
		{ label: 'Today',   days: 0  },
		{ label: '1d ago',  days: 1  },
		{ label: '2d ago',  days: 2  },
		{ label: '3d ago',  days: 3  },
		{ label: '1w ago',  days: 7  },
		{ label: '2w ago',  days: 14 },
		{ label: '1m ago',  days: 30 },
	] as const;

	function closestDuration(ttlDays: number): number {
		return EXPIRY_OPTIONS.reduce((prev, curr) =>
			Math.abs(curr.days - ttlDays) < Math.abs(prev.days - ttlDays) ? curr : prev
		).days;
	}

	let purchaseDaysAgo = $state(0);

	const computedPurchaseDate = $derived.by(() => {
		const d = new Date();
		d.setDate(d.getDate() - purchaseDaysAgo);
		return d.toISOString().split('T')[0];
	});

	const computedExpiryDate = $derived.by(() => {
		const base = new Date(expiryMode === 'relative' ? computedPurchaseDate : (purchaseDate || todayStr()));
		base.setDate(base.getDate() + expiryDays);
		return base.toISOString().split('T')[0];
	});

	// Toast
	const toast = createToast();
	const showToast = toast.show;

	// Suggest existing pantry items when typing in add mode
	const nameSuggestions = $derived(
		sheetMode === 'add' && nameInput.trim().length > 0
			? data.items.filter((i) =>
					i.name.toLowerCase().includes(nameInput.trim().toLowerCase())
				)
			: []
	);

	function todayStr() {
		return new Date().toISOString().split('T')[0];
	}

	function defaultCategoryId() {
		return data.categories.find((c) => c.name === 'Other')?.id ?? data.categories[0]?.id ?? '';
	}

	function categoryById(id: string): Category | undefined {
		return data.categories.find((c) => c.id === id);
	}

	function categoryLabel(id: string): string {
		return categoryById(id)?.name ?? id;
	}

	function openAdd() {
		sheetMode = 'add';
		editingItem = null;
		nameInput = '';
		categoryId = defaultCategoryId();
		quantityType = 'estimate';
		quantity = 1;
		unit = 'count';
		expiryMode = 'relative';
		expiryDays = closestDuration(categoryById(defaultCategoryId())?.ttlDays ?? 30);
		purchaseDaysAgo = 0;
		expiryDate = '';
		categoryLocked = false;
		expiryLocked = false;
		setTimeout(() => nameEl?.focus(), 50);
	}

	function openEdit(item: Item) {
		sheetMode = 'edit';
		editingItem = item;
		confirmingDelete = false;
		nameInput = item.name;
		categoryId = item.category;
		quantityType = item.quantityType as QuantityType;
		quantity = item.quantity;
		unit = item.unit ?? 'count';
		purchaseDate = toDateStr(item.purchaseDate);
		expiryDate = toDateStr(item.expiryDate);
		categoryLocked = true;
		if (item.expiryOverridden) {
			expiryMode = 'exact';
			expiryLocked = true;
		} else {
			expiryMode = 'relative';
			expiryLocked = false;
			const diffDays = Math.round(
				(new Date(item.expiryDate).getTime() - new Date(item.purchaseDate).getTime()) / 86400000
			);
			expiryDays = closestDuration(diffDays);
		}
		history.replaceState(history.state, '', `?edit=${item.id}`);
	}

	function closeSheet() {
		sheetMode = null;
		editingItem = null;
		confirmingDelete = false;
		history.replaceState(history.state, '', location.pathname);
	}

	// Deep-link: ?edit=<id> opens the edit sheet for that pantry item
	$effect(() => {
		if (data.editId) {
			const item = data.items.find((i) => i.id === data.editId);
			if (item) openEdit(item);
		}
	});

	function onNameInput() {
		if (!categoryLocked) {
			const inferredName = guessCategory(nameInput);
			const matched = data.categories.find((c) => c.name === inferredName);
			categoryId = matched?.id ?? defaultCategoryId();
		}
		quantityType = guessQuantityType(nameInput);
		unit = guessUnit(nameInput);
		if (!expiryLocked) {
			const cat = categoryById(categoryId);
			const ttlDays = cat?.ttlDays ?? 30;
			expiryDays = closestDuration(ttlDays);
		}
		if (sheetMode === 'add') quantity = 1;
	}

	function onSheetSuccess() {
		const msg = sheetMode === 'add' ? 'Added to pantry' : 'Pantry item updated';
		closeSheet();
		showToast(msg);
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
		if (days <= 0) return 'today';
		if (days === 1) return '1d ago';
		if (days < 30) return `${days}d ago`;
		if (days < 365) return `${Math.round(days / 30)}m ago`;
		return `${Math.round(days / 365)}y ago`;
	}

	function expiryColor(iso: string) {
		const d = daysUntilExpiry(new Date(iso));
		if (d < 0)  return 'text-red-500';
		if (d <= 3) return 'text-yellow-500';
		return 'text-stone-400';
	}

	// ── Search + filter ───────────────────────────────────────────────────────
	type StatusFilter = 'expiring' | 'low' | 'normal' | 'done';
	let search = $state('');
	let searchEl = $state<HTMLInputElement | undefined>(undefined);
	let activeStatus = $state<StatusFilter | null>(null);
	let activeCategories = $state(new SvelteSet<string>());
	let filterOpen = $state(false);
	type SortField = 'name' | 'category' | 'expiry' | 'purchased';
	const s = createSort<SortField>('expiry', 'asc');

	const SORT_FIELDS: { field: SortField; label: string }[] = [
		{ field: 'name', label: 'Name' },
		{ field: 'category', label: 'Category' },
		{ field: 'expiry', label: 'Expiry date' },
		{ field: 'purchased', label: 'Purchase date' },
	];

	function toggleStatus(s: StatusFilter) {
		activeStatus = activeStatus === s ? null : s;
	}

	function toggleCategory(id: string) {
		const next = new SvelteSet(activeCategories);
		if (next.has(id)) next.delete(id); else next.add(id);
		activeCategories = next;
	}

	function itemStatus(item: Item): StatusFilter {
		const days = daysUntilExpiry(new Date(item.expiryDate));
		const isLow = item.quantityType === 'estimate' ? item.quantity <= 0.15 : item.quantity <= 1;
		if (days <= 3) return 'expiring';
		if (isLow) return 'low';
		return 'normal';
	}

	const activeFilterCount = $derived(activeCategories.size);

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
				// asc: secondary by expiry asc; desc: secondary by name desc
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

		// purchased-asc or purchased-desc
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
			if (search.trim() && !i.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
			if (activeStatus === 'done') {
				// Out of Stock: show non-active items only
				if (i.status === 'active') return false;
			} else {
				// All other views: active items only
				if (i.status !== 'active') return false;
				if (activeStatus !== null && itemStatus(i) !== activeStatus) return false;
			}
			if (activeCategories.size > 0 && !activeCategories.has(i.category)) return false;
			return true;
		}))
	);

	// Only show categories that have at least one item
	const presentCategories = $derived(
		data.categories.filter((cat) => data.items.some((i) => i.category === cat.id))
	);

</script>

<svelte:head><title>Kitchie | Pantry</title></svelte:head>
<svelte:window onkeydown={(e) => {
	if (e.key !== '/') return;
	const active = document.activeElement;
	if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
	e.preventDefault();
	searchEl?.focus();
}} />

<Toast message={toast.message} />

<PageShell title="Pantry" mainClass="px-4 py-4 pb-36">
		{#if data.items.length === 0}
			<EmptyState icon={ShoppingBasket} heading="Pantry is empty" detail="Add items after your next shopping trip." />
		{:else}
			<!-- Search + filter -->
			<div class="relative mb-4 flex gap-2" use:clickOutside={() => (filterOpen = false)}>
				<div class="relative flex-1">
					<input
						type="text"
						bind:this={searchEl}
						bind:value={search}
						onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); searchEl?.blur(); } }}
						placeholder="Search pantry…"
						autocomplete="off"
						class="block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none {search ? 'pr-8' : ''}"
					/>
					{#if search}
						<button
							type="button"
							onclick={() => (search = '')}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
							aria-label="Clear search"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				</div>
				<button
					type="button"
					onclick={() => (filterOpen = !filterOpen)}
					class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors {activeFilterCount > 0 ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400'}"
					aria-label="Filters"
				>
					<ListFilter class="h-4 w-4" />
					{#if activeFilterCount > 0}
						<span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{activeFilterCount}</span>
					{/if}
				</button>
				{#if filterOpen}
					<div class="absolute top-full right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
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
									<input type="checkbox" checked={activeCategories.has(cat.id)} onchange={() => toggleCategory(cat.id)} class="accent-orange-500" />
									<span class="text-sm text-stone-700">{cat.name}</span>
								</label>
							{/each}
						{/if}
						<div class="border-t border-stone-100 p-2">
							<button type="button" onclick={() => { s.by = 'expiry'; s.dir = 'asc'; activeCategories = new SvelteSet(); }} class="w-full rounded-lg py-1.5 text-xs text-stone-400 hover:bg-stone-50">Clear all</button>
						</div>
					</div>
				{/if}
			</div>
			<div class="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
				<button type="button" onclick={() => toggleStatus('normal')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {activeStatus === 'normal' ? 'border-green-600 bg-green-600 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>In Stock</button>
				<button type="button" onclick={() => toggleStatus('expiring')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {activeStatus === 'expiring' ? 'border-red-600 bg-red-600 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>Expiring Soon</button>
				<button type="button" onclick={() => toggleStatus('low')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {activeStatus === 'low' ? 'border-yellow-500 bg-yellow-500 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
				>Running Low</button>
				<button type="button" onclick={() => toggleStatus('done')}
					class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {activeStatus === 'done' ? 'border-stone-500 bg-stone-500 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
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
							<span class="w-8 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-400">Qty</span>
							<span class="{s.by === 'purchased' ? 'w-12' : 'w-8'} shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-400">
								{s.by === 'purchased' ? 'Pur' : 'Exp'}
							</span>
						</div>
					{/if}
					{@render itemList(group.items)}
				{/each}
			{/if}
		{/if}
</PageShell>

{#if !selectionMode}
	<AddButton label="Add to Pantry" onclick={openAdd} />
{/if}

{#if selectionMode && selectedIds.size > 0}
		<div class="fixed bottom-14 left-0 right-0 z-10 px-4 pb-2">
			<div class="mx-auto flex w-full max-w-lg items-center gap-2">
				<form method="POST" action="?/bulkConsume" use:enhance={() => async ({ update }) => {
					const count = selectedIds.size;
					await update({ reset: false });
					showToast(`${count} item${count !== 1 ? 's' : ''} consumed`);
					exitSelection();
				}} class="contents">
					{#each [...selectedIds] as id}
						<input type="hidden" name="id" value={id} />
					{/each}
					<button type="submit"
						class="flex-1 rounded-2xl bg-stone-700 py-4 text-base font-semibold text-white shadow-lg density-fab">
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
					showToast(`${count} item${count !== 1 ? 's' : ''} deleted`);
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
					<form method="POST" action="/shopping/{list.id}?/addItems"
						use:enhance={() => async ({ update }) => {
							await update({ reset: false });
							showToast(`Added to ${list.name}`);
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
					onclick={() => selectionMode ? toggleItem(item.id) : openEdit(item)}
					class="min-w-0 flex-1 text-left"
				>
					<p class="truncate font-medium text-stone-900 density-text">{item.name}</p>
					<p class="text-xs text-stone-400 density-hide">{categoryLabel(item.category)}</p>
				</button>
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
				{#if item.status !== 'active'}
					<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {item.status === 'consumed' ? 'bg-stone-100 text-stone-400' : 'bg-red-50 text-red-400'}">
						{item.status}
					</span>
				{:else if s.by === 'purchased'}
					<span class="w-12 shrink-0 text-right text-xs font-medium text-stone-400">
						{purchaseLabel(item.purchaseDate)}
					</span>
				{:else}
					<span class="w-8 shrink-0 text-right text-xs font-medium {expiryColor(item.expiryDate)}">
						{expiryLabel(item.expiryDate)}
					</span>
				{/if}
			</ListRow>
		{/each}
	</ul>
{/snippet}

<!-- ── Add / Edit sheet ───────────────────────────────────────────────────── -->
<BottomSheet open={!!sheetMode} onclose={closeSheet}>
	<form
		id="pantry-item-form"
		method="POST"
		action={sheetMode === 'add' ? '?/add' : '?/update'}
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') onSheetSuccess();
		}}
	>
		{#if sheetMode === 'edit' && editingItem}
			<input type="hidden" name="id" value={editingItem.id} />
		{/if}

		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>

		<div class="relative" use:clickOutside={() => (showNameSuggestions = false)}>
			<input
				bind:this={nameEl}
				bind:value={nameInput}
				oninput={onNameInput}
				onfocus={() => (showNameSuggestions = true)}
				name="name"
				type="text"
				placeholder="What did you buy?"
				autocapitalize="sentences"
				autocomplete="off"
				required
				class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none density-sheet-name"
			/>
			{#if showNameSuggestions && nameSuggestions.length > 0}
				<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each nameSuggestions as item (item.id)}
						<li>
							<button
								type="button"
								onmousedown={() => openEdit(item)}
								class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
							>
								<span class="flex-1 font-medium">{item.name}</span>
								<span class="shrink-0 text-xs text-stone-400">{categoryLabel(item.category)} · already in pantry</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="mt-3 space-y-3">
			<div>
				<label for="sheet-category" class="mb-1 block text-xs font-medium text-stone-500">Category</label>
				<select
					id="sheet-category"
					name="category"
					bind:value={categoryId}
					onchange={() => (categoryLocked = true)}
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				>
					{#each data.categories as cat (cat.id)}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<div class="mb-2 flex items-center justify-between">
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button
							type="button"
							onclick={() => { quantityType = 'estimate'; quantity = 1; }}
							class="px-3 py-1.5 transition-colors {quantityType === 'estimate' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}"
						>Estimate</button>
						<button
							type="button"
							onclick={() => { quantityType = 'count'; quantity = 1; }}
							class="px-3 py-1.5 transition-colors {quantityType === 'count' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}"
						>Quantity</button>
					</div>
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button type="button"
							onclick={() => { expiryMode = 'exact'; expiryDate = computedExpiryDate; expiryLocked = true; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'exact' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}"
						>Date</button>
						<button type="button"
							onclick={() => { expiryMode = 'relative'; expiryLocked = false; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'relative' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}"
						>Duration</button>
					</div>
				</div>
				<input type="hidden" name="quantityType" value={quantityType} />
				{#if quantityType === 'count'}
					<div class="grid grid-cols-2 gap-2">
						<div class="flex items-center overflow-hidden rounded-xl border border-stone-300 bg-stone-50">
							<button
								type="button"
								onclick={() => (quantity = Math.max(0, quantity - 1))}
								class="flex h-full w-10 shrink-0 items-center justify-center text-stone-500 hover:bg-stone-100"
							>−</button>
							<input
								name="quantity"
								type="number"
								bind:value={quantity}
								min="0"
								step="1"
								class="w-0 min-w-0 flex-1 bg-transparent text-center text-sm text-stone-900 focus:outline-none"
							/>
							<button
								type="button"
								onclick={() => quantity++}
								class="flex h-full w-10 shrink-0 items-center justify-center text-stone-500 hover:bg-stone-100"
							>+</button>
						</div>
						<select
							name="unit"
							bind:value={unit}
							class="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						>
							{#each UNITS as u (u.value)}
								<option value={u.value}>{u.label}</option>
							{/each}
						</select>
					</div>
				{:else}
					<EstimatePicker bind:value={quantity} />
					<input type="hidden" name="quantity" value={quantity} />
				{/if}
			</div>

			{#if expiryMode === 'relative'}
				<input type="hidden" name="purchaseDate" value={computedPurchaseDate} />
				<input type="hidden" name="expiryDate" value={computedExpiryDate} />
				<input type="hidden" name="expiryOverridden" value="false" />
				<div class="grid grid-cols-2 gap-2">
					<div>
						<p class="mb-1 text-xs font-medium text-stone-500">Purchased</p>
						<select
							bind:value={purchaseDaysAgo}
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						>
							{#each PURCHASE_OPTIONS as opt (opt.days)}
								<option value={opt.days}>{opt.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<p class="mb-1 text-xs font-medium text-stone-500">Expires</p>
						<select
							bind:value={expiryDays}
							onchange={() => (expiryLocked = true)}
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						>
							{#each EXPIRY_OPTIONS as opt (opt.days)}
								<option value={opt.days}>{opt.label}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else}
				<input type="hidden" name="expiryOverridden" value="true" />
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="sheet-purchased" class="mb-1 block text-xs font-medium text-stone-500">Purchased</label>
						<input
							id="sheet-purchased"
							name="purchaseDate"
							type="date"
							bind:value={purchaseDate}
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="sheet-expiry" class="mb-1 block text-xs font-medium text-stone-500">Expires</label>
						<input
							id="sheet-expiry"
							name="expiryDate"
							type="date"
							bind:value={expiryDate}
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
						/>
					</div>
				</div>
			{/if}
		</div>

		{#if sheetMode === 'edit' && editingItem && editingItem.status !== 'active'}
			<p class="mt-3 rounded-xl bg-stone-100 px-4 py-2.5 text-center text-xs text-stone-500">
				Set a quantity and save to restore this item to your pantry.
			</p>
		{/if}

	</form>

	<!-- Primary action row (outside main form to allow sibling Discard form) -->
	<div class="mt-4 flex gap-2">
		{#if sheetMode === 'add'}
			<button type="button" onclick={closeSheet}
				class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors density-sheet-btn">
				Cancel
			</button>
		{/if}
		{#if sheetMode === 'edit' && editingItem && editingItem.status === 'active'}
			<form method="POST" action="?/discard" class="flex-1"
				use:enhance={() => async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') { closeSheet(); showToast('Trashed'); }
				}}
			>
				<input type="hidden" name="id" value={editingItem.id} />
				<button type="submit" data-shortcut="delete"
					class="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors text-sm font-medium density-sheet-btn">
					<Trash2 class="h-4 w-4" />
					Trash
				</button>
			</form>
		{/if}
		<button type="submit" form="pantry-item-form" data-shortcut="primary" disabled={!nameInput.trim()}
			class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors density-sheet-btn">
			{sheetMode === 'edit' ? 'Save' : 'Add item'}
		</button>
	</div>

	<!-- Add to shopping list (edit mode only) -->
	{#if sheetMode === 'edit' && editingItem && data.lists.length > 0}
		{@const itemId = editingItem.id}
		<div class="mt-3 border-t border-stone-100 pt-3">
			<p class="mb-2 text-xs font-medium text-stone-400">Carts</p>
			<div class="space-y-1.5">
				{#each data.lists as list (list.id)}
					{@const onList = data.listMembership.has(`${list.id}:${itemId}`)}
					<form method="POST" action={onList ? '?/removeFromList' : '?/addToList'}
						use:enhance={() => {
							const wasOnList = onList;
							return async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') showToast(wasOnList ? `Removed from ${list.name}` : `Added to ${list.name}`);
							};
						}}>
						<input type="hidden" name="itemId" value={itemId} />
						<input type="hidden" name="listId" value={list.id} />
						<button type="submit"
							class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors {onList ? 'border-orange-300 bg-orange-50 text-orange-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600' : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-orange-300 hover:bg-orange-50'}">
							<span class="text-xs">{onList ? '✓' : '+'}</span>
							{list.name}
						</button>
					</form>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Danger zone: delete permanently (edit mode only, two-tap) -->
	{#if sheetMode === 'edit' && editingItem}
		{#if !confirmingDelete}
			<button type="button" onclick={() => (confirmingDelete = true)}
				class="mt-2 w-full py-2 text-xs text-stone-400 hover:text-red-400 transition-colors">
				Delete permanently
			</button>
		{:else}
			<div class="mt-2 flex gap-2">
				<button type="button" onclick={() => (confirmingDelete = false)}
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors density-sheet-btn">
					Cancel
				</button>
				<form method="POST" action="?/delete" class="flex-1"
					use:enhance={() => async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') { closeSheet(); showToast('Item deleted'); }
					}}
				>
					<input type="hidden" name="id" value={editingItem.id} />
					<button type="submit" class="w-full rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors density-sheet-btn">
						Yes, delete
					</button>
				</form>
			</div>
		{/if}
	{/if}
</BottomSheet>
