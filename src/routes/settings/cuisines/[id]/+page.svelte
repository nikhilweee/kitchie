<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';

	let { data }: { data: PageData } = $props();

	let nameEl = $state<HTMLInputElement | undefined>();
	$effect(() => nameEl?.focus());

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			history.back();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | Edit Cuisine</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Edit Cuisine" back="/settings/cuisines" mainClass="px-4 py-6">
	<form
		id="cuisine-form"
		method="POST"
		action="/settings/cuisines?/update"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto(resolve('/settings/cuisines'));
			}
		}}
	>
		<input type="hidden" name="id" value={data.cuisine.id} />

		<label class="mb-1 block text-xs font-medium text-stone-500" for="cuisine-name">Name</label>
		<input
			id="cuisine-name"
			name="name"
			type="text"
			required
			autocapitalize="sentences"
			bind:this={nameEl}
			value={data.cuisine.name}
			class="mb-6 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
		/>
	</form>

	<div class="flex gap-2">
		<form
			method="POST"
			action="/settings/cuisines?/delete"
			class="contents"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					goto(resolve('/settings/cuisines'));
				}
			}}
		>
			<input type="hidden" name="id" value={data.cuisine.id} />
			<button
				type="submit"
				data-shortcut="delete"
				disabled={data.cuisine.usageCount > 0}
				class="flex-1 rounded-xl border border-stone-300 py-2.5 text-sm font-medium text-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
			>
				{data.cuisine.usageCount > 0
					? `In use by ${data.cuisine.usageCount} recipe${data.cuisine.usageCount !== 1 ? 's' : ''}`
					: 'Delete cuisine'}
			</button>
		</form>
		<button
			type="submit"
			form="cuisine-form"
			data-shortcut="primary"
			class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
		>
			Save
		</button>
	</div>
</PageShell>
