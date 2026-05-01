<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';

	let { data }: { data: PageData } = $props();

	let nameInput = $state(data.list.name);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') history.back();
		else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="delete"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | Rename Cart</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Rename Cart" back="/carts" mainClass="px-4 py-4 pb-36">
	<form
		id="rename-form"
		method="POST"
		action="/carts?/rename"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') goto('/carts');
		}}
	>
		<input type="hidden" name="id" value={data.list.id} />
		<label class="mb-1 block text-xs font-medium text-stone-500" for="list-name">Cart name</label>
		<input
			id="list-name"
			bind:value={nameInput}
			name="name"
			type="text"
			placeholder="e.g. Whole Foods, Costco…"
			autocomplete="off"
			autocapitalize="sentences"
			required
			class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none density-sheet-name"
		/>
	</form>
	<div class="mt-4 flex gap-2">
		<form
			method="POST"
			action="/carts?/delete"
			class="contents"
			use:enhance={() => async ({ update }) => {
				await update({ reset: false });
				goto('/carts');
			}}
		>
			<input type="hidden" name="id" value={data.list.id} />
			<button
				type="submit"
				data-shortcut="delete"
				class="flex-1 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50 density-sheet-btn"
			>Delete</button>
		</form>
		<button
			type="submit"
			form="rename-form"
			data-shortcut="primary"
			disabled={!nameInput.trim()}
			class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 density-sheet-btn"
		>Save</button>
	</div>
</PageShell>
