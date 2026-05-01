<script lang="ts">
	import { enhance } from '$app/forms';
	import PageShell from '$lib/components/PageShell.svelte';

	let nameInput = $state('');

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') history.back();
		else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | New Cart</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="New Cart" back="/carts" mainClass="px-4 py-4 pb-36">
	<form
		method="POST"
		action="/carts?/create"
		use:enhance={() => async ({ update }) => {
			await update();
		}}
	>
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
			class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
		/>
		<div class="mt-4 flex gap-2">
			<a href="/carts" class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</a>
			<button
				type="submit"
				data-shortcut="primary"
				disabled={!nameInput.trim()}
				class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
			>Create cart</button>
		</div>
	</form>
</PageShell>
