<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { CATEGORY_LABELS, daysUntilExpiry, calcExpiry } from '$lib/expiry';
	import { guessQuantityType, ESTIMATE_OPTIONS, estimateLabel } from '$lib/quantity';
	import type { PantryCategory, QuantityType } from '$lib/server/db/schema';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Add sheet ─────────────────────────────────────────────────────────────
	let showAdd = $state(false);
	let mode = $state<'single' | 'bulk'>('single');

	// Single mode
	let sName = $state('');
	let sCategory = $state<PantryCategory>('other');
	let sQtyType = $state<QuantityType>('count');
	let sQty = $state(1);
	let sEstimate = $state(1);
	let sPurchaseDate = $state(todayStr());
	let sExpiryDate = $state('');
	let sAutoExpiry = $state('');

	// Bulk mode
	let bCategory = $state<PantryCategory>('other');
	let bPurchaseDate = $state(todayStr());
	let bRows = $state([newRow()]);

	function newRow() {
		return { name: '', quantityType: 'count' as QuantityType, quantity: 1, estimate: 1 };
	}

	function todayStr() {
		return new Date().toISOString().split('T')[0];
	}

	function openAdd() {
		showAdd = true;
		mode = 'single';
		sName = '';
		sCategory = 'other';
		sQtyType = 'count';
		sQty = 1;
		sEstimate = 1;
		sPurchaseDate = todayStr();
		sExpiryDate = '';
		bRows = [newRow()];
	}

	$effect(() => {
		if (sName) sQtyType = guessQuantityType(sName);
	});

	$effect(() => {
		const pd = sPurchaseDate ? new Date(sPurchaseDate) : new Date();
		sAutoExpiry = calcExpiry(sCategory, pd).toISOString().split('T')[0];
	});

	function onBulkNameChange(i: number, name: string) {
		bRows[i].name = name;
		bRows[i].quantityType = guessQuantityType(name);
	}

	// Close sheet on successful submission
	$effect(() => {
		if ((form as any)?.success) showAdd = false;
	});

	// ── Item grouping ─────────────────────────────────────────────────────────
	type Item = PageData['items'][0];

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

<!-- Backdrop -->
{#if showAdd}
	<div
		class="fixed inset-0 z-40 bg-black/40"
		role="button"
		tabindex="-1"
		aria-label="Close"
		onclick={() => (showAdd = false)}
		onkeydown={(e) => e.key === 'Escape' && (showAdd = false)}
	></div>
{/if}

<div class="flex min-h-svh flex-col bg-stone-50">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
		<div class="mx-auto flex max-w-lg items-center justify-between">
			<h1 class="text-lg font-bold text-stone-900">Pantry</h1>
			<button
				onclick={openAdd}
				class="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
			>
				+ Add
			</button>
		</div>
	</header>

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-24">
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
				<div class="min-w-0 flex-1">
					<p class="truncate font-medium text-stone-900">{item.name}</p>
					<p class="text-xs text-stone-400">{CATEGORY_LABELS[item.category as PantryCategory]}</p>
				</div>
				<span class="shrink-0 text-sm font-medium text-stone-600">{qtyLabel(item)}</span>
				<span class="shrink-0 text-xs font-medium {expiryColor(item.expiryDate)}">
					{expiryLabel(item.expiryDate)}
				</span>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={item.id} />
					<button type="submit" aria-label="Delete {item.name}" class="shrink-0 text-stone-300 hover:text-red-400">
						✕
					</button>
				</form>
			</li>
		{/each}
	</ul>
{/snippet}

<!-- ── Add sheet ──────────────────────────────────────────────────────────── -->
{#if showAdd}
	<div
		class="fixed inset-x-0 bottom-0 z-50 max-h-[90svh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-10 shadow-2xl"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>

		<!-- Mode toggle -->
		<div class="mb-4 flex rounded-xl bg-stone-100 p-1 text-sm font-medium">
			<button
				onclick={() => (mode = 'single')}
				class="flex-1 rounded-lg py-1.5 transition-colors {mode === 'single' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'}"
			>
				Single item
			</button>
			<button
				onclick={() => (mode = 'bulk')}
				class="flex-1 rounded-lg py-1.5 transition-colors {mode === 'bulk' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'}"
			>
				Bulk entry
			</button>
		</div>

		{#if (form as any)?.addError}
			<p class="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{(form as any).addError}</p>
		{/if}

		<!-- Single mode -->
		{#if mode === 'single'}
			<form method="POST" action="?/addSingle" use:enhance>
				<div class="space-y-3">
					<div>
						<label for="s-name" class="mb-1 block text-sm font-medium text-stone-700">Item name</label>
						<input id="s-name" name="name" type="text" bind:value={sName} placeholder="e.g. Eggs" autocapitalize="sentences" required class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
					</div>

					<div>
						<label for="s-cat" class="mb-1 block text-sm font-medium text-stone-700">Category</label>
						<select id="s-cat" name="category" bind:value={sCategory} class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none">
							{#each categories as [val, label] (val)}
								<option value={val}>{label}</option>
							{/each}
						</select>
					</div>

					<div>
						<p class="mb-1 text-sm font-medium text-stone-700">Quantity</p>
						<input type="hidden" name="quantityType" value={sQtyType} />
						{#if sQtyType === 'count'}
							<input id="s-qty" name="quantity" type="number" bind:value={sQty} min="1" step="1" class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none" />
						{:else}
							<input type="hidden" name="quantity" value={sEstimate} />
							<div class="flex gap-2">
								{#each ESTIMATE_OPTIONS as opt (opt.value)}
									<button type="button" onclick={() => (sEstimate = opt.value)} class="flex-1 rounded-xl border py-2 text-sm font-medium {sEstimate === opt.value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}">
										{opt.label}
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="s-purchase" class="mb-1 block text-sm font-medium text-stone-700">Purchased</label>
							<input id="s-purchase" name="purchaseDate" type="date" bind:value={sPurchaseDate} class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none" />
						</div>
						<div>
							<label for="s-expiry" class="mb-1 flex items-center justify-between text-sm font-medium text-stone-700">
								<span>Expires</span>
								{#if !sExpiryDate}<span class="text-xs font-normal text-stone-400">auto: {sAutoExpiry}</span>{/if}
							</label>
							<input id="s-expiry" name="expiryDate" type="date" bind:value={sExpiryDate} class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none" />
						</div>
					</div>
				</div>

				<div class="mt-4 flex gap-2">
					<button type="button" onclick={() => (showAdd = false)} class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600">Cancel</button>
					<button type="submit" class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600">Add item</button>
				</div>
			</form>

		<!-- Bulk mode -->
		{:else}
			<form method="POST" action="?/addBulk" use:enhance>
				<div class="mb-4 grid grid-cols-2 gap-3">
					<div>
						<label for="b-date" class="mb-1 block text-sm font-medium text-stone-700">Shopping date</label>
						<input id="b-date" name="purchaseDate" type="date" bind:value={bPurchaseDate} class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none" />
					</div>
					<div>
						<label for="b-cat" class="mb-1 block text-sm font-medium text-stone-700">Category</label>
						<select id="b-cat" name="category" bind:value={bCategory} class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none">
							{#each categories as [val, label] (val)}
								<option value={val}>{label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="space-y-2">
					{#each bRows as row, i (i)}
						<div class="flex items-center gap-2">
							<input
								name="name"
								type="text"
								value={row.name}
								oninput={(e) => onBulkNameChange(i, e.currentTarget.value)}
								placeholder="Item name"
								autocapitalize="sentences"
								class="min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
							/>
							<input type="hidden" name="quantityType" value={row.quantityType} />
							{#if row.quantityType === 'count'}
								<input name="quantity" type="number" bind:value={row.quantity} min="1" step="1" class="w-20 rounded-xl border border-stone-300 bg-stone-50 px-2 py-2.5 text-center text-sm focus:border-orange-500 focus:outline-none" />
							{:else}
								<select name="quantity" bind:value={row.estimate} onchange={() => (row.quantity = row.estimate)} class="w-24 rounded-xl border border-stone-300 bg-stone-50 px-2 py-2.5 text-sm focus:border-orange-500 focus:outline-none">
									{#each ESTIMATE_OPTIONS as opt (opt.value)}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
							{/if}
							{#if bRows.length > 1}
								<button type="button" onclick={() => bRows.splice(i, 1)} aria-label="Remove row" class="shrink-0 text-stone-400 hover:text-red-500">✕</button>
							{/if}
						</div>
					{/each}
				</div>

				<button type="button" onclick={() => bRows.push(newRow())} class="mt-2 text-sm text-orange-500 hover:text-orange-600">
					+ Add another item
				</button>

				<div class="mt-4 flex gap-2">
					<button type="button" onclick={() => (showAdd = false)} class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600">Cancel</button>
					<button type="submit" class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600">
						Add {bRows.filter((r) => r.name).length || ''} items
					</button>
				</div>
			</form>
		{/if}
	</div>
{/if}
