<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { onMount, untrack } from 'svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SmallEstimatePicker from '$lib/components/SmallEstimatePicker.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { clickOutside } from '$lib/actions/click-outside';
	import ListRow from '$lib/components/ListRow.svelte';
	import { ShoppingCart, X, CheckCheck } from 'lucide-svelte';
	import { estimateLabel } from '$lib/quantity';
	import SmallCountPicker from '$lib/components/SmallCountPicker.svelte';

	let { data }: { data: PageData } = $props();

	// FAB scroll-hide
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

	const toast = createToast();
	const showToast = toast.show;

	// Inline search
	let search = $state('');
	let searchEl = $state<HTMLInputElement | undefined>(undefined);
	let dropdownOpen = $state(false);

	const currentPantryIds = $derived(new Set(data.items.map((i) => i.pantryItemId).filter(Boolean)));
	const currentNames = $derived(new Set(data.items.map((i) => i.name.toLowerCase())));

	const searchResults = $derived(
		search.trim().length === 0 ? [] :
		data.pantryItems
			.filter((p) =>
				p.name.toLowerCase().includes(search.trim().toLowerCase()) &&
				!currentPantryIds.has(p.id)
			)
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 8)
	);

	const searchIsExact = $derived(
		data.pantryItems.some((p) => p.name.toLowerCase() === search.trim().toLowerCase()) ||
		currentNames.has(search.trim().toLowerCase())
	);

	// Finish flow state
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

<PageShell title={data.list.name} back="/carts">
		<!-- Inline search / add bar -->
		<div class="relative mb-4" use:clickOutside={() => (dropdownOpen = false)}>
			<input
				bind:this={searchEl}
				bind:value={search}
				onfocus={() => (dropdownOpen = true)}
				oninput={() => (dropdownOpen = true)}
				type="text"
				placeholder="Search or type an item…"
				autocomplete="off"
				class="block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none"
			/>
			{#if search.trim() && dropdownOpen}
				<div class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each searchResults as p (p.id)}
						<form method="POST" action="?/addItems" use:enhance={() => async ({ update }) => {
							await update({ reset: false });
							search = '';
							dropdownOpen = false;
						}}>
							<input type="hidden" name="pantryItemId" value={p.id} />
							<button type="submit" class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50">
								<span class="min-w-0 flex-1 truncate text-sm text-stone-800">{p.name}</span>
								<span class="shrink-0 text-xs text-stone-400">
									{#if p.status !== 'active'}
										{p.status}
									{:else if p.quantityType === 'estimate'}
										{estimateLabel(p.quantity)}
									{:else}
										×{p.quantity % 1 === 0 ? p.quantity : p.quantity.toFixed(1)}
									{/if}
								</span>
							</button>
						</form>
					{/each}
					{#if !searchIsExact}
						<form method="POST" action="?/addItems" use:enhance={() => async ({ update }) => {
							await update({ reset: false });
							search = '';
							dropdownOpen = false;
						}}>
							<input type="hidden" name="freeText" value={search.trim()} />
							<button type="submit" class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50">
								Add "{search.trim()}" to cart
							</button>
						</form>
					{/if}
				</div>
			{/if}
		</div>

		{#if data.items.length === 0}
			<EmptyState icon={ShoppingCart} heading="No items yet" detail="Search above to add items" />
		{:else}
			<!-- Active (unshopped) items -->
			{#if activeItems.length > 0}
				<ul class="mb-4 space-y-2">
					{#each activeItems as item (item.id)}
						{@const fi = finishItems.find((f) => f.id === item.id)}
						<ListRow class="gap-2 !px-3">
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
						</ListRow>
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
							<ListRow class="gap-2 !px-3">
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
							</ListRow>
						{/each}
					</ul>
				{/if}
			{/if}
		{/if}
</PageShell>

<!-- FAB: Checkout when items are picked up -->
{#if shoppedItems.length > 0}
	<div class="fixed left-0 right-0 z-10 px-4 pb-2 transition-transform duration-200 {fabHidden ? 'translate-y-28' : ''}" style="bottom: calc(3.5rem + env(safe-area-inset-bottom))">
		<div class="mx-auto w-full max-w-lg">
			<form method="POST" action="?/finish" use:enhance={() => async ({ update }) => {
				await update({ reset: false });
				showToast('Added to pantry');
			}} class="flex">
				{#each checkoutItems as item (item.id)}
					<input type="hidden" name="itemId" value={item.id} />
					<input type="hidden" name="pantryItemId" value={item.pantryItemId ?? ''} />
					<input type="hidden" name="newQuantity" value={item.newQuantity} />
				{/each}
				<button type="submit"
					class="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95 density-fab">
					Checkout
				</button>
			</form>
		</div>
	</div>
{/if}
