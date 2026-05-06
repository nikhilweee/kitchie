<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import PrepTimePicker from '$lib/components/PrepTimePicker.svelte';
	import { RECIPE_COURSE_LABELS, RECIPE_COURSES, type RecipeCourse } from '$lib/recipe-course';
	import { clickOutside } from '$lib/actions/click-outside';
	import { X } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	const recipe = $derived(data.recipe);

	let nameInput = $state(untrack(() => recipe.name));
	let mealTypeInput = $state<RecipeCourse | ''>(untrack(() => (recipe.mealType as RecipeCourse) ?? ''));
	let cuisineInput = $state(untrack(() => recipe.cuisine ?? ''));
	let prepTimeInput = $state<number | null>(untrack(() => recipe.prepTime ?? null));

	type DraftItem = { pantryItemId: string | null; itemName: string; quantity: string };
	let draftItems = $state<DraftItem[]>(
		untrack(() =>
			recipe.items.map((i) => ({
				pantryItemId: i.pantryItemId ?? null,
				itemName: i.itemName,
				quantity: i.quantity ?? ''
			}))
		)
	);
	let ingredientSearch = $state('');

	const ingredientSuggestions = $derived(
		ingredientSearch.length === 0
			? []
			: data.pantryItems.filter(
					(p) =>
						!draftItems.some((d) => d.pantryItemId === p.id) &&
						p.name.toLowerCase().includes(ingredientSearch.toLowerCase())
				)
	);

	const ingredientSearchIsExactMatch = $derived(
		data.pantryItems.some(
			(p) => p.name.toLowerCase() === ingredientSearch.trim().toLowerCase()
		)
	);

	function addIngredient(item: (typeof data.pantryItems)[0]) {
		draftItems = [...draftItems, { pantryItemId: item.id, itemName: item.name, quantity: '' }];
		ingredientSearch = '';
	}

	function addCustomIngredient(name: string) {
		draftItems = [...draftItems, { pantryItemId: null, itemName: name, quantity: '' }];
		ingredientSearch = '';
	}

	function removeIngredient(idx: number) {
		draftItems = draftItems.filter((_, i) => i !== idx);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			history.back();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="delete"]')?.click();
		}
	}
</script>

<svelte:head><title>Kitchie | Edit Recipe</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Edit Recipe" back="/recipes" mainClass="px-4 py-4 pb-36">
	<form
		id="recipe-edit-form"
		method="POST"
		action="/recipes?/save"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto(resolve('/recipes?toast=Recipe+updated'));
			}
		}}
	>
		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
		<input type="hidden" name="id" value={recipe.id} />

		<input
			bind:value={nameInput}
			name="name"
			type="text"
			placeholder="Recipe name"
			autocapitalize="sentences"
			autocomplete="off"
			required
			class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none density-sheet-name"
		/>

		<div class="mt-3 flex gap-3">
			<div class="flex-1">
				<label for="recipe-meal-type" class="mb-1 block text-xs font-medium text-stone-500">Course</label>
				<select
					id="recipe-meal-type"
					name="mealType"
					bind:value={mealTypeInput}
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				>
					<option value="">Any</option>
					{#each RECIPE_COURSES as t (t)}
						<option value={t}>{RECIPE_COURSE_LABELS[t]}</option>
					{/each}
				</select>
			</div>
			<div class="flex-1">
				<label for="recipe-cuisine" class="mb-1 block text-xs font-medium text-stone-500">Cuisine</label>
				<select
					id="recipe-cuisine"
					name="cuisine"
					bind:value={cuisineInput}
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				>
					<option value="">Any</option>
					{#each data.cuisines as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="mt-3">
			<p class="mb-1 text-xs font-medium text-stone-500">Prep time</p>
			<PrepTimePicker bind:value={prepTimeInput} name="prepTime" />
		</div>

		<p class="mt-4 mb-2 text-xs font-medium text-stone-500">Ingredients</p>

		{#if draftItems.length > 0}
			<ul class="mb-3 space-y-2">
				{#each draftItems as item, idx (idx)}
					<li class="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
						<input type="hidden" name="pantryItemId" value={item.pantryItemId ?? ''} />
						<input type="hidden" name="itemName" value={item.itemName} />
						<span class="w-5 shrink-0 text-center text-xs font-medium text-stone-400">{idx + 1}</span>
						<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{item.itemName}</span>
						<input
							type="text"
							name="quantity"
							bind:value={item.quantity}
							placeholder="qty"
							autocomplete="off"
							class="w-16 shrink-0 rounded-lg border border-stone-200 bg-white px-2 py-1 text-center text-sm text-stone-700 placeholder-stone-300 focus:border-orange-400 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => removeIngredient(idx)}
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400"
							aria-label="Remove {item.itemName}"
						><X class="h-3.5 w-3.5" /></button>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="relative" use:clickOutside={() => (ingredientSearch = '')}>
			<input
				type="text"
				bind:value={ingredientSearch}
				placeholder="Search or type an ingredient…"
				autocomplete="off"
				class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none"
			/>
			{#if ingredientSearch.trim()}
				<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each ingredientSuggestions as item (item.id)}
						<li>
							<button
								type="button"
								onclick={() => addIngredient(item)}
								class="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
							>
								{item.name}
							</button>
						</li>
					{/each}
					{#if !ingredientSearchIsExactMatch}
						<li>
							<button
								type="button"
								onclick={() => addCustomIngredient(ingredientSearch.trim())}
								class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50"
							>
								Add "{ingredientSearch.trim()}" as ingredient
							</button>
						</li>
					{/if}
				</ul>
			{/if}
		</div>

		<FormActions
			isEditing={true}
			saveLabel="Save"
			deleteAction="/recipes?/delete"
			disabled={!nameInput.trim()}
			oncancel={() => history.back()}
		/>
	</form>
</PageShell>
