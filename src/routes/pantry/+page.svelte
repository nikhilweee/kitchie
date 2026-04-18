<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { CATEGORY_LABELS, daysUntilExpiry, calcExpiry } from '$lib/expiry';
	import { guessQuantityType } from '$lib/quantity';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import { guessCategory } from '$lib/infer';
	import { UNITS, guessUnit } from '$lib/units';
	import { toDateStr } from '$lib/date-format';
	import { clickOutside } from '$lib/actions/click-outside';
	import Toast from '$lib/components/Toast.svelte';
	import type { PantryCategory, QuantityType } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	type Item = PageData['items'][0];

	// ── Sheet mode: 'add' | 'edit' | null ────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingItem = $state<Item | null>(null);

	// Shared form state
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let showNameSuggestions = $state(false);
	let category = $state<PantryCategory>('other');
	let quantityType = $state<QuantityType>('estimate');
	let quantity = $state(1);
	let unit = $state('count');
	let expiryDate = $state('');
	let purchaseDate = $state(todayStr()); // persists across adds
	let categoryLocked = $state(false);
	let expiryLocked = $state(false);

	// Toast
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout>;
	function showToast(msg: string) {
		clearTimeout(toastTimer);
		toast = msg;
		toastTimer = setTimeout(() => (toast = null), 2500);
	}

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

	function openAdd() {
		sheetMode = 'add';
		editingItem = null;
		nameInput = '';
		category = 'other';
		quantityType = 'estimate';
		quantity = 1;
		unit = 'count';
		expiryDate = '';
		categoryLocked = false;
		expiryLocked = false;
		setTimeout(() => nameEl?.focus(), 50);
	}

	function openEdit(item: Item) {
		sheetMode = 'edit';
		editingItem = item;
		nameInput = item.name;
		category = item.category as PantryCategory;
		quantityType = item.quantityType as QuantityType;
		quantity = item.quantity;
		unit = item.unit ?? 'count';
		purchaseDate = toDateStr(item.purchaseDate);
		expiryDate = toDateStr(item.expiryDate);
		categoryLocked = true;
		expiryLocked = item.expiryOverridden;
		setTimeout(() => nameEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
		editingItem = null;
	}

	function onNameInput() {
		if (!categoryLocked) category = guessCategory(nameInput);
		quantityType = guessQuantityType(nameInput);
		unit = guessUnit(nameInput);
		if (!expiryLocked) {
			const pd = purchaseDate ? new Date(purchaseDate) : new Date();
			expiryDate = calcExpiry(category, pd).toISOString().split('T')[0];
		}
		if (sheetMode === 'add') quantity = 1;
	}

	function onSheetSuccess() {
		const msg = sheetMode === 'add' ? 'Added to pantry' : 'Pantry item updated';
		closeSheet();
		showToast(msg);
	}

	// ── Item list helpers ─────────────────────────────────────────────────────
	function groupItems(items: Item[]) {
		const expiringSoon: Item[] = [];
		const runningLow: Item[] = [];
		const normal: Item[] = [];
		for (const item of items) {
			const days = daysUntilExpiry(new Date(item.expiryDate));
			const isLow = item.quantityType === 'estimate' ? item.quantity <= 0.15 : item.quantity <= 1;
			if (days <= 3) expiringSoon.push(item);
			else if (isLow) runningLow.push(item);
			else normal.push(item);
		}
		return { expiringSoon, runningLow, normal };
	}

	const groups = $derived(groupItems(data.items));

	function expiryLabel(iso: string) {
		const d = daysUntilExpiry(new Date(iso));
		if (d < 0) return 'Expired';
		if (d === 0) return 'Today';
		if (d === 1) return 'Tomorrow';
		return `${d}d`;
	}

	function expiryColor(iso: string) {
		const d = daysUntilExpiry(new Date(iso));
		if (d <= 0) return 'text-red-600';
		if (d <= 3) return 'text-orange-500';
		return 'text-stone-400';
	}

	const categories = Object.entries(CATEGORY_LABELS) as [PantryCategory, string][];
</script>

<svelte:head><title>Pantry — Kitchie</title></svelte:head>

<Toast message={toast} />

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Pantry" />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if data.items.length === 0}
			<EmptyState emoji="🧺" heading="Pantry is empty" detail="Add items after your next shopping trip." />
		{:else}
			{#if groups.expiringSoon.length > 0}
				<section class="mb-6">
					<h2 class="mb-2 text-xs font-semibold tracking-wider text-red-500 uppercase">Expiring soon</h2>
					{@render itemList(groups.expiringSoon)}
				</section>
			{/if}
			{#if groups.runningLow.length > 0}
				<section class="mb-6">
					<h2 class="mb-2 text-xs font-semibold tracking-wider text-orange-500 uppercase">Running low</h2>
					{@render itemList(groups.runningLow)}
				</section>
			{/if}
			{#if groups.normal.length > 0}
				<section class="mb-6">
					<h2 class="mb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">In stock</h2>
					{@render itemList(groups.normal)}
				</section>
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
					<p class="text-xs text-stone-400">{CATEGORY_LABELS[item.category as PantryCategory]}</p>
				</button>
				{#if item.quantityType === 'estimate'}
					<EstimatePicker value={item.quantity} readonly />
				{:else}
					<span class="shrink-0 text-sm font-medium text-stone-600">
						×{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}{item.unit && item.unit !== 'count' ? ' ' + item.unit : ''}
					</span>
				{/if}
				<span class="shrink-0 text-xs font-medium {expiryColor(item.expiryDate)}">
					{expiryLabel(item.expiryDate)}
				</span>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={item.id} />
					<button type="submit" aria-label="Delete {item.name}" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400">✕</button>
				</form>
			</li>
		{/each}
	</ul>
{/snippet}

<!-- ── Add / Edit sheet ───────────────────────────────────────────────────── -->
<BottomSheet open={!!sheetMode} onclose={closeSheet}>
	<form
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
								<span class="shrink-0 text-xs text-stone-400">{CATEGORY_LABELS[item.category as PantryCategory]} · already in pantry</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="mt-3 space-y-2">
			<div>
				<label for="sheet-category" class="mb-1 block text-xs font-medium text-stone-500">Category</label>
				<select
					id="sheet-category"
					name="category"
					bind:value={category}
					onchange={() => (categoryLocked = true)}
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				>
					{#each categories as [val, label] (val)}
						<option value={val}>{label}</option>
					{/each}
				</select>
			</div>

			<div>
				<p class="mb-1 text-xs font-medium text-stone-500">Quantity</p>
				<input type="hidden" name="quantityType" value={quantityType} />
				{#if quantityType === 'count'}
					<div class="flex gap-2">
						<input
							name="quantity"
							type="number"
							bind:value={quantity}
							min="0"
							step="1"
							class="w-24 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						/>
						<select
							name="unit"
							bind:value={unit}
							class="flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						>
							{#each UNITS as u (u.value)}
								<option value={u.value}>{u.label}</option>
							{/each}
						</select>
					</div>
				{:else}
					<EstimatePicker bind:value={quantity} name="quantity" />
				{/if}
			</div>

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
						oninput={() => (expiryLocked = true)}
						class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
					/>
				</div>
			</div>
		</div>

		<FormActions
			isEditing={sheetMode === 'edit'}
			saveLabel={sheetMode === 'edit' ? 'Save' : 'Add item'}
			deleteAction="?/delete"
			disabled={!nameInput.trim()}
			oncancel={closeSheet}
		/>
	</form>
</BottomSheet>
