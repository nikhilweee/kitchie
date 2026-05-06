<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import SmallEstimatePicker from '$lib/components/SmallEstimatePicker.svelte';
	import SmallCountPicker from '$lib/components/SmallCountPicker.svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import { clickOutside } from '$lib/actions/click-outside';
	import { X } from 'lucide-svelte';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	type PantrySelection = {
		pantryItemId: string | null;
		itemName: string;
		quantityType: 'count' | 'estimate';
		newQuantity: number;
	};

	let flowStep = $state<'pantryUpdate' | 'recipeAction'>('pantryUpdate');
	let pantrySelected = $state<PantrySelection[]>(
		untrack(() =>
			data.pantrySuggestions
				.filter((s) => s.suggested)
				.map((s) => ({
					pantryItemId: s.item.id,
					itemName: s.item.name,
					quantityType: s.item.quantityType as 'count' | 'estimate',
					newQuantity: s.item.quantity
				}))
		)
	);
	let pantrySearch = $state('');

	const pantryFiltered = $derived(
		pantrySearch.length === 0
			? []
			: data.pantrySuggestions
					.filter((s) => !pantrySelected.some((sel) => sel.pantryItemId === s.item.id))
					.filter((s) => s.item.name.toLowerCase().includes(pantrySearch.toLowerCase()))
					.map((s) => s.item)
	);

	const pantrySearchIsExactMatch = $derived(
		data.pantrySuggestions.some(
			(s) => s.item.name.toLowerCase() === pantrySearch.trim().toLowerCase()
		)
	);

	function addPantryItem(item: PageData['pantrySuggestions'][0]['item']) {
		pantrySelected = [
			...pantrySelected,
			{ pantryItemId: item.id, itemName: item.name, quantityType: item.quantityType as 'count' | 'estimate', newQuantity: item.quantity }
		];
		pantrySearch = '';
	}

	function addCustomPantryItem(name: string) {
		pantrySelected = [
			...pantrySelected,
			{ pantryItemId: null, itemName: name, quantityType: 'estimate', newQuantity: 1 }
		];
		pantrySearch = '';
	}

	function removePantryItem(name: string) {
		pantrySelected = pantrySelected.filter((s) => s.itemName !== name);
	}

	function pantryStock(pantryItemId: string | null) {
		if (!pantryItemId) return null;
		return data.pantrySuggestions.find((s) => s.item.id === pantryItemId)?.item ?? null;
	}

	const recipeDiff = $derived.by(() => {
		if (!data.recipeId || data.originalRecipeItems.length === 0) return null;
		const selectedNames = new Set(pantrySelected.map((s) => s.itemName));
		const originalNames = new Set(data.originalRecipeItems.map((i) => i.itemName));
		const added = [...selectedNames].filter((n) => !originalNames.has(n));
		const removed = [...originalNames].filter((n) => !selectedNames.has(n));
		const kept = [...selectedNames].filter((n) => originalNames.has(n));
		return { added, removed, kept };
	});

	const showRecipeStep = $derived(
		pantrySelected.length > 0 &&
			(!data.recipeId ||
				(recipeDiff !== null && (recipeDiff.added.length > 0 || recipeDiff.removed.length > 0)))
	);

	let flowForm = $state<HTMLFormElement | undefined>(undefined);
	let recipeActionInput = $state('skip');

	function submitFlow(action: 'save' | 'update' | 'skip') {
		recipeActionInput = action;
		setTimeout(() => flowForm?.requestSubmit(), 0);
	}

	function onFlowNext() {
		if (showRecipeStep) {
			flowStep = 'recipeAction';
		} else {
			submitFlow('skip');
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (flowStep === 'recipeAction') {
				flowStep = 'pantryUpdate';
			} else {
				goto(resolve('/meals'));
			}
		}
	}
</script>

<svelte:head><title>Kitchie | Update Pantry</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Update Pantry" back="/meals" mainClass="px-4 py-4 pb-36">
	<form
		bind:this={flowForm}
		method="POST"
		action="/meals?/finalizeFlow"
		use:enhance={() => async ({ update }) => {
			await update();
		}}
	>
		<input type="hidden" name="mealId" value={data.meal.id} />
		{#if data.recipeId}<input type="hidden" name="recipeId" value={data.recipeId} />{/if}
		<input type="hidden" name="recipeAction" bind:value={recipeActionInput} />

		<!-- Always-present hidden inputs so item data survives step 1→2 transition -->
		{#each pantrySelected as sel (sel.itemName)}
			<input type="hidden" name="itemId" value={sel.pantryItemId ?? ''} />
			<input type="hidden" name="itemName" value={sel.itemName} />
			<input type="hidden" name="newQuantity" value={sel.newQuantity} />
		{/each}

		{#if flowStep === 'pantryUpdate'}
			<!-- Step 1: ingredient picker -->
			<p class="mb-4 text-sm text-stone-500">
				Set what's left after <span class="font-medium text-stone-700">{data.meal.name}</span>.
			</p>

			{#if pantrySelected.length > 0}
				<ul class="mb-3 space-y-2">
					{#each pantrySelected as sel (sel.itemName)}
						{@const stock = pantryStock(sel.pantryItemId)}
						<li class="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
							<div class="flex items-center gap-2">
								<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{sel.itemName}</span>
								{#if sel.quantityType === 'count'}
									<SmallCountPicker bind:value={sel.newQuantity} unit={stock?.unit} />
								{:else}
									<SmallEstimatePicker bind:value={sel.newQuantity} />
								{/if}
								<button
									type="button"
									onclick={() => removePantryItem(sel.itemName)}
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400"
									aria-label="Remove {sel.itemName}"
								><X class="h-3.5 w-3.5" /></button>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mb-3 text-sm text-stone-400">No ingredients added yet.</p>
			{/if}

			<div class="relative" use:clickOutside={() => (pantrySearch = '')}>
				<input
					type="text"
					bind:value={pantrySearch}
					placeholder="Search or type an ingredient…"
					autocomplete="off"
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-3 text-sm text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none"
				/>
				{#if pantrySearch.trim()}
					<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
						{#each pantryFiltered as item (item.id)}
							<li>
								<button
									type="button"
									onclick={() => addPantryItem(item)}
									class="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
								>{item.name}</button>
							</li>
						{/each}
						{#if !pantrySearchIsExactMatch}
							<li>
								<button
									type="button"
									onclick={() => addCustomPantryItem(pantrySearch.trim())}
									class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50"
								>Add "{pantrySearch.trim()}" as ingredient</button>
							</li>
						{/if}
					</ul>
				{/if}
			</div>

			<div class="mt-4 flex gap-2">
				<a href={resolve('/meals')} class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50 density-sheet-btn">Skip</a>
				<button
					type="button"
					onclick={onFlowNext}
					class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 density-sheet-btn"
				>{showRecipeStep ? 'Next' : 'Update pantry'}</button>
			</div>

		{:else if flowStep === 'recipeAction'}
			{#if data.recipeId && recipeDiff}
				<!-- Step 2b: update existing recipe -->
				<h2 class="text-base font-semibold text-stone-900">Update recipe?</h2>
				<p class="mt-0.5 mb-4 text-sm text-stone-500">
					Changes to <span class="font-medium text-stone-700">{data.meal.name}</span>
				</p>
				<ul class="mb-4 space-y-1">
					{#each recipeDiff.added as ing (ing)}
						<li class="flex gap-2 text-sm font-medium text-green-600"><span class="w-3 shrink-0">+</span>{ing}</li>
					{/each}
					{#each recipeDiff.removed as ing (ing)}
						<li class="flex gap-2 text-sm font-medium text-red-500"><span class="w-3 shrink-0">−</span>{ing}</li>
					{/each}
					{#each recipeDiff.kept as ing (ing)}
						<li class="flex gap-2 text-sm text-stone-400"><span class="w-3 shrink-0">·</span>{ing}</li>
					{/each}
				</ul>
				<div class="flex gap-2">
					<button type="button" onclick={() => submitFlow('skip')} class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 density-sheet-btn">Skip</button>
					<button type="button" onclick={() => submitFlow('update')} class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 density-sheet-btn">Update recipe</button>
				</div>
			{:else}
				<!-- Step 2a: save new recipe -->
				<h2 class="text-base font-semibold text-stone-900">Save as recipe?</h2>
				<p class="mt-0.5 mb-3 text-sm text-stone-500">
					Save the ingredients you just used for <span class="font-medium text-stone-700">{data.meal.name}</span> as a recipe for next time.
				</p>
				<ul class="mb-4 space-y-1">
					{#each pantrySelected as sel (sel.itemName)}
						<li class="text-sm text-stone-700">· {sel.itemName}</li>
					{/each}
				</ul>
				<div class="flex gap-2">
					<button type="button" onclick={() => submitFlow('skip')} class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 density-sheet-btn">Skip</button>
					<button type="button" onclick={() => submitFlow('save')} class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 density-sheet-btn">Save recipe</button>
				</div>
			{/if}
		{/if}
	</form>
</PageShell>
