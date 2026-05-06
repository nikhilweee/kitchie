<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PageShell from '$lib/components/PageShell.svelte';

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

<svelte:head><title>Kitchie | Add Cuisine</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Add Cuisine" back="/settings/cuisines" mainClass="px-4 py-6">
	<form
		method="POST"
		action="/settings/cuisines?/add"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto(resolve('/settings/cuisines'));
			}
		}}
	>
		<label class="mb-1 block text-xs font-medium text-stone-500" for="cuisine-name">Name</label>
		<input
			id="cuisine-name"
			name="name"
			type="text"
			required
			autocapitalize="sentences"
			bind:this={nameEl}
			class="mb-6 block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
		/>

		<div class="flex gap-2">
			<a
				href={resolve('/settings/cuisines')}
				class="flex-1 rounded-xl border border-stone-300 py-2.5 text-center text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
			>
				Cancel
			</a>
			<button
				type="submit"
				data-shortcut="primary"
				class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
			>
				Save
			</button>
		</div>
	</form>
</PageShell>
