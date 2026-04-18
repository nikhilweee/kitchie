<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { MEAL_TYPE_LABELS, MEAL_TYPES, guessMealType, currentDateTimeStr } from '$lib/meal-type';
	import { ESTIMATE_OPTIONS } from '$lib/quantity';
	import type { MealType } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	// ── Sheet mode ────────────────────────────────────────────────────────────
	type Entry = PageData['entries'][0];
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingEntry = $state<Entry | null>(null);

	// Shared form fields
	let mealInput = $state('');
	let mealDateTime = $state(currentDateTimeStr());
	let mealType = $state<MealType>('snack');
	let mealTypeLocked = $state(false);

	// Suggestions (add mode only)
	interface Suggestion { name: string; type: 'meal' | 'recipe'; recipeId?: string; }
	let suggestions = $state<Suggestion[]>([]);
	let selectedRecipeId = $state<string | null>(null); // set when user picks a recipe suggestion
	let loadingSuggestions = $state(false);
	let inputEl = $state<HTMLInputElement | undefined>(undefined);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function openAdd() {
		sheetMode = 'add';
		editingEntry = null;
		mealInput = '';
		mealDateTime = currentDateTimeStr();
		mealType = guessMealType(new Date().getHours());
		mealTypeLocked = false;
		suggestions = [];
		selectedRecipeId = null;
		fetchSuggestions('');
		setTimeout(() => inputEl?.focus(), 50);
	}

	function openEdit(entry: Entry) {
		sheetMode = 'edit';
		editingEntry = entry;
		mealInput = entry.name;
		mealDateTime = entry.loggedAt.slice(0, 16); // "YYYY-MM-DDTHH:MM"
		mealType = entry.mealType as MealType;
		mealTypeLocked = true;
	}

	function closeSheet() {
		sheetMode = null;
		editingEntry = null;
		suggestions = [];
	}

	async function fetchSuggestions(q: string) {
		loadingSuggestions = true;
		const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);
		suggestions = await res.json();
		loadingSuggestions = false;
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

	// ── Meal log grouping ────────────────────────────────────────────────────
	function groupByDay(entries: Entry[]) {
		const groups = new Map<string, Entry[]>();
		for (const e of entries) {
			const key = new Date(e.loggedAt).toLocaleDateString('en-US', {
				weekday: 'long',
				month: 'short',
				day: 'numeric'
			});
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(e);
		}
		return groups;
	}

	const grouped = $derived(groupByDay(data.entries));

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function isToday(key: string) {
		return (
			key ===
			new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
		);
	}

	// ── Pantry update sheet (step 2) ─────────────────────────────────────────
	type PantrySelection = {
		pantryItemId: string | null;
		itemName: string;
		quantityType: 'count' | 'estimate';
		quantityUsed: number;
	};
	let pantrySelected = $state<PantrySelection[]>([]);
	let pantrySearch = $state('');

	$effect(() => {
		// Pre-populate with keyword/recipe-matched items when the sheet opens
		pantrySelected = data.pantrySuggestions
			.filter((s) => s.suggested)
			.map((s) => ({
				pantryItemId: s.item.id,
				itemName: s.item.name,
				quantityType: s.item.quantityType as 'count' | 'estimate',
				quantityUsed: 1
			}));
	});

	const pantryFiltered = $derived(
		pantrySearch.length === 0
			? []
			: data.pantrySuggestions
					.filter((s) => !pantrySelected.some((sel) => sel.pantryItemId === s.item.id))
					.filter((s) => s.item.name.toLowerCase().includes(pantrySearch.toLowerCase()))
					.map((s) => s.item)
	);

	// Whether the current search text is an exact (case-insensitive) match of an existing pantry item
	const pantrySearchIsExactMatch = $derived(
		data.pantrySuggestions.some(
			(s) => s.item.name.toLowerCase() === pantrySearch.trim().toLowerCase()
		)
	);

	function addPantryItem(item: PageData['pantrySuggestions'][0]['item']) {
		pantrySelected = [
			...pantrySelected,
			{
				pantryItemId: item.id,
				itemName: item.name,
				quantityType: item.quantityType as 'count' | 'estimate',
				quantityUsed: 1
			}
		];
		pantrySearch = '';
	}

	function addCustomPantryItem(name: string) {
		pantrySelected = [
			...pantrySelected,
			{ pantryItemId: null, itemName: name, quantityType: 'count', quantityUsed: 1 }
		];
		pantrySearch = '';
	}

	function removePantryItem(name: string) {
		pantrySelected = pantrySelected.filter((s) => s.itemName !== name);
	}
</script>

<svelte:head><title>Kitchie</title></svelte:head>

<!-- Backdrop -->
{#if sheetMode || data.updateMeal || data.saveRecipeMeal}
	<div
		class="fixed inset-0 z-40 bg-black/40"
		role="button"
		tabindex="-1"
		aria-label="Close"
		onclick={() => { closeSheet(); if (data.updateMeal || data.saveRecipeMeal) goto('/'); }}
		onkeydown={(e) => e.key === 'Escape' && (closeSheet(), (data.updateMeal || data.saveRecipeMeal) && goto('/'))}
	></div>
{/if}

<div class="flex min-h-svh flex-col bg-stone-50">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
		<div class="mx-auto max-w-lg">
			<h1 class="text-lg font-bold text-stone-900">Kitchie</h1>
		</div>
	</header>

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if data.entries.length === 0}
			<div class="mt-16 text-center text-stone-400">
				<p class="text-5xl">🍽️</p>
				<p class="mt-4 text-base font-medium">No meals logged yet</p>
				<p class="mt-1 text-sm">Tap the button below to log your first meal.</p>
			</div>
		{:else}
			{#each grouped as [day, entries] (day)}
				<section class="mb-6">
					<h2 class="mb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">
						{isToday(day) ? 'Today' : day}
					</h2>
					<ul class="space-y-2">
						{#each entries as entry (entry.id)}
							<li class="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs">
								<button
									type="button"
									onclick={() => openEdit(entry)}
									class="min-w-0 flex-1 text-left"
								>
									<p class="truncate font-medium text-stone-900">{entry.name}</p>
									<p class="text-xs text-stone-400">
										{MEAL_TYPE_LABELS[entry.mealType as MealType]}
										{#if entry.ingredients.length > 0}
											· {entry.ingredients.join(', ')}
										{/if}
									</p>
								</button>
								<span class="shrink-0 text-xs text-stone-400">{formatTime(entry.loggedAt)}</span>
								<form method="POST" action="?/deleteMeal" use:enhance>
									<input type="hidden" name="id" value={entry.id} />
									<button type="submit" aria-label="Delete {entry.name}" class="shrink-0 text-stone-300 hover:text-red-400">✕</button>
								</form>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
	</main>

	<div class="fixed bottom-14 left-0 right-0 z-30 flex justify-center px-4 pb-2">
		<button
			onclick={openAdd}
			class="flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95"
		>
			<span class="text-xl leading-none">+</span> Add Meal
		</button>
	</div>
</div>

<!-- ── Add / Edit meal sheet ─────────────────────────────────────────────── -->
{#if sheetMode}
	<div
		class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-4 pt-3 pb-8 shadow-2xl"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>

		<form
			method="POST"
			action={sheetMode === 'add' ? '?/addMeal' : '?/updateMeal'}
			use:enhance={() => async ({ result, update }) => {
				if (sheetMode === 'edit') {
					await update({ reset: false });
					if (result.type === 'success') closeSheet();
				} else {
					await update(); // follows the 302 redirect to /?update=<id>
				}
			}}
		>
			<!-- Hidden default submit so Enter triggers save, not delete -->
			<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>

			{#if sheetMode === 'edit' && editingEntry}
				<input type="hidden" name="id" value={editingEntry.id} />
			{/if}
			{#if sheetMode === 'add' && selectedRecipeId}
				<input type="hidden" name="recipeId" value={selectedRecipeId} />
			{/if}

			<!-- Name -->
			<div class="relative">
				<input
					bind:this={inputEl}
					bind:value={mealInput}
					oninput={onNameInput}
					name="name"
					type="text"
					placeholder="What did you eat?"
					autocomplete="off"
					autocapitalize="sentences"
					required
					class="block w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
				/>
				<!-- Suggestions dropdown (add mode only) — absolute so layout stays stable -->
				{#if sheetMode === 'add' && suggestions.length > 0}
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
							name="datetime"
							type="datetime-local"
							bind:value={mealDateTime}
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="meal-type" class="mb-1 block text-xs font-medium text-stone-500">Meal type</label>
						<select
							id="meal-type"
							name="mealType"
							bind:value={mealType}
							onchange={() => (mealTypeLocked = true)}
							class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
						>
							{#each MEAL_TYPES as t (t)}
								<option value={t}>{MEAL_TYPE_LABELS[t]}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<div class="mt-4 flex gap-2">
				{#if sheetMode === 'edit'}
					<button
						type="submit"
						formaction="?/deleteMeal"
						class="flex-1 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
					>
						Delete
					</button>
				{:else}
					<button
						type="button"
						onclick={closeSheet}
						class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600"
					>
						Cancel
					</button>
				{/if}
				<button
					type="submit"
					disabled={!mealInput.trim()}
					class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
				>
					{sheetMode === 'edit' ? 'Save' : 'Log meal'}
				</button>
			</div>
		</form>
	</div>
{/if}

<!-- ── Pantry update sheet (step 2) ──────────────────────────────────────── -->
{#if data.updateMeal}
	<div
		class="fixed inset-x-0 bottom-0 z-50 max-h-[80svh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-8 shadow-2xl"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>

		<h2 class="text-base font-semibold text-stone-900">Update pantry</h2>
		<p class="mt-0.5 mb-4 text-sm text-stone-500">
			What did you use for <span class="font-medium text-stone-700">{data.updateMeal.name}</span>?
		</p>

		<form method="POST" action="?/updatePantry" use:enhance>
			<input type="hidden" name="mealId" value={data.updateMeal.id} />

			<!-- Selected ingredients -->
			{#if pantrySelected.length > 0}
				<ul class="mb-3 space-y-2">
					{#each pantrySelected as sel (sel.itemName)}
						<li class="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
							<input type="hidden" name="itemId" value={sel.pantryItemId ?? ''} />
							<input type="hidden" name="itemName" value={sel.itemName} />
							<span class="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{sel.itemName}</span>
							{#if sel.quantityType === 'count'}
								<input
									type="number"
									name="quantityUsed"
									bind:value={sel.quantityUsed}
									min="0.5"
									step="0.5"
									class="w-16 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm text-stone-700 focus:border-orange-500 focus:outline-none"
								/>
							{:else}
								<input type="hidden" name="quantityUsed" value={sel.quantityUsed} />
								<div class="flex gap-1">
									{#each ESTIMATE_OPTIONS as opt (opt.value)}
										<button
											type="button"
											onclick={() => (sel.quantityUsed = opt.value)}
											class="rounded-lg border px-2 py-1 text-xs font-medium transition-colors {sel.quantityUsed === opt.value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}"
										>{opt.label}</button>
									{/each}
								</div>
							{/if}
							<button
								type="button"
								onclick={() => removePantryItem(sel.itemName)}
								class="shrink-0 text-stone-300 hover:text-red-400"
								aria-label="Remove {sel.itemName}"
							>✕</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mb-3 text-sm text-stone-400">No ingredients added yet.</p>
			{/if}

			<!-- Search to add more (always shown) -->
			<div class="relative">
				<input
					type="text"
					bind:value={pantrySearch}
					placeholder="Search or type an ingredient…"
					autocomplete="off"
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
				/>
				{#if pantrySearch.trim()}
					<ul class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
						{#each pantryFiltered as item (item.id)}
							<li>
								<button
									type="button"
									onclick={() => addPantryItem(item)}
									class="w-full px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
								>
									{item.name}
								</button>
							</li>
						{/each}
						{#if !pantrySearchIsExactMatch}
							<li>
								<button
									type="button"
									onclick={() => addCustomPantryItem(pantrySearch.trim())}
									class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50"
								>
									Add "{pantrySearch.trim()}" as ingredient
								</button>
							</li>
						{/if}
					</ul>
				{/if}
			</div>
			<div class="mt-4 flex gap-2">
				<a href="/" class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50">
					Skip
				</a>
				<button type="submit" class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600">
					Update pantry
				</button>
			</div>
		</form>
	</div>
{/if}

<!-- ── Save as recipe sheet (step 3, optional) ───────────────────────────── -->
{#if data.saveRecipeMeal}
	<div
		class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-4 pt-3 pb-8 shadow-2xl"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>
		<h2 class="text-base font-semibold text-stone-900">Save as recipe?</h2>
		<p class="mt-0.5 mb-3 text-sm text-stone-500">
			Save the ingredients you just used for <span class="font-medium text-stone-700">{data.saveRecipeMeal.name}</span> as a recipe for next time.
		</p>
		{#if data.saveRecipeMeal.ingredients.length > 0}
			<ul class="mb-4 space-y-1">
				{#each data.saveRecipeMeal.ingredients as ing (ing)}
					<li class="text-sm text-stone-700">· {ing}</li>
				{/each}
			</ul>
		{/if}
		<div class="flex gap-2">
			<a href="/" class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50">
				Skip
			</a>
			<form method="POST" action="?/saveRecipe" use:enhance class="flex-1">
				<input type="hidden" name="mealId" value={data.saveRecipeMeal.id} />
				<button type="submit" class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600">
					Save recipe
				</button>
			</form>
		</div>
	</div>
{/if}
