<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { PageData } from './$types';
	import { clickOutside } from '$lib/actions/click-outside';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { createSort } from '$lib/sort.svelte';
	import { RECIPE_COURSE_LABELS, RECIPE_COURSES, type RecipeCourse } from '$lib/recipe-course';
	import PrepTimePicker, { PREP_TIME_LABELS } from '$lib/components/PrepTimePicker.svelte';
	import { X, ListFilter, Search, ChefHat } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	type Recipe = PageData['recipes'][0];
	type Cuisine = PageData['cuisines'][0];

	let search = $state('');
	let activeMealTypes = $state<Set<RecipeCourse>>(new Set());
	let activeCuisines = $state<Set<string>>(new Set());
	let filterOpen = $state(false);
	let sidebarOpen = $state(false);

	function toggleMealType(t: RecipeCourse) {
		const next = new Set(activeMealTypes);
		if (next.has(t)) next.delete(t); else next.add(t);
		activeMealTypes = next;
	}

	function toggleCuisine(id: string) {
		const next = new Set(activeCuisines);
		if (next.has(id)) next.delete(id); else next.add(id);
		activeCuisines = next;
	}

	function cuisineLabel(id: string): string {
		return data.cuisines.find((c) => c.id === id)?.name ?? '';
	}

	type SortField = 'name' | 'prep' | 'recent';
	const s = createSort<SortField>('recent', 'desc', (f) => f === 'recent' ? 'desc' : 'asc');

	const SORT_FIELDS: { field: SortField; label: string }[] = [
		{ field: 'name', label: 'Name' },
		{ field: 'prep', label: 'Prep time' },
		{ field: 'recent', label: 'Recent' },
	];

	const activeFilterCount = $derived(activeCuisines.size);
	const anyRecipes = $derived(data.recipes.length > 0);

	const filteredBase = $derived(
		data.recipes.filter((r) => {
			if (search.trim() && !r.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
			if (activeMealTypes.size > 0 && !activeMealTypes.has(r.mealType as RecipeCourse)) return false;
			if (activeCuisines.size > 0 && !activeCuisines.has(r.cuisine ?? '')) return false;
			return true;
		})
	);

	const filteredRecipes = $derived(
		[...filteredBase].sort((a, b) => {
			if (s.key === 'name-asc') return a.name.localeCompare(b.name);
			if (s.key === 'name-desc') return b.name.localeCompare(a.name);
			if (s.key === 'recent-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			if (s.key === 'recent-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			const pa = a.prepTime ?? 999, pb = b.prepTime ?? 999;
			return s.key === 'prep-asc' ? pa - pb : pb - pa;
		})
	);

	type PantryItem = PageData['pantryItems'][0];

	// Toast
	const toast = createToast();
	const showToast = toast.show;

	// ── Sheet mode ────────────────────────────────────────────────────────────
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingRecipe = $state<Recipe | null>(null);
	let nameInput = $state('');
	let mealTypeInput = $state<RecipeCourse | ''>('');
	let cuisineInput = $state<string>('');
	let prepTimeInput = $state<number | null>(null);
	let nameEl = $state<HTMLInputElement | undefined>(undefined);
	let showNameSuggestions = $state(false);

	const nameSuggestions = $derived(
		sheetMode === 'add' && nameInput.trim().length > 0
			? data.recipes.filter((r) =>
					r.name.toLowerCase().includes(nameInput.trim().toLowerCase())
				)
			: []
	);

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
		cuisineInput = recipe.cuisine ?? '';
		prepTimeInput = recipe.prepTime ?? null;
		draftItems = recipe.items.map((i) => ({
			pantryItemId: i.pantryItemId ?? null,
			itemName: i.itemName,
			quantity: i.quantity ?? ''
		}));
		ingredientSearch = '';
		history.replaceState(history.state, '', `?edit=${recipe.id}`);
		setTimeout(() => nameEl?.focus(), 50);
	}

	function closeSheet() {
		sheetMode = null;
		editingRecipe = null;
		history.replaceState(history.state, '', location.pathname);
	}

	// Deep-link: ?edit=<id> opens the edit sheet for that recipe
	$effect(() => {
		if (data.editId) {
			const recipe = data.recipes.find((r) => r.id === data.editId);
			if (recipe) openEdit(recipe);
		}
	});

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

<Toast message={toast.message} />
<Sidebar open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Recipes" onhamburger={() => (sidebarOpen = true)} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if anyRecipes}
			<div class="relative mb-4 flex gap-2" use:clickOutside={() => (filterOpen = false)}>
				<div class="relative flex-1">
					<input
						type="text"
						bind:value={search}
						placeholder="Search recipes…"
						autocomplete="off"
						class="block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none {search ? 'pr-8' : ''}"
					/>
					{#if search}
						<button
							type="button"
							onclick={() => (search = '')}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
							aria-label="Clear search"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				</div>
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
						<div class="border-t border-stone-100 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Cuisine</div>
						<div class="max-h-48 overflow-y-auto">
							{#each data.cuisines as c (c.id)}
								<label class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-stone-50">
									<input type="checkbox" checked={activeCuisines.has(c.id)} onchange={() => toggleCuisine(c.id)} class="accent-orange-500" />
									<span class="text-sm text-stone-700">{c.name}</span>
								</label>
							{/each}
						</div>
						<div class="border-t border-stone-100 p-2">
							<button type="button" onclick={() => { s.by = 'recent'; s.dir = 'desc'; activeCuisines = new Set(); }} class="w-full rounded-lg py-1.5 text-xs text-stone-400 hover:bg-stone-50">Clear all</button>
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
					{#each data.cuisines as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="mt-3">
			<p class="mb-1 text-xs font-medium text-stone-500">Prep time</p>
			<PrepTimePicker bind:value={prepTimeInput} name="prepTime" />
		</div>

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
