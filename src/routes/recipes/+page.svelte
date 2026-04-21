<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import type { PageData } from './$types';
	import { clickOutside } from '$lib/actions/click-outside';
	import Toast from '$lib/components/Toast.svelte';
	import { RECIPE_COURSE_LABELS, RECIPE_COURSES, type RecipeCourse } from '$lib/recipe-course';
	import { CUISINE_LABELS, CUISINES, type Cuisine } from '$lib/cuisine';
	import PrepTimePicker, { PREP_TIME_LABELS } from '$lib/components/PrepTimePicker.svelte';
	import { X, ListFilter, Search, ChefHat } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	type Recipe = PageData['recipes'][0];

	let search = $state('');
	let activeMealTypes = $state<Set<RecipeCourse>>(new Set());
	let activeCuisines = $state<Set<Cuisine>>(new Set());
	let filterOpen = $state(false);

	function toggleMealType(t: RecipeCourse) {
		const next = new Set(activeMealTypes);
		if (next.has(t)) next.delete(t); else next.add(t);
		activeMealTypes = next;
	}

	function toggleCuisine(c: Cuisine) {
		const next = new Set(activeCuisines);
		if (next.has(c)) next.delete(c); else next.add(c);
		activeCuisines = next;
	}

	type SortKey = 'name-asc' | 'name-desc' | 'prep-asc' | 'prep-desc';
	let sort = $state<SortKey | null>(null);

	const SORT_OPTIONS: { key: SortKey; label: string }[] = [
		{ key: 'name-asc', label: 'Name A → Z' },
		{ key: 'name-desc', label: 'Name Z → A' },
		{ key: 'prep-asc', label: 'Prep time (quick first)' },
		{ key: 'prep-desc', label: 'Prep time (long first)' },
	];

	const activeFilterCount = $derived(activeCuisines.size + (sort !== null ? 1 : 0));

	// Use derived (not data.recipes.length) so the search bar appears reactively
	// after the first recipe is added via form enhance, without a full page reload.
	const anyRecipes = $derived(data.recipes.length > 0);

	const filteredBase = $derived(
		data.recipes.filter((r) => {
			if (search.trim() && !r.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
			if (activeMealTypes.size > 0 && !activeMealTypes.has(r.mealType as RecipeCourse)) return false;
			if (activeCuisines.size > 0 && !activeCuisines.has(r.cuisine as Cuisine)) return false;
			return true;
		})
	);

	const filteredRecipes = $derived(
		sort === null ? filteredBase : [...filteredBase].sort((a, b) => {
			if (sort === 'name-asc') return a.name.localeCompare(b.name);
			if (sort === 'name-desc') return b.name.localeCompare(a.name);
			const pa = a.prepTime ?? 999, pb = b.prepTime ?? 999;
			return sort === 'prep-asc' ? pa - pb : pb - pa;
		})
	);
	type PantryItem = PageData['pantryItems'][0];

	// Toast
	let toast = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout>;
	function showToast(msg: string) {
		clearTimeout(toastTimer);
		toast = msg;
		toastTimer = setTimeout(() => (toast = null), 2500);
	}

	// ── Sheet mode ────────────────────────────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingRecipe = $state<Recipe | null>(null);
	let nameInput = $state('');
	let mealTypeInput = $state<RecipeCourse | ''>('');
	let cuisineInput = $state<Cuisine | ''>('');
	let prepTimeInput = $state<number | null>(null);
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
	type DraftItem = { pantryItemId: string | null; itemName: string; quantity: string };
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
		mealTypeInput = '';
		cuisineInput = '';
		prepTimeInput = null;
		draftItems = [];
		ingredientSearch = '';
		setTimeout(() => nameEl?.focus(), 50);
	}

	function openEdit(recipe: Recipe) {
		sheetMode = 'edit';
		editingRecipe = recipe;
		nameInput = recipe.name;
		mealTypeInput = (recipe.mealType as RecipeCourse) ?? '';
		cuisineInput = (recipe.cuisine as Cuisine) ?? '';
		prepTimeInput = recipe.prepTime ?? null;
		draftItems = recipe.items.map((i) => ({
			pantryItemId: i.pantryItemId ?? null,
			itemName: i.itemName,
			quantity: i.quantity ?? ''
		}));
		ingredientSearch = '';
		setTimeout(() => nameEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
		editingRecipe = null;
	}

	function addIngredient(item: PantryItem) {
		draftItems = [...draftItems, { pantryItemId: item.id, itemName: item.name, quantity: '' }];
		ingredientSearch = '';
	}

	function addCustomIngredient(name: string) {
		draftItems = [...draftItems, { pantryItemId: null, itemName: name, quantity: '' }];
		ingredientSearch = '';
	}

	function removeIngredient(idx: number) {
		draftItems = draftItems.filter((_, i) => i !== idx);
	}
</script>

<svelte:head><title>Kitchie | Recipes</title></svelte:head>

<Toast message={toast} />

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Recipes" />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if anyRecipes}
			<div class="relative mb-4 flex gap-2" use:clickOutside={() => (filterOpen = false)}>
				<input
					type="text"
					bind:value={search}
					placeholder="Search recipes…"
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
						{#each SORT_OPTIONS as opt (opt.key)}
							<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-stone-50">
								<input type="radio" name="recipe-sort" value={opt.key} checked={sort === opt.key} onchange={() => (sort = opt.key)} class="accent-orange-500" />
								<span class="text-sm text-stone-700">{opt.label}</span>
							</label>
						{/each}
						<div class="border-t border-stone-100 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Cuisine</div>
						<div class="max-h-48 overflow-y-auto">
							{#each CUISINES as c (c)}
								<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-stone-50">
									<input type="checkbox" checked={activeCuisines.has(c)} onchange={() => toggleCuisine(c)} class="accent-orange-500" />
									<span class="text-sm text-stone-700">{CUISINE_LABELS[c]}</span>
								</label>
							{/each}
						</div>
						<div class="border-t border-stone-100 p-2">
							<button type="button" onclick={() => { sort = null; activeCuisines = new Set(); }} class="w-full rounded-lg py-1.5 text-xs text-stone-400 hover:bg-stone-50">Clear all</button>
						</div>
					</div>
				{/if}
			</div>
			<div class="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
				{#each RECIPE_COURSES as t (t)}
					<button type="button" onclick={() => toggleMealType(t)}
						class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {activeMealTypes.has(t) ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
					>{RECIPE_COURSE_LABELS[t]}</button>
				{/each}
			</div>
		{/if}
		{#if filteredRecipes.length === 0}
			{#if search.trim() || activeMealTypes.size > 0 || activeCuisines.size > 0}
				<EmptyState icon={Search} heading="No matches" detail="Try a different search or filter." />
			{:else}
				<EmptyState icon={ChefHat} heading="No recipes yet" detail="Save a recipe to pre-fill ingredients when logging meals." />
			{/if}
		{:else}
			<ul class="space-y-2">
				{#each filteredRecipes as recipe (recipe.id)}
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
								{#if recipe.prepTime}
									· {PREP_TIME_LABELS[recipe.prepTime]}
								{/if}
							</p>
						</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={recipe.id} />
							<button type="submit" aria-label="Delete {recipe.name}" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400"><X class="h-3.5 w-3.5" /></button>
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
			if (result.type === 'success') {
				const msg = sheetMode === 'add' ? 'Recipe saved' : 'Recipe updated';
				closeSheet();
				showToast(msg);
			}
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

		<!-- Meal type + Cuisine -->
		<div class="mt-3 flex gap-3">
			<div class="flex-1">
				<label for="recipe-meal-type" class="mb-1 block text-xs font-medium text-stone-500">Course</label>
				<select
					id="recipe-meal-type"
					name="mealType"
					bind:value={mealTypeInput}
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				>
					<option value="">Any</option>
					{#each RECIPE_COURSES as t (t)}
						<option value={t}>{RECIPE_COURSE_LABELS[t]}</option>
					{/each}
				</select>
			</div>
			<div class="flex-1">
				<label for="recipe-cuisine" class="mb-1 block text-xs font-medium text-stone-500">Cuisine</label>
				<select
					id="recipe-cuisine"
					name="cuisine"
					bind:value={cuisineInput}
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				>
					<option value="">Any</option>
					{#each CUISINES as c (c)}
						<option value={c}>{CUISINE_LABELS[c]}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Prep time -->
		<div class="mt-3">
			<p class="mb-1 text-xs font-medium text-stone-500">Prep time</p>
			<PrepTimePicker bind:value={prepTimeInput} name="prepTime" />
		</div>

		<!-- Ingredient list -->
		<p class="mt-4 mb-2 text-xs font-medium text-stone-500">Ingredients</p>

		{#if draftItems.length > 0}
			<ul class="mb-3 space-y-2">
				{#each draftItems as item, idx (idx)}
					<li class="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
						<input type="hidden" name="pantryItemId" value={item.pantryItemId ?? ''} />
						<input type="hidden" name="itemName" value={item.itemName} />
						<span class="w-5 shrink-0 text-center text-xs font-medium text-stone-400">{idx + 1}</span>
						<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{item.itemName}</span>
						<input
							type="text"
							name="quantity"
							bind:value={item.quantity}
							placeholder="qty"
							autocomplete="off"
							class="w-16 shrink-0 rounded-lg border border-stone-200 bg-white px-2 py-1 text-center text-sm text-stone-700 placeholder-stone-300 focus:border-orange-400 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => removeIngredient(idx)}
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400"
							aria-label="Remove {item.itemName}"
						><X class="h-3.5 w-3.5" /></button>
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
