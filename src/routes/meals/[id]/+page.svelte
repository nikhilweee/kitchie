<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import PageShell from '$lib/components/PageShell.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import { MEAL_TYPE_LABELS, MEAL_TYPES } from '$lib/meal-type';
	import { toDateTimeLocalStr as dtStr } from '$lib/date-format';
	import type { MealType } from '$lib/server/db/schema';
	import { ChefHat, ChevronRight } from 'lucide-svelte';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// $state fields initialised once; this page is never navigated between two
	// different meal IDs, so capturing the initial value is intentional.
	let mealInput = $state(untrack(() => data.entry.name));
	let mealDateTime = $state(untrack(() => dtStr(data.entry.loggedAt)));
	let mealType = $state<MealType>(untrack(() => data.entry.mealType as MealType));

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

<svelte:head><title>Kitchie | Edit Meal</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Edit Meal" back="/meals" mainClass="px-4 py-4 pb-36">
	<form
		id="meal-edit-form"
		method="POST"
		action="/meals?/updateMeal"
		use:enhance={() => async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				goto(resolve('/meals?toast=Meal+updated'));
			}
		}}
	>
		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
		<input type="hidden" name="id" value={data.entry.id} />

		<!-- Name (no autocomplete in edit mode) -->
		<input
			bind:value={mealInput}
			name="name"
			type="text"
			placeholder="What did you eat?"
			autocomplete="off"
			autocapitalize="sentences"
			required
			class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none density-sheet-name"
		/>

		<!-- Date/time + Meal type -->
		<div class="mt-3 space-y-2">
			<div class="grid grid-cols-2 gap-2">
				<div>
					<label for="meal-datetime" class="mb-1 block text-xs font-medium text-stone-500">Date & time</label>
					<input
						id="meal-datetime"
						type="datetime-local"
						bind:value={mealDateTime}
						class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
					/>
					<input type="hidden" name="datetime" value={mealDateTime ? new Date(mealDateTime).toISOString() : ''} />
				</div>
				<div>
					<label for="meal-type" class="mb-1 block text-xs font-medium text-stone-500">Meal type</label>
					<select
						id="meal-type"
						name="mealType"
						bind:value={mealType}
						class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
					>
						{#each MEAL_TYPES as t (t)}
							<option value={t}>{MEAL_TYPE_LABELS[t]}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		{#if data.entry.recipeId}
			<a href={resolve('/recipes/[id]', { id: data.entry.recipeId })}
				class="mt-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:bg-stone-50">
				<ChefHat class="h-4 w-4 shrink-0 text-stone-400" />
				<span class="flex-1 text-sm font-medium text-stone-700">Recipe</span>
				<span class="max-w-[40%] truncate text-sm text-stone-400">{data.entry.name}</span>
				<ChevronRight class="h-4 w-4 shrink-0 text-stone-300" />
			</a>
		{/if}

		<FormActions
			isEditing={true}
			saveLabel="Save"
			deleteAction="/meals?/deleteMeal"
			disabled={!mealInput.trim()}
			oncancel={() => history.back()}
		/>
	</form>
</PageShell>
