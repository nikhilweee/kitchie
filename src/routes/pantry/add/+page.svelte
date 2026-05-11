<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { QuantityType } from '$lib/server/db/schema';
	import PageShell from '$lib/components/PageShell.svelte';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import { guessCategory } from '$lib/infer';
	import { UNITS, guessUnit } from '$lib/units';
	import { guessQuantityType } from '$lib/quantity';
	import { clickOutside } from '$lib/actions/click-outside';

	let { data }: { data: PageData } = $props();

	type Category = PageData['categories'][0];

	// ── Form state ─────────────────────────────────────────────────────────────
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let showNameSuggestions = $state(false);
	let categoryId = $state(defaultCategoryId());
	let quantityType = $state<QuantityType>('estimate');
	let quantity = $state(1);
	let unit = $state('count');
	let expiryDate = $state('');
	let purchaseMode = $state<'relative' | 'exact'>('relative');
	let expiryMode = $state<'relative' | 'exact'>('relative');
	let expiryDays = $state(30);
	let purchaseDaysAgo = $state(0);
	let purchaseDate = $state(todayStr());
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

	function todayStr() {
		return new Date().toISOString().split('T')[0];
	}

	function defaultCategoryId() {
		return data.categories.find((c) => c.name === 'Other')?.id ?? data.categories[0]?.id ?? '';
	}

	function categoryById(id: string): Category | undefined {
		return data.categories.find((c) => c.id === id);
	}

	function closestDuration(ttlDays: number): number {
		return EXPIRY_OPTIONS.reduce((prev, curr) =>
			Math.abs(curr.days - ttlDays) < Math.abs(prev.days - ttlDays) ? curr : prev
		).days;
	}

	const computedPurchaseDate = $derived.by(() => {
		const d = new Date();
		d.setDate(d.getDate() - purchaseDaysAgo);
		return d.toISOString().split('T')[0];
	});

	const effectivePurchaseDate = $derived(
		purchaseMode === 'relative' ? computedPurchaseDate : (purchaseDate || todayStr())
	);

	const computedExpiryDate = $derived.by(() => {
		const base = new Date(effectivePurchaseDate);
		base.setDate(base.getDate() + expiryDays);
		return base.toISOString().split('T')[0];
	});

	const nameSuggestions = $derived(
		nameInput.trim().length > 0
			? data.items.filter((i) =>
					i.name.toLowerCase().includes(nameInput.trim().toLowerCase())
				)
			: []
	);

	function categoryLabel(id: string): string {
		return categoryById(id)?.name ?? id;
	}

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
		quantity = 1;
	}

	// Keyboard shortcuts
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			history.back();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | Add to Pantry</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Add to Pantry" back="/pantry" mainClass="px-4 py-4 pb-36">
	<form
		id="pantry-add-form"
		method="POST"
		action="/pantry?/add"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto(resolve('/pantry?toast=Added+to+pantry'));
			}
		}}
	>
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
				class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none density-sheet-name"
			/>
			{#if showNameSuggestions && nameSuggestions.length > 0}
				<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each nameSuggestions as item (item.id)}
						<li>
							<button
								type="button"
								onmousedown={() => goto(resolve('/pantry/[id]', { id: item.id }))}
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
			<!-- Quantity -->
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-stone-500">Quantity</span>
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button type="button" onclick={() => { quantityType = 'count'; quantity = 1; }}
							class="px-3 py-1.5 transition-colors {quantityType === 'count' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
						>Count</button>
						<button type="button" onclick={() => { quantityType = 'estimate'; quantity = 1; }}
							class="px-3 py-1.5 transition-colors {quantityType === 'estimate' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
						>Estimate</button>
					</div>
				</div>
				<input type="hidden" name="quantityType" value={quantityType} />
				{#if quantityType === 'count'}
					<div class="grid grid-cols-2 gap-2">
						<div class="flex items-center overflow-hidden rounded-xl border border-stone-300 bg-stone-50">
							<button type="button" onclick={() => (quantity = Math.max(0, quantity - 1))}
								class="flex h-full w-10 shrink-0 items-center justify-center text-stone-500 hover:bg-stone-100">−</button>
							<input name="quantity" type="number" bind:value={quantity} min="0" step="any"
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
							class="px-3 py-1.5 transition-colors {expiryMode === 'exact' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
						>Date</button>
						<button type="button" onclick={() => { expiryMode = 'relative'; expiryLocked = false; }}
							class="px-3 py-1.5 transition-colors {expiryMode === 'relative' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
						>Duration</button>
					</div>
				</div>
				<div class="col-span-2">
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
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none" />
					{/if}
				</div>
			</div>

			<!-- Purchase Date -->
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-stone-500">Purchase Date</span>
					<div class="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium">
						<button type="button" onclick={() => (purchaseMode = 'exact')}
							class="px-3 py-1.5 transition-colors {purchaseMode === 'exact' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
						>Date</button>
						<button type="button" onclick={() => (purchaseMode = 'relative')}
							class="px-3 py-1.5 transition-colors {purchaseMode === 'relative' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
						>Duration</button>
					</div>
				</div>
				<div class="col-span-2">
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
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none" />
					{/if}
				</div>
			</div>

			<!-- Category -->
			<div>
				<label for="add-category" class="mb-1 block text-xs font-medium text-stone-500">Category</label>
				<select
					id="add-category"
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
	</form>

	<!-- Action row -->
	<div class="mt-4 flex gap-2">
		<button type="button" onclick={() => history.back()}
			class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
			Cancel
		</button>
		<button type="submit" form="pantry-add-form" data-shortcut="primary" disabled={!nameInput.trim()}
			class="flex-[2] rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
			Add item
		</button>
	</div>
</PageShell>
