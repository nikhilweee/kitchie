<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { MEAL_TYPE_LABELS } from '$lib/meal-type';
	import PageShell from '$lib/components/PageShell.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { MealType } from '$lib/server/db/schema';
	import Toast from '$lib/components/Toast.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import { Utensils } from 'lucide-svelte';
	import { createToast } from '$lib/toast.svelte';

	let { data }: { data: PageData } = $props();

	const toast = createToast();

	$effect(() => {
		const msg = page.url.searchParams.get('toast');
		if (msg) {
			toast.show(decodeURIComponent(msg.replace(/\+/g, ' ')));
			history.replaceState(history.state, '', location.pathname);
		}
	});

	// ── Meal log grouping ────────────────────────────────────────────────────
	type Entry = PageData['entries'][0];
	function groupByDay(entries: Entry[]) {
		const groups = new Map<string, Entry[]>();
		for (const e of entries) {
			const key = new Date(e.loggedAt).toLocaleDateString('en-US', {
				weekday: 'long', month: 'short', day: 'numeric'
			});
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(e);
		}
		return groups;
	}

	const grouped = $derived(groupByDay(data.entries));

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function isToday(key: string) {
		return key === new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	}
</script>

<svelte:head><title>Kitchie | Meals</title></svelte:head>

<Toast message={toast.message} />

<PageShell title="Meals" mainClass="px-4 py-4 pb-36">
	{#if data.entries.length === 0}
		<EmptyState icon={Utensils} heading="No meals logged yet" detail="Tap the button below to log your first meal." />
	{:else}
		{#each grouped as [day, entries] (day)}
			<section class="mb-6">
				<h2 class="mb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">
					{isToday(day) ? 'Today' : day}
				</h2>
				<ul class="space-y-2">
					{#each entries as entry (entry.id)}
						<ListRow>
							<button type="button" onclick={() => goto(resolve('/meals/[id]', { id: entry.id }))} class="min-w-0 flex-1 text-left">
								<p class="truncate font-medium text-stone-900 density-text">{entry.name}</p>
								<p class="text-xs text-stone-400 density-hide">{MEAL_TYPE_LABELS[entry.mealType as MealType]}</p>
							</button>
							<span class="shrink-0 text-xs text-stone-400">{formatTime(entry.loggedAt)}</span>
						</ListRow>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</PageShell>

<AddButton label="Add Meal" onclick={() => goto(resolve('/meals/add'))} />

