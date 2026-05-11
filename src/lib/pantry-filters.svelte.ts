import { createPersistedState } from '$lib/persisted.svelte';
import { createSort } from '$lib/sort.svelte';

export type StatusFilter = 'expiring' | 'low' | 'done';
export type PantrySortField = 'name' | 'category' | 'expiry' | 'purchased';

const _search  = createPersistedState<string>('pantry:search', '');
const _status  = createPersistedState<StatusFilter | null>('pantry:status', null);

// Migrate stale 'normal' state from when the "In Stock" pill existed.
if ((_status.value as string | null) === 'normal') _status.value = null;
const _cats    = createPersistedState<string[]>('pantry:categories', []);
const _sortBy  = createPersistedState<PantrySortField>('pantry:sort:by', 'expiry');
const _sortDir = createPersistedState<'asc' | 'desc'>('pantry:sort:dir', 'asc');

export const pantrySort = createSort<PantrySortField>(_sortBy.value, _sortDir.value);

export const pf = {
	get search()                             { return _search.value; },
	set search(v: string)                    { _search.value = v; },
	get activeStatus()                       { return _status.value; },
	set activeStatus(v: StatusFilter | null) { _status.value = v; },
	get activeCategories()                   { return _cats.value; },
	set activeCategories(v: string[])        { _cats.value = v; },
};

export function syncPantrySort(by: PantrySortField, dir: 'asc' | 'desc') {
	_sortBy.value = by;
	_sortDir.value = dir;
}

export function resetPantryFilters() {
	_search.value = '';
	_status.value = null;
	_cats.value = [];
	_sortBy.value = 'expiry';
	_sortDir.value = 'asc';
	pantrySort.by = 'expiry';
	pantrySort.dir = 'asc';
}
