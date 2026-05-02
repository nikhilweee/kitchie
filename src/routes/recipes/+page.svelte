<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageShell from '$lib/components/PageShell.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { RECIPE_COURSE_LABELS, RECIPE_COURSES, type RecipeCourse } from '$lib/recipe-course';
	import { rf, recipesSort, syncRecipesSort, resetRecipesFilters, type RecipesSortField } from '$lib/recipes-filters.svelte';
	import PrepTimePicker, { PREP_TIME_LABELS } from '$lib/components/PrepTimePicker.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import SearchFilterBar from '$lib/components/SearchFilterBar.svelte';
	import type { PageData } from './$types';
	import { Search, ChefHat } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	type Recipe = PageData['recipes'][0];

	const s = recipesSort;

	const SORT_FIELDS: { field: RecipesSortField; label: string }[] = [
		{ field: 'course', label: 'Course' },
		{ field: 'name',   label: 'Name' },
		{ field: 'prep',   label: 'Prep time' },
		{ field: 'recent', label: 'Recent' },
	];

	// Sync sort changes back to localStorage
	$effect(() => syncRecipesSort(recipesSort.by, recipesSort.dir));

	function toggleMealType(t: RecipeCourse) {
		const types = rf.activeMealTypes;
		rf.activeMealTypes = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
	}

	function toggleCuisine(id: string) {
		const cuisines = rf.activeCuisines;
		rf.activeCuisines = cuisines.includes(id) ? cuisines.filter((x) => x !== id) : [...cuisines, id];
	}

	const activeFilterCount = $derived(rf.activeCuisines.length);
	const anyRecipes = $derived(data.recipes.length > 0);

	const filteredBase = $derived(
		data.recipes.filter((r) => {
			if (rf.search.trim() && !r.name.toLowerCase().includes(rf.search.trim().toLowerCase())) return false;
			if (rf.activeMealTypes.length > 0 && !rf.activeMealTypes.includes(r.mealType as RecipeCourse)) return false;
			if (rf.activeCuisines.length > 0 && !rf.activeCuisines.includes(r.cuisine ?? '')) return false;
			return true;
		})
	);

	const courseIdx = (r: Recipe) => {
		const i = RECIPE_COURSES.indexOf(r.mealType as RecipeCourse);
		return i === -1 ? 999 : i;
	};

	const filteredRecipes = $derived(
		[...filteredBase].sort((a, b) => {
			if (s.key === 'name-asc') return a.name.localeCompare(b.name);
			if (s.key === 'name-desc') return b.name.localeCompare(a.name);
			if (s.key === 'recent-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			if (s.key === 'recent-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			if (s.key === 'course-asc') return courseIdx(a) - courseIdx(b) || a.name.localeCompare(b.name);
			if (s.key === 'course-desc') return courseIdx(b) - courseIdx(a) || b.name.localeCompare(a.name);
			const pa = a.prepTime ?? 999, pb = b.prepTime ?? 999;
			return s.key === 'prep-asc' ? pa - pb : pb - pa;
		})
	);

	type Group = { label: string; recipes: Recipe[] };

	const groupedRecipes = $derived.by((): Group[] => {
		if (s.by !== 'course') return [{ label: '', recipes: filteredRecipes }];
		const order = [...RECIPE_COURSES, null] as (RecipeCourse | null)[];
		const map = new Map<RecipeCourse | null, Recipe[]>(order.map((k) => [k, []]));
		for (const r of filteredRecipes) {
			const key = RECIPE_COURSES.includes(r.mealType as RecipeCourse) ? (r.mealType as RecipeCourse) : null;
			map.get(key)!.push(r);
		}
		return [...map.entries()]
			.filter(([, rs]) => rs.length > 0)
			.map(([key, rs]) => ({ label: key ? RECIPE_COURSE_LABELS[key] : 'Other', recipes: rs }));
	});

	// Toast
	const toast = createToast();

	$effect(() => {
		const msg = page.url.searchParams.get('toast');
		if (msg) {
			toast.show(msg);
			history.replaceState(history.state, '', location.pathname);
		}
	});
</script>

<svelte:head><title>Kitchie | Recipes</title></svelte:head>

<Toast message={toast.message} />

<PageShell title="Recipes" mainClass="px-4 py-4 pb-36">
		{#if anyRecipes}
			<SearchFilterBar
				search={rf.search}
				onsearch={(v) => (rf.search = v)}
				placeholder="Search recipes…"
				activeFilterCount={activeFilterCount}
				onClearFilters={resetRecipesFilters}
			>
				{#snippet filterOptions()}
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
								<input type="checkbox" checked={rf.activeCuisines.includes(c.id)} onchange={() => toggleCuisine(c.id)} class="accent-orange-500" />
								<span class="text-sm text-stone-700">{c.name}</span>
							</label>
						{/each}
					</div>
				{/snippet}
			</SearchFilterBar>
			<div class="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
				{#each RECIPE_COURSES as t (t)}
					<button type="button" onclick={() => toggleMealType(t)}
						class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors {rf.activeMealTypes.includes(t) ? 'border-stone-800 bg-stone-800 text-white dark:bg-stone-500 dark:border-stone-500 dark:text-stone-950' : 'border-stone-300 text-stone-500 hover:border-stone-400'}"
					>{RECIPE_COURSE_LABELS[t]}</button>
				{/each}
			</div>
		{/if}
		{#if filteredRecipes.length === 0}
			{#if rf.search.trim() || rf.activeMealTypes.length > 0 || rf.activeCuisines.length > 0}
				<EmptyState icon={Search} heading="No matches" detail="Try a different search or filter." />
			{:else}
				<EmptyState icon={ChefHat} heading="No recipes yet" detail="Save a recipe to pre-fill ingredients when logging meals." />
			{/if}
		{:else}
			{#each groupedRecipes as group (group.label)}
				<div class="mt-4 mb-1 flex items-center gap-3 px-4">
					<h2 class="flex-1 text-xs font-semibold uppercase tracking-wider text-stone-400">{group.label}</h2>
					<span class="shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-stone-400">Prep</span>
				</div>
				<ul class="mb-2 space-y-2">
					{#each group.recipes as recipe (recipe.id)}
						<ListRow>
							<button type="button" onclick={() => goto(`/recipes/${recipe.id}`)} class="min-w-0 flex-1 text-left">
								<p class="truncate font-medium text-stone-900 density-text">{recipe.name}</p>
								<p class="text-xs text-stone-400 density-hide">
									{recipe.items.length === 0 ? 'No ingredients' : recipe.items.map((i) => i.itemName).join(', ')}
								</p>
							</button>
							{#if recipe.prepTime}
								{@const v = Math.min(recipe.prepTime, 3)}
								{@const color = v === 1 ? 'bg-green-500' : v === 2 ? 'bg-yellow-400' : 'bg-red-500'}
								<div class="flex gap-0.5" aria-label={PREP_TIME_LABELS[v]}>
									{#each [1, 2, 3] as bar (bar)}
										<div class="h-3 w-1.5 rounded-sm {bar <= v ? color : 'bg-stone-200'}"></div>
									{/each}
								</div>
							{/if}
						</ListRow>
					{/each}
				</ul>
			{/each}
		{/if}
</PageShell>

<AddButton label="Add Recipe" onclick={() => goto('/recipes/add')} />
