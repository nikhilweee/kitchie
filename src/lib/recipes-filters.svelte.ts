import { createPersistedState } from '$lib/persisted.svelte';
import { createSort } from '$lib/sort.svelte';
import type { RecipeCourse } from '$lib/recipe-course';

export type RecipesSortField = 'name' | 'prep' | 'recent' | 'course';

const _search    = createPersistedState<string>('recipes:search', '');
const _mealTypes = createPersistedState<RecipeCourse[]>('recipes:mealTypes', []);
const _cuisines  = createPersistedState<string[]>('recipes:cuisines', []);
const _sortBy    = createPersistedState<RecipesSortField>('recipes:sort:by', 'course');
const _sortDir   = createPersistedState<'asc' | 'desc'>('recipes:sort:dir', 'asc');

export const recipesSort = createSort<RecipesSortField>(
	_sortBy.value,
	_sortDir.value,
	(f) => (f === 'recent' ? 'desc' : 'asc')
);

export const rf = {
	get search()                             { return _search.value; },
	set search(v: string)                    { _search.value = v; },
	get activeMealTypes()                    { return _mealTypes.value; },
	set activeMealTypes(v: RecipeCourse[])   { _mealTypes.value = v; },
	get activeCuisines()                     { return _cuisines.value; },
	set activeCuisines(v: string[])          { _cuisines.value = v; },
};

export function syncRecipesSort(by: RecipesSortField, dir: 'asc' | 'desc') {
	_sortBy.value = by;
	_sortDir.value = dir;
}

export function resetRecipesFilters() {
	_search.value = '';
	_mealTypes.value = [];
	_cuisines.value = [];
	_sortBy.value = 'course';
	_sortDir.value = 'asc';
	recipesSort.by = 'course';
	recipesSort.dir = 'asc';
}
