<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Pencil, Trash2, Check, X } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let addName = $state('');

	let editingId = $state<string | null>(null);
	let editName = $state('');

	function startEdit(c: PageData['cuisines'][0]) {
		editingId = c.id;
		editName = c.name;
	}

	function cancelEdit() {
		editingId = null;
	}
</script>

<svelte:head><title>Kitchie | Cuisines</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Cuisines" back={true} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
		{#if form?.error}
			<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
		{/if}

		<!-- Add cuisine form -->
		<div class="mb-6 rounded-xl bg-white px-4 py-4 shadow-xs">
			<h2 class="mb-3 text-sm font-semibold text-stone-700">Add cuisine</h2>
			<form
				method="POST"
				action="?/add"
				use:enhance={() => async ({ update }) => {
					await update({ reset: false });
					addName = '';
				}}
			>
				<div class="flex items-center gap-2">
					<input
						name="name"
						type="text"
						bind:value={addName}
						placeholder="e.g. Ethiopian"
						required
						autocapitalize="sentences"
						class="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
					/>
					<button
						type="submit"
						disabled={!addName.trim()}
						class="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
					>Add</button>
				</div>
			</form>
		</div>

		<ul class="space-y-2">
			{#each data.cuisines as cuisine (cuisine.id)}
				<li class="rounded-xl bg-white px-4 py-3 shadow-xs">
					{#if editingId === cuisine.id}
						<form
							method="POST"
							action="?/update"
							use:enhance={() => async ({ update }) => {
								await update();
								editingId = null;
							}}
						>
							<input type="hidden" name="id" value={cuisine.id} />
							<div class="flex items-center gap-2">
								<input
									name="name"
									type="text"
									bind:value={editName}
									required
									class="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
								/>
								<button type="submit" aria-label="Save" class="flex h-7 w-7 items-center justify-center rounded-full text-green-600 hover:bg-green-50"><Check class="h-4 w-4" /></button>
								<button type="button" onclick={cancelEdit} aria-label="Cancel" class="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"><X class="h-4 w-4" /></button>
							</div>
						</form>
					{:else}
						<div class="flex items-center gap-3">
							<p class="min-w-0 flex-1 text-sm font-medium text-stone-900">{cuisine.name}</p>
							{#if cuisine.usageCount > 0}
								<span class="shrink-0 text-xs text-stone-400">{cuisine.usageCount} recipe{cuisine.usageCount !== 1 ? 's' : ''}</span>
							{/if}
							<button type="button" onclick={() => startEdit(cuisine)} aria-label="Edit {cuisine.name}" class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600"><Pencil class="h-3.5 w-3.5" /></button>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={cuisine.id} />
								<button
									type="submit"
									aria-label="Delete {cuisine.name}"
									disabled={cuisine.usageCount > 0}
									class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
								><Trash2 class="h-3.5 w-3.5" /></button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</main>
</div>
