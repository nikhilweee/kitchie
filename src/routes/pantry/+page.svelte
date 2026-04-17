<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { CATEGORY_LABELS, daysUntilExpiry, calcExpiry } from '$lib/expiry';
	import { estimateLabel, guessQuantityType, ESTIMATE_OPTIONS } from '$lib/quantity';
	import { guessCategory } from '$lib/infer';
	import type { PantryCategory, QuantityType } from '$lib/server/db/schema';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Item = PageData['items'][0];

	// ── Sheet mode: 'add' | 'edit' | null ────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingItem = $state<Item | null>(null);

	// Shared form state
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let category = $state<PantryCategory>('other');
	let quantityType = $state<QuantityType>('estimate');
	let quantity = $state(1);
	let expiryDate = $state('');
	let purchaseDate = $state(todayStr()); // persists across adds
	let categoryLocked = $state(false);
	let expiryLocked = $state(false);

	function todayStr() {
		return new Date().toISOString().split('T')[0];
	}

	function toDateStr(iso: string) {
		return iso.split('T')[0];
	}

	function openAdd() {
		sheetMode = 'add';
		editingItem = null;
		nameInput = '';
		category = 'other';
		quantityType = 'estimate';
		quantity = 1;
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
		if (!expiryLocked) {
			const pd = purchaseDate ? new Date(purchaseDate) : new Date();
			expiryDate = calcExpiry(category, pd).toISOString().split('T')[0];
		}
		if (sheetMode === 'add') quantity = 1; // reset per new item
	}

	function onSheetSuccess() {
		if (sheetMode === 'add') {
			nameInput = '';
			categoryLocked = false;
			expiryLocked = false;
			category = 'other';
			quantityType = 'estimate';
			quantity = 1;
			expiryDate = '';
			setTimeout(() => nameEl?.focus(), 50);
		} else {
			closeSheet();
		}
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

	function qtyLabel(item: Item) {
		if (item.quantityType === 'estimate') return estimateLabel(item.quantity);
		const n = item.quantity;
		return `×${n % 1 === 0 ? n : n.toFixed(1)}`;
	}

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

{#if sheetMode}
	<div
		class="fixed inset-0 z-40 bg-black/40"
		role="button"
		tabindex="-1"
		aria-label="Close"
		onclick={closeSheet}
		onkeydown={(e) => e.key === 'Escape' && closeSheet()}
	></div>
{/if}

<div class="flex min-h-svh flex-col bg-stone-50">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
		<div class="mx-auto max-w-lg">
			<h1 class="text-lg font-bold text-stone-900">Pantry</h1>
		</div>
	</header>

	<div class="fixed bottom-14 left-0 right-0 z-30 flex justify-center px-4 pb-2">
		<button
			onclick={openAdd}
			class="flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95"
		>
			<span class="text-xl leading-none">+</span> Add to Pantry
		</button>
	</div>

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if data.items.length === 0}
			<div class="mt-16 text-center text-stone-400">
				<p class="text-5xl">🧺</p>
				<p class="mt-4 text-base font-medium">Pantry is empty</p>
				<p class="mt-1 text-sm">Add items after your next shopping trip.</p>
			</div>
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
				<span class="shrink-0 text-sm font-medium text-stone-600">{qtyLabel(item)}</span>
				<span class="shrink-0 text-xs font-medium {expiryColor(item.expiryDate)}">
					{expiryLabel(item.expiryDate)}
				</span>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={item.id} />
					<button type="submit" aria-label="Delete {item.name}" class="shrink-0 text-stone-300 hover:text-red-400">✕</button>
				</form>
			</li>
		{/each}
	</ul>
{/snippet}

<!-- ── Add / Edit sheet ───────────────────────────────────────────────────── -->
{#if sheetMode}
	<div
		class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-4 pt-3 pb-10 shadow-2xl"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto mb-5 h-1 w-10 rounded-full bg-stone-200"></div>

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

			<!-- Hidden default submit so Enter key always triggers save, not delete -->
			<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>

			<input
				bind:this={nameEl}
				bind:value={nameInput}
				oninput={onNameInput}
				name="name"
				type="text"
				placeholder="What did you buy?"
				autocapitalize="sentences"
				autocomplete="off"
				required
				class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
			/>

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
						<input
							name="quantity"
							type="number"
							bind:value={quantity}
							min="0.5"
							step="0.5"
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						/>
					{:else}
						<input type="hidden" name="quantity" value={quantity} />
						<div class="flex gap-2">
							{#each ESTIMATE_OPTIONS as opt (opt.value)}
								<button
									type="button"
									onclick={() => (quantity = opt.value)}
									class="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors {quantity === opt.value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
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

			<div class="mt-4 flex gap-2">
				{#if sheetMode === 'edit'}
					<button
						type="submit"
						formaction="?/delete"
						class="flex-1 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
					>
						Delete
					</button>
				{:else}
					<button
						type="button"
						onclick={closeSheet}
						class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600"
					>
						Done
					</button>
				{/if}
				<button
					type="submit"
					disabled={!nameInput.trim()}
					class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
				>
					{sheetMode === 'edit' ? 'Save' : 'Add item'}
				</button>
			</div>
		</form>
	</div>
{/if}
