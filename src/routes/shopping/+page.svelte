<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { ShoppingCart, Pencil } from 'lucide-svelte';
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
</script>

<svelte:head><title>Kitchie | Carts</title></svelte:head>

<Toast message={toast.message} />

<PageShell title="Carts">
	{#if data.lists.length === 0}
		<EmptyState icon={ShoppingCart} heading="No carts yet" detail="Tap + to create a cart" />
	{:else}
		<ul class="space-y-2">
			{#each data.lists as list (list.id)}
				<ListRow>
					<a href="/shopping/{list.id}" class="min-w-0 flex-1">
						<p class="truncate font-medium text-stone-900 density-text">{list.name}</p>
						<p class="text-xs text-stone-400 density-hide">{list.shoppedCount}/{list.itemCount} items</p>
					</a>
					<span class="hidden shrink-0 items-center text-xs text-stone-400 density-show-slim">{list.shoppedCount}/{list.itemCount}</span>
					<button type="button" onclick={() => goto(`/shopping/${list.id}/edit`)}
						class="flex shrink-0 items-center justify-center text-stone-300 hover:text-stone-500 transition-colors"
						aria-label="Rename {list.name}">
						<Pencil class="h-3.5 w-3.5" />
					</button>
				</ListRow>
			{/each}
		</ul>
	{/if}
</PageShell>

<AddButton label="New cart" onclick={() => goto('/shopping/new')} />
