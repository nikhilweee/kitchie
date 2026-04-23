<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { daysUntilExpiry } from '$lib/expiry';
	import { guessQuantityType } from '$lib/quantity';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { guessCategory } from '$lib/infer';
	import { UNITS, guessUnit } from '$lib/units';
	import { toDateStr } from '$lib/date-format';
	import { clickOutside } from '$lib/actions/click-outside';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { createSort } from '$lib/sort.svelte';
	import { ListFilter, ShoppingBasket, Search, Trash2 } from 'lucide-svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import type { QuantityType } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	type Item = PageData['items'][0];
	type Category = PageData['categories'][0];

	// ── Sheet mode: 'add' | 'edit' | null ────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingItem = $state<Item | null>(null);
	let sidebarOpen = $state(false);
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
		setTimeout(() => nameEl?.focus(), 50);
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

	function expiryColor(iso: string) {
		const d = daysUntilExpiry(new Date(iso));
		if (d < 0)  return 'text-red-500';
		if (d <= 3) return 'text-yellow-500';
		return 'text-stone-400';
	}

	// ── Search + filter ───────────────────────────────────────────────────────
	type StatusFilter = 'expiring' | 'low' | 'normal' | 'done';
	let search = $state('');
	let activeStatus = $state<StatusFilter | null>(null);
	let activeCategories = $state(new SvelteSet<string>());
	let filterOpen = $state(false);
	type SortField = 'name' | 'category' | 'expiry';
	const s = createSort<SortField>('expiry', 'asc');

	const SORT_FIELDS: { field: SortField; label: string }[] = [
		{ field: 'name', label: 'Name' },
		{ field: 'category', label: 'Category' },
		{ field: 'expiry', label: 'Expiry' },
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


	function sortItems(items: Item[]): Item[] {
		if (!s.key) return items;
		return [...items].sort((a, b) => {
			if (s.key === 'name-asc') return a.name.localeCompare(b.name);
			if (s.key === 'name-desc') return b.name.localeCompare(a.name);
			if (s.key === 'category-asc' || s.key === 'category-desc') {
				const catCmp = categoryLabel(a.category).localeCompare(categoryLabel(b.category));
				const dir = s.key === 'category-asc' ? 1 : -1;
				return catCmp !== 0 ? catCmp * dir : a.name.localeCompare(b.name) * dir;
			}
			if (s.key === 'expiry-asc') return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
			return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
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

		// expiry-asc or expiry-desc
		const BUCKET_ORDER = ['Expired', 'Next 7 days', 'Next 14 days', 'More than 14 days'];
		const bucketFor = (item: Item) => {
			const days = daysUntilExpiry(new Date(item.expiryDate));
			if (days <= 0) return 'Expired';
			if (days <= 7) return 'Next 7 days';
			if (days <= 14) return 'Next 14 days';
			return 'More than 14 days';
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

<Toast message={toast.message} />
<Sidebar open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Pantry" onhamburger={() => (sidebarOpen = true)} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if data.items.length === 0}
			<EmptyState icon={ShoppingBasket} heading="Pantry is empty" detail="Add items after your next shopping trip." />
		{:else}
			<!-- Search + filter -->
			<div class="relative mb-4 flex gap-2" use:clickOutside={() => (filterOpen = false)}>
				<input
					type="text"
					bind:value={search}
					placeholder="Search pantry…"
					autocomplete="off"
					class="block flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
				/>
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
			{#if filteredItems.length === 0}
				<EmptyState icon={Search} heading="No matches" detail="Try a different search or filter." />
			{:else}
				{#each groupedItems as group (group.label)}
					{#if groupedItems.length > 1}
						<h2 class="mt-4 mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">{group.label}</h2>
					{/if}
					{@render itemList(group.items)}
				{/each}
			{/if}
		{/if}
	</main>

	<AddButton label="Add to Pantry" onclick={openAdd} />
</div>

{#snippet itemList(items: Item[])}
	<ul class="space-y-2">
		{#each items as item (item.id)}
			<li class="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs">
				<button
					type="button"
					onclick={() => openEdit(item)}
					class="min-w-0 flex-1 text-left"
				>
					<p class="truncate font-medium text-stone-900">{item.name}</p>
					<p class="text-xs text-stone-400">{categoryLabel(item.category)}</p>
				</button>
				<div class="flex w-16 shrink-0 justify-end">
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
				{:else}
					<span class="w-8 shrink-0 text-right text-xs font-medium {expiryColor(item.expiryDate)}">
						{expiryLabel(item.expiryDate)}
					</span>
				{/if}
			</li>
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
				class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
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
							onclick={() => { expiryMode = 'relative'; expiryLocked = false; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'relative' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}"
						>Duration</button>
						<button type="button"
							onclick={() => { expiryMode = 'exact'; expiryDate = computedExpiryDate; expiryLocked = true; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'exact' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}"
						>Date</button>
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
				class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
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
					class="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors text-sm font-medium">
					<Trash2 class="h-4 w-4" />
					Trash
				</button>
			</form>
		{/if}
		<button type="submit" form="pantry-item-form" data-shortcut="primary" disabled={!nameInput.trim()}
			class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
			{sheetMode === 'edit' ? 'Save' : 'Add item'}
		</button>
	</div>

	<!-- Add to shopping list (edit mode only) -->
	{#if sheetMode === 'edit' && editingItem && data.lists.length > 0}
		{@const itemId = editingItem.id}
		<div class="mt-3 border-t border-stone-100 pt-3">
			<p class="mb-2 text-xs font-medium text-stone-400">Shopping lists</p>
			<div class="space-y-1.5">
				{#each data.lists as list (list.id)}
					{@const onList = data.listMembership.has(`${list.id}:${itemId}`)}
					<form method="POST" action={onList ? '?/removeFromList' : '?/addToList'}
						use:enhance={() => async ({ result, update }) => {
							await update({ reset: false });
							if (result.type === 'success') showToast(onList ? `Removed from ${list.name}` : `Added to ${list.name}`);
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
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
					Cancel
				</button>
				<form method="POST" action="?/delete" class="flex-1"
					use:enhance={() => async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') { closeSheet(); showToast('Item deleted'); }
					}}
				>
					<input type="hidden" name="id" value={editingItem.id} />
					<button type="submit" class="w-full rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors">
						Yes, delete
					</button>
				</form>
			</div>
		{/if}
	{/if}
</BottomSheet>
