<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import ListRow from '$lib/components/ListRow.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createToast } from '$lib/toast.svelte';
	import { GripVertical } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const toast = createToast();
	$effect(() => {
		const msg = page.url.searchParams.get('toast');
		if (msg) toast.show(decodeURIComponent(msg));
	});

	// Drag state
	let items = $state<typeof data.categories>([]);
	let draggedId = $state<string | null>(null);
	let reorderForm: HTMLFormElement;

	$effect(() => {
		items = data.categories.map((c) => c);
	});

	function onDragStart(id: string) {
		draggedId = id;
	}

	function onDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		if (!draggedId || draggedId === id) return;
		const from = items.findIndex((c) => c.id === draggedId);
		const to = items.findIndex((c) => c.id === id);
		if (from === -1 || to === -1) return;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		items = next;
	}

	function onDrop() {
		draggedId = null;
		const input = reorderForm.querySelector<HTMLInputElement>('input[name="ids"]')!;
		input.value = items.map((c) => c.id).join(',');
		reorderForm.requestSubmit();
	}

	function onDragEnd() {
		draggedId = null;
	}
</script>

<svelte:head><title>Kitchie | Categories</title></svelte:head>

<PageShell title="Categories" back={true} mainClass="px-4 py-6 pb-28">
	<!-- Hidden reorder form -->
	<form bind:this={reorderForm} method="POST" action="?/reorder" use:enhance class="hidden">
		<input type="hidden" name="ids" value="" />
	</form>

	<ul class="space-y-2">
		{#each items as cat (cat.id)}
			<ListRow
				draggable={true}
				ondragstart={() => onDragStart(cat.id)}
				ondragover={(e) => onDragOver(e, cat.id)}
				ondrop={onDrop}
				ondragend={onDragEnd}
				faded={draggedId === cat.id}
			>
				<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-stone-300 active:cursor-grabbing" />
				<button type="button" onclick={() => goto(`/settings/categories/${cat.id}`)} class="min-w-0 flex-1 text-left">
					<p class="text-sm font-medium text-stone-900 density-text">{cat.name}</p>
					<p class="text-xs text-stone-400 density-hide">{cat.ttlDays} day shelf life</p>
				</button>
				{#if cat.usageCount > 0}
					<span class="shrink-0 text-xs text-stone-400">{cat.usageCount} item{cat.usageCount !== 1 ? 's' : ''}</span>
				{/if}
			</ListRow>
		{/each}
	</ul>
</PageShell>

<AddButton label="Add category" onclick={() => goto('/settings/categories/add')} />
<Toast message={toast.message} />
