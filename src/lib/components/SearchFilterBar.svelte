<script lang="ts">
	import type { Snippet } from 'svelte';
	import { clickOutside } from '$lib/actions/click-outside';
	import { ListFilter, X } from 'lucide-svelte';

	let {
		search = '',
		onsearch,
		placeholder = 'Search…',
		activeFilterCount = 0,
		onClearFilters,
		filterOptions
	}: {
		search?: string;
		onsearch?: (v: string) => void;
		placeholder?: string;
		activeFilterCount?: number;
		onClearFilters: () => void;
		filterOptions: Snippet;
	} = $props();

	let filterOpen = $state(false);
	let searchEl = $state<HTMLInputElement | undefined>(undefined);

	export function focusSearch() {
		searchEl?.focus();
	}
</script>

<svelte:window onkeydown={(e) => {
	if (e.key !== '/') return;
	const active = document.activeElement;
	if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
	e.preventDefault();
	searchEl?.focus();
}} />

<div class="relative mb-4 flex gap-2" use:clickOutside={() => (filterOpen = false)}>
	<div class="relative flex-1">
		<input
			type="text"
			bind:this={searchEl}
			value={search}
			oninput={(e) => onsearch?.(e.currentTarget.value)}
			onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); searchEl?.blur(); } }}
			{placeholder}
			autocomplete="off"
			class="block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none {search ? 'pr-8' : ''}"
		/>
		{#if search}
			<button
				type="button"
				onclick={() => onsearch?.('')}
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
		class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors {activeFilterCount > 0 ? 'border-stone-800 bg-stone-800 text-white dark:bg-stone-500 dark:border-stone-500 dark:text-stone-950' : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400'}"
		aria-label="Filters"
	>
		<ListFilter class="h-4 w-4" />
		{#if activeFilterCount > 0}
			<span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{activeFilterCount}</span>
		{/if}
	</button>
	{#if filterOpen}
		<div class="absolute top-full right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
			{@render filterOptions()}
			<div class="border-t border-stone-100 p-2">
				<button type="button" onclick={() => { onClearFilters(); filterOpen = false; }}
					class="w-full rounded-lg py-1.5 text-xs text-stone-400 hover:bg-stone-50">Clear all</button>
			</div>
		</div>
	{/if}
</div>
