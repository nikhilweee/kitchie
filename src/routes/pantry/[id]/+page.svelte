<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { QuantityType } from '$lib/server/db/schema';
	import PageShell from '$lib/components/PageShell.svelte';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { toDateStr } from '$lib/date-format';
	import { UNITS } from '$lib/units';
	import { Flag, Trash2 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const toast = createToast();

	// ── Form state (initialised from item) ─────────────────────────────────────
	let nameInput = $state(data.item.name);
	let categoryId = $state(data.item.category);
	let quantityType = $state<QuantityType>(data.item.quantityType as QuantityType);
	let quantity = $state(data.item.quantity);
	let unit = $state(data.item.unit ?? 'count');
	let purchaseDate = $state(toDateStr(data.item.purchaseDate));
	let expiryDate = $state(toDateStr(data.item.expiryDate));

	// Use a derived reference for template bindings that must stay reactive
	const item = $derived(data.item);
	let purchaseMode = $state<'relative' | 'exact'>('exact');
	let expiryMode = $state<'relative' | 'exact'>('exact');
	let expiryDays = $state(30);
	let purchaseDaysAgo = $state(0);
	let categoryLocked = $state(true);
	let expiryLocked = $state(true);
	let confirmingDelete = $state(false);

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

	const computedPurchaseDate = $derived.by(() => {
		const d = new Date();
		d.setDate(d.getDate() - purchaseDaysAgo);
		return d.toISOString().split('T')[0];
	});

	const effectivePurchaseDate = $derived(
		purchaseMode === 'relative' ? computedPurchaseDate : purchaseDate
	);

	const computedExpiryDate = $derived.by(() => {
		const base = new Date(effectivePurchaseDate);
		base.setDate(base.getDate() + expiryDays);
		return base.toISOString().split('T')[0];
	});

	// Keyboard shortcuts
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			history.back();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="delete"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | Edit Pantry Item</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<Toast message={toast.message} />

<PageShell title="Edit Item" back="/pantry" mainClass="px-4 py-4 pb-36">
	<form
		id="pantry-edit-form"
		method="POST"
		action="/pantry?/update"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto('/pantry?toast=Pantry+item+updated');
			}
		}}
	>
		<input type="hidden" name="id" value={item.id} />

		<input
			bind:value={nameInput}
			name="name"
			type="text"
			placeholder="What did you buy?"
			autocapitalize="sentences"
			autocomplete="off"
			required
			class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none density-sheet-name"
		/>

		<div class="mt-3 space-y-3">
			<!-- Quantity -->
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-stone-500">Quantity</span>
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button type="button" onclick={() => { quantityType = 'count'; quantity = 1; }}
							class="px-3 py-1.5 transition-colors {quantityType === 'count' ? 'bg-stone-800 text-white dark:text-stone-50' : 'text-stone-500 hover:bg-stone-100'}"
						>Count</button>
						<button type="button" onclick={() => { quantityType = 'estimate'; quantity = 1; }}
							class="px-3 py-1.5 transition-colors {quantityType === 'estimate' ? 'bg-stone-800 text-white dark:text-stone-50' : 'text-stone-500 hover:bg-stone-100'}"
						>Estimate</button>
					</div>
				</div>
				<input type="hidden" name="quantityType" value={quantityType} />
				{#if quantityType === 'count'}
					<div class="grid grid-cols-2 gap-2">
						<div class="flex items-center overflow-hidden rounded-xl border border-stone-300 bg-stone-50">
							<button type="button" onclick={() => (quantity = Math.max(0, quantity - 1))}
								class="flex h-full w-10 shrink-0 items-center justify-center text-stone-500 hover:bg-stone-100">−</button>
							<input name="quantity" type="number" bind:value={quantity} min="0" step="1"
								class="w-0 min-w-0 flex-1 bg-transparent text-center text-sm text-stone-900 focus:outline-none" />
							<button type="button" onclick={() => quantity++}
								class="flex h-full w-10 shrink-0 items-center justify-center text-stone-500 hover:bg-stone-100">+</button>
						</div>
						<select name="unit" bind:value={unit}
							class="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none">
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

			<!-- Expiry Date -->
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-stone-500">Expiry Date</span>
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button type="button" onclick={() => { expiryMode = 'exact'; expiryDate = computedExpiryDate; expiryLocked = true; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'exact' ? 'bg-stone-800 text-white dark:text-stone-50' : 'text-stone-500 hover:bg-stone-100'}"
						>Date</button>
						<button type="button" onclick={() => { expiryMode = 'relative'; expiryLocked = false; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'relative' ? 'bg-stone-800 text-white dark:text-stone-50' : 'text-stone-500 hover:bg-stone-100'}"
						>Duration</button>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div class="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
						<span class="text-sm text-stone-400">{toDateStr(item.expiryDate)}</span>
					</div>
					<div>
						{#if expiryMode === 'relative'}
							<input type="hidden" name="expiryDate" value={computedExpiryDate} />
							<input type="hidden" name="expiryOverridden" value="false" />
							<select bind:value={expiryDays} onchange={() => (expiryLocked = true)}
								class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none">
								{#each EXPIRY_OPTIONS as opt (opt.days)}
									<option value={opt.days}>{opt.label}</option>
								{/each}
							</select>
						{:else}
							<input type="hidden" name="expiryOverridden" value="true" />
							<input name="expiryDate" type="date" bind:value={expiryDate}
								class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none" />
						{/if}
					</div>
				</div>
			</div>

			<!-- Purchase Date -->
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-stone-500">Purchase Date</span>
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button type="button" onclick={() => (purchaseMode = 'exact')}
							class="px-3 py-1.5 transition-colors {purchaseMode === 'exact' ? 'bg-stone-800 text-white dark:text-stone-50' : 'text-stone-500 hover:bg-stone-100'}"
						>Date</button>
						<button type="button" onclick={() => (purchaseMode = 'relative')}
							class="px-3 py-1.5 transition-colors {purchaseMode === 'relative' ? 'bg-stone-800 text-white dark:text-stone-50' : 'text-stone-500 hover:bg-stone-100'}"
						>Duration</button>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<div class="flex items-center rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
						<span class="text-sm text-stone-400">{toDateStr(item.purchaseDate)}</span>
					</div>
					<div>
						{#if purchaseMode === 'relative'}
							<input type="hidden" name="purchaseDate" value={computedPurchaseDate} />
							<select bind:value={purchaseDaysAgo}
								class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none">
								{#each PURCHASE_OPTIONS as opt (opt.days)}
									<option value={opt.days}>{opt.label}</option>
								{/each}
							</select>
						{:else}
							<input name="purchaseDate" type="date" bind:value={purchaseDate}
								class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none" />
						{/if}
					</div>
				</div>
			</div>

			<!-- Category -->
			<div>
				<label for="edit-category" class="mb-1 block text-xs font-medium text-stone-500">Category</label>
				<select
					id="edit-category"
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
		</div>

		{#if item.status !== 'active'}
			<p class="mt-3 rounded-xl bg-stone-100 px-4 py-2.5 text-center text-xs text-stone-500">
				Set a quantity and save to restore this item to your pantry.
			</p>
		{/if}
	</form>

	<!-- Primary action row -->
	<div class="mt-4 space-y-2">
		<button type="submit" form="pantry-edit-form" data-shortcut="primary" disabled={!nameInput.trim()}
			class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
			Save
		</button>
		{#if item.status === 'active'}
			<div class="flex gap-2">
				<form method="POST" action="/pantry?/consume" class="flex-1"
					use:enhance={() => async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							goto('/pantry?toast=Consumed');
						}
					}}
				>
					<input type="hidden" name="id" value={item.id} />
					<button type="submit"
						class="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors text-sm font-medium">
						<Flag class="h-4 w-4" />
						Finish
					</button>
				</form>
				<form method="POST" action="/pantry?/discard" class="flex-1"
					use:enhance={() => async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							goto('/pantry?toast=Trashed');
						}
					}}
				>
					<input type="hidden" name="id" value={item.id} />
					<button type="submit" data-shortcut="delete"
						class="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors text-sm font-medium">
						<Trash2 class="h-4 w-4" />
						Trash
					</button>
				</form>
			</div>
		{/if}
	</div>

	<!-- Add to cart (edit mode only) -->
	{#if data.lists.length > 0}
		{@const itemId = item.id}
		<div class="mt-3 border-t border-stone-100 pt-3">
			<p class="mb-2 text-xs font-medium text-stone-400">Carts</p>
			<div class="space-y-1.5">
				{#each data.lists as list (list.id)}
					{@const onList = data.listMembership.has(`${list.id}:${itemId}`)}
					<form method="POST" action={onList ? '/pantry?/removeFromList' : '/pantry?/addToList'}
						use:enhance={() => {
							const wasOnList = onList;
							return async ({ result, update }) => {
								await update({ reset: false });
								if (result.type === 'success') toast.show(wasOnList ? `Removed from ${list.name}` : `Added to ${list.name}`);
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

	<!-- Danger zone: delete permanently (two-tap) -->
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
			<form method="POST" action="/pantry?/delete" class="flex-1"
				use:enhance={() => async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') {
						goto('/pantry?toast=Item+deleted');
					}
				}}
			>
				<input type="hidden" name="id" value={item.id} />
				<button type="submit" class="w-full rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors">
					Yes, delete
				</button>
			</form>
		</div>
	{/if}
</PageShell>
