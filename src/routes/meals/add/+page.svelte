<script lang="ts">
	import { enhance } from '$app/forms';
	import PageShell from '$lib/components/PageShell.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import { clickOutside } from '$lib/actions/click-outside';
	import { MEAL_TYPE_LABELS, MEAL_TYPES, guessMealType, currentDateTimeStr } from '$lib/meal-type';
	import type { MealType } from '$lib/server/db/schema';

	let mealInput = $state('');
	let mealDateTime = $state(currentDateTimeStr());
	let mealType = $state<MealType>(guessMealType(new Date().getHours()));
	let updatePantryToggle = $state(true);

	interface Suggestion { name: string; type: 'meal' | 'recipe'; recipeId?: string; }
	let suggestions = $state<Suggestion[]>([]);
	let selectedRecipeId = $state<string | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function fetchSuggestions(q: string) {
		const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);
		suggestions = await res.json();
	}

	function onNameInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(mealInput), 200);
	}

	function selectSuggestion(s: Suggestion) {
		mealInput = s.name;
		selectedRecipeId = s.recipeId ?? null;
		suggestions = [];
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			history.back();
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			document.querySelector<HTMLElement>('[data-shortcut="primary"]')?.click();
		}
	}

	// Fetch suggestions on mount so the dropdown is ready immediately
	$effect(() => { fetchSuggestions(''); });
</script>

<svelte:head><title>Kitchie | Log Meal</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<PageShell title="Log Meal" back="/meals" mainClass="px-4 py-4 pb-36">
	<form
		id="meal-add-form"
		method="POST"
		action="/meals?/addMeal"
		use:enhance={() => async ({ update }) => {
			await update();
		}}
	>
		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>

		{#if selectedRecipeId}
			<input type="hidden" name="recipeId" value={selectedRecipeId} />
		{/if}

		<!-- Name with autocomplete -->
		<div class="relative" use:clickOutside={() => (suggestions = [])}>
			<input
				bind:value={mealInput}
				oninput={onNameInput}
				name="name"
				type="text"
				placeholder="What did you eat?"
				autocomplete="off"
				autocapitalize="sentences"
				required
				class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 dark:placeholder-stone-500 focus:border-orange-500 focus:outline-none density-sheet-name"
			/>
			{#if suggestions.length > 0}
				<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
					{#each suggestions as s (s.name)}
						<li>
							<button
								type="button"
								onclick={() => selectSuggestion(s)}
								class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
							>
								<span class="flex-1">{s.name}</span>
								{#if s.type === 'recipe'}
									<span class="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">recipe</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

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

		<!-- Update pantry toggle -->
		<label class="mt-3 flex cursor-pointer items-center gap-3">
			<span class="flex-1 text-sm text-stone-600">Update pantry after logging</span>
			<input type="checkbox" name="updatePantry" value="1" class="sr-only" bind:checked={updatePantryToggle} />
			<div class="relative h-6 w-10 rounded-full transition-colors {updatePantryToggle ? 'bg-orange-500' : 'bg-stone-200'}">
				<div class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform {updatePantryToggle ? 'translate-x-4' : ''}"></div>
			</div>
		</label>

		<FormActions
			isEditing={false}
			saveLabel="Log meal"
			disabled={!mealInput.trim()}
			oncancel={() => history.back()}
		/>
	</form>
</PageShell>
