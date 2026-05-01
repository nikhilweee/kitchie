<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';

	let { data }: { data: PageData } = $props();

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			history.back();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | Edit Category</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Edit Category" back="/settings/categories" mainClass="px-4 py-6">
	<form
		id="cat-form"
		method="POST"
		action="/settings/categories?/update"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto('/settings/categories');
			}
		}}
	>
		<input type="hidden" name="id" value={data.category.id} />

		<label class="mb-1 block text-xs font-medium text-stone-500" for="cat-name">Name</label>
		<input
			id="cat-name"
			name="name"
			type="text"
			required
			autocapitalize="sentences"
			autofocus
			value={data.category.name}
			class="mb-4 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
		/>

		<label class="mb-1 block text-xs font-medium text-stone-500" for="cat-ttl">Default shelf life (days)</label>
		<input
			id="cat-ttl"
			name="ttlDays"
			type="number"
			min="1"
			required
			value={data.category.ttlDays}
			class="mb-6 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
		/>
	</form>

	<div class="flex gap-2">
		<form
			method="POST"
			action="/settings/categories?/delete"
			class="contents"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					goto('/settings/categories');
				}
			}}
		>
			<input type="hidden" name="id" value={data.category.id} />
			<button
				type="submit"
				data-shortcut="delete"
				disabled={data.category.usageCount > 0}
				class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
			>
				{data.category.usageCount > 0
					? `In use by ${data.category.usageCount} item${data.category.usageCount !== 1 ? 's' : ''}`
					: 'Delete category'}
			</button>
		</form>
		<button
			type="submit"
			form="cat-form"
			data-shortcut="primary"
			class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
		>
			Save
		</button>
	</div>
</PageShell>
