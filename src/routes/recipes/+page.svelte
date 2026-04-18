<script lang="ts">
	import { enhance } from '$app/forms';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import type { PageData } from './$types';
	import { clickOutside } from '$lib/actions/click-outside';

	let { data }: { data: PageData } = $props();

	type Recipe = PageData['recipes'][0];
	type PantryItem = PageData['pantryItems'][0];

	// ── Sheet mode ────────────────────────────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingRecipe = $state<Recipe | null>(null);
	let nameInput = $state('');
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let showNameSuggestions = $state(false);

	// Suggest existing recipes when typing in add mode
	const nameSuggestions = $derived(
		sheetMode === 'add' && nameInput.trim().length > 0
			? data.recipes.filter((r) =>
					r.name.toLowerCase().includes(nameInput.trim().toLowerCase())
				)
			: []
	);

	// Ingredients in the sheet
	type DraftItem = { pantryItemId: string | null; itemName: string; quantity: number };
	let draftItems = $state<DraftItem[]>([]);
	let ingredientSearch = $state('');

	const ingredientSuggestions = $derived(
		ingredientSearch.length === 0
			? []
			: data.pantryItems.filter(
					(p) =>
						!draftItems.some((d) => d.pantryItemId === p.id) &&
						p.name.toLowerCase().includes(ingredientSearch.toLowerCase())
				)
	);

	const ingredientSearchIsExactMatch = $derived(
		data.pantryItems.some(
			(p) => p.name.toLowerCase() === ingredientSearch.trim().toLowerCase()
		)
	);

	function openAdd() {
		sheetMode = 'add';
		editingRecipe = null;
		nameInput = '';
		draftItems = [];
		ingredientSearch = '';
		setTimeout(() => nameEl?.focus(), 50);
	}

	function openEdit(recipe: Recipe) {
		sheetMode = 'edit';
		editingRecipe = recipe;
		nameInput = recipe.name;
		draftItems = recipe.items.map((i) => ({
			pantryItemId: i.pantryItemId ?? null,
			itemName: i.itemName,
			quantity: i.defaultQuantity
		}));
		ingredientSearch = '';
		setTimeout(() => nameEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
		editingRecipe = null;
	}

	function addIngredient(item: PantryItem) {
		draftItems = [...draftItems, { pantryItemId: item.id, itemName: item.name, quantity: 1 }];
		ingredientSearch = '';
	}

	function addCustomIngredient(name: string) {
		draftItems = [...draftItems, { pantryItemId: null, itemName: name, quantity: 1 }];
		ingredientSearch = '';
	}

	function removeIngredient(idx: number) {
		draftItems = draftItems.filter((_, i) => i !== idx);
	}
</script>

<svelte:head><title>Recipes — Kitchie</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Recipes" />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if data.recipes.length === 0}
			<EmptyState emoji="📋" heading="No recipes yet" detail="Save a recipe to pre-fill ingredients when logging meals." />
		{:else}
			<ul class="space-y-2">
				{#each data.recipes as recipe (recipe.id)}
					<li class="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs">
						<button
							type="button"
							onclick={() => openEdit(recipe)}
							class="min-w-0 flex-1 text-left"
						>
							<p class="truncate font-medium text-stone-900">{recipe.name}</p>
							<p class="text-xs text-stone-400">
								{recipe.items.length === 0
									? 'No ingredients'
									: recipe.items.map((i) => i.itemName).join(', ')}
							</p>
						</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={recipe.id} />
							<button type="submit" aria-label="Delete {recipe.name}" class="shrink-0 text-stone-300 hover:text-red-400">✕</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</main>

	<AddButton label="Add Recipe" onclick={openAdd} />
</div>

<!-- ── Add / Edit sheet ───────────────────────────────────────────────────── -->
<BottomSheet open={!!sheetMode} onclose={closeSheet}>
	<form
		method="POST"
		action="?/save"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') closeSheet();
		}}
	>
		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>

		{#if sheetMode === 'edit' && editingRecipe}
			<input type="hidden" name="id" value={editingRecipe.id} />
		{/if}

		<!-- Recipe name -->
		<div class="relative" use:clickOutside={() => (showNameSuggestions = false)}>
			<input
				bind:this={nameEl}
				bind:value={nameInput}
				onfocus={() => (showNameSuggestions = true)}
				name="name"
				type="text"
				placeholder="Recipe name"
				autocapitalize="sentences"
				autocomplete="off"
				required
				class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
			/>
			{#if showNameSuggestions && nameSuggestions.length > 0}
				<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each nameSuggestions as recipe (recipe.id)}
						<li>
							<button
								type="button"
								onmousedown={() => openEdit(recipe)}
								class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
							>
								<span class="flex-1 font-medium">{recipe.name}</span>
								<span class="shrink-0 text-xs text-stone-400">already saved · edit</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Ingredient list -->
		<p class="mt-4 mb-2 text-xs font-medium text-stone-500">Ingredients</p>

		{#if draftItems.length > 0}
			<ul class="mb-3 space-y-2">
				{#each draftItems as item, idx (idx)}
					<li class="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
						<input type="hidden" name="pantryItemId" value={item.pantryItemId ?? ''} />
						<input type="hidden" name="itemName" value={item.itemName} />
						<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{item.itemName}</span>
						<EstimatePicker bind:value={item.quantity} name="quantity" />
						<button
							type="button"
							onclick={() => removeIngredient(idx)}
							class="shrink-0 text-stone-300 hover:text-red-400"
							aria-label="Remove {item.itemName}"
						>✕</button>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Search pantry items to add (or type a custom ingredient) -->
		<div class="relative" use:clickOutside={() => (ingredientSearch = '')}>
			<input
				type="text"
				bind:value={ingredientSearch}
				placeholder="Search or type an ingredient…"
				autocomplete="off"
				class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
			/>
			{#if ingredientSearch.trim()}
				<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each ingredientSuggestions as item (item.id)}
						<li>
							<button
								type="button"
								onclick={() => addIngredient(item)}
								class="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
							>
								{item.name}
							</button>
						</li>
					{/each}
					{#if !ingredientSearchIsExactMatch}
						<li>
							<button
								type="button"
								onclick={() => addCustomIngredient(ingredientSearch.trim())}
								class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50"
							>
								Add "{ingredientSearch.trim()}" as ingredient
							</button>
						</li>
					{/if}
				</ul>
			{/if}
		</div>

		<FormActions
			isEditing={sheetMode === 'edit'}
			saveLabel={sheetMode === 'edit' ? 'Save' : 'Add recipe'}
			deleteAction="?/delete"
			disabled={!nameInput.trim()}
			oncancel={closeSheet}
		/>
	</form>
</BottomSheet>
