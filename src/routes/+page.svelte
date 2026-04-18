<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { MEAL_TYPE_LABELS, MEAL_TYPES, guessMealType, currentDateTimeStr } from '$lib/meal-type';
	import { toDateTimeLocalStr } from '$lib/date-format';
	import EstimatePicker from '$lib/components/EstimatePicker.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FormActions from '$lib/components/FormActions.svelte';
	import type { MealType } from '$lib/server/db/schema';
	import { clickOutside } from '$lib/actions/click-outside';

	let { data }: { data: PageData } = $props();

	// ── Sheet mode ────────────────────────────────────────────────────────────
	type Entry = PageData['entries'][0];
	let sheetMode = $state<'add' | 'edit' | null>(null);
	let editingEntry = $state<Entry | null>(null);

	// Shared form fields
	let mealInput = $state('');
	let mealDateTime = $state(currentDateTimeStr());
	let mealType = $state<MealType>('snack');

	// Suggestions (add mode only)
	interface Suggestion { name: string; type: 'meal' | 'recipe'; recipeId?: string; }
	let suggestions = $state<Suggestion[]>([]);
	let selectedRecipeId = $state<string | null>(null);
	let inputEl = $state<HTMLInputElement | undefined>(undefined);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function openAdd() {
		sheetMode = 'add';
		editingEntry = null;
		mealInput = '';
		mealDateTime = currentDateTimeStr();
		mealType = guessMealType(new Date().getHours());
		suggestions = [];
		selectedRecipeId = null;
		fetchSuggestions('');
		setTimeout(() => inputEl?.focus(), 50);
	}

	function openEdit(entry: Entry) {
		sheetMode = 'edit';
		editingEntry = entry;
		mealInput = entry.name;
		mealDateTime = toDateTimeLocalStr(entry.loggedAt);
		mealType = entry.mealType as MealType;
	}

	function closeSheet() {
		sheetMode = null;
		editingEntry = null;
		suggestions = [];
	}

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

	// ── Meal log grouping ────────────────────────────────────────────────────
	function groupByDay(entries: Entry[]) {
		const groups = new Map<string, Entry[]>();
		for (const e of entries) {
			const key = new Date(e.loggedAt).toLocaleDateString('en-US', {
				weekday: 'long', month: 'short', day: 'numeric'
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
		return key === new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	}

	// ── Pantry update sheet (step 2) ─────────────────────────────────────────
	type PantrySelection = {
		pantryItemId: string | null;
		itemName: string;
		quantityType: 'count' | 'estimate';
		newQuantity: number;
	};
	let pantrySelected = $state<PantrySelection[]>([]);
	let pantrySearch = $state('');

	$effect(() => {
		pantrySelected = data.pantrySuggestions
			.filter((s) => s.suggested)
			.map((s) => ({
				pantryItemId: s.item.id,
				itemName: s.item.name,
				quantityType: s.item.quantityType as 'count' | 'estimate',
				newQuantity: s.item.quantity
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

	const pantrySearchIsExactMatch = $derived(
		data.pantrySuggestions.some(
			(s) => s.item.name.toLowerCase() === pantrySearch.trim().toLowerCase()
		)
	);

	function addPantryItem(item: PageData['pantrySuggestions'][0]['item']) {
		pantrySelected = [
			...pantrySelected,
			{ pantryItemId: item.id, itemName: item.name, quantityType: item.quantityType as 'count' | 'estimate', newQuantity: item.quantity }
		];
		pantrySearch = '';
	}

	function addCustomPantryItem(name: string) {
		pantrySelected = [
			...pantrySelected,
			{ pantryItemId: null, itemName: name, quantityType: 'count', newQuantity: 0 }
		];
		pantrySearch = '';
	}

	function removePantryItem(name: string) {
		pantrySelected = pantrySelected.filter((s) => s.itemName !== name);
	}

	function pantryStock(pantryItemId: string | null) {
		if (!pantryItemId) return null;
		return data.pantrySuggestions.find((s) => s.item.id === pantryItemId)?.item ?? null;
	}
</script>

<svelte:head><title>Kitchie</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Kitchie" />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-36">
		{#if data.entries.length === 0}
			<EmptyState emoji="🍽️" heading="No meals logged yet" detail="Tap the button below to log your first meal." />
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

	<AddButton label="Add Meal" onclick={openAdd} />
</div>

<!-- ── Add / Edit meal sheet ─────────────────────────────────────────────── -->
<BottomSheet open={!!sheetMode} onclose={closeSheet}>
	<form
		method="POST"
		action={sheetMode === 'add' ? '?/addMeal' : '?/updateMeal'}
		use:enhance={() => async ({ result, update }) => {
			if (sheetMode === 'edit') {
				await update({ reset: false });
				if (result.type === 'success') closeSheet();
			} else {
				await update();
			}
		}}
	>
		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>

		{#if sheetMode === 'edit' && editingEntry}
			<input type="hidden" name="id" value={editingEntry.id} />
		{/if}
		{#if sheetMode === 'add' && selectedRecipeId}
			<input type="hidden" name="recipeId" value={selectedRecipeId} />
		{/if}

		<!-- Name -->
		<div class="relative" use:clickOutside={() => (suggestions = [])}>
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
						class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
					>
						{#each MEAL_TYPES as t (t)}
							<option value={t}>{MEAL_TYPE_LABELS[t]}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<FormActions
			isEditing={sheetMode === 'edit'}
			saveLabel={sheetMode === 'edit' ? 'Save' : 'Log meal'}
			deleteAction="?/deleteMeal"
			disabled={!mealInput.trim()}
			oncancel={closeSheet}
		/>
	</form>
</BottomSheet>

<!-- ── Pantry update sheet (step 2) ──────────────────────────────────────── -->
<BottomSheet open={!!data.updateMeal} onclose={() => goto('/')}>
	<h2 class="text-base font-semibold text-stone-900">Update pantry</h2>
	<p class="mt-0.5 mb-4 text-sm text-stone-500">
		Set what's left after <span class="font-medium text-stone-700">{data.updateMeal?.name}</span>.
	</p>

	<form method="POST" action="?/updatePantry" use:enhance>
		<input type="hidden" name="mealId" value={data.updateMeal?.id} />

		{#if pantrySelected.length > 0}
			<ul class="mb-3 space-y-2">
				{#each pantrySelected as sel (sel.itemName)}
					{@const stock = pantryStock(sel.pantryItemId)}
					<li class="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5">
						<input type="hidden" name="itemId" value={sel.pantryItemId ?? ''} />
						<input type="hidden" name="itemName" value={sel.itemName} />
						<div class="flex items-center gap-2">
							<div class="min-w-0 flex-1">
								<span class="truncate text-sm font-medium text-stone-800">{sel.itemName}</span>
								{#if stock?.unit && stock.unit !== 'count'}
									<span class="ml-1 text-xs text-stone-400">{stock.unit}</span>
								{/if}
							</div>
							{#if sel.pantryItemId === null}
								<input
									type="number"
									name="newQuantity"
									bind:value={sel.newQuantity}
									min="0"
									step="0.5"
									placeholder="0"
									class="w-16 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm text-stone-700 focus:border-orange-500 focus:outline-none"
								/>
							{:else if sel.quantityType === 'count'}
								<div class="flex items-center gap-1">
									<button
										type="button"
										onclick={() => (sel.newQuantity = Math.max(0, sel.newQuantity - 1))}
										class="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100"
									>−</button>
									<span class="w-8 text-center text-sm font-medium text-stone-800">{sel.newQuantity}</span>
									<button
										type="button"
										onclick={() => sel.newQuantity++}
										class="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100"
									>+</button>
								</div>
								<input type="hidden" name="newQuantity" value={sel.newQuantity} />
							{:else}
								<EstimatePicker bind:value={sel.newQuantity} name="newQuantity" />
							{/if}
							<button
								type="button"
								onclick={() => removePantryItem(sel.itemName)}
								class="shrink-0 text-stone-300 hover:text-red-400"
								aria-label="Remove {sel.itemName}"
							>✕</button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mb-3 text-sm text-stone-400">No ingredients added yet.</p>
		{/if}

		<div class="relative" use:clickOutside={() => (pantrySearch = '')}>
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
							>{item.name}</button>
						</li>
					{/each}
					{#if !pantrySearchIsExactMatch}
						<li>
							<button
								type="button"
								onclick={() => addCustomPantryItem(pantrySearch.trim())}
								class="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50"
							>Add "{pantrySearch.trim()}" as ingredient</button>
						</li>
					{/if}
				</ul>
			{/if}
		</div>

		<div class="mt-4 flex gap-2">
			<a href="/" class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50">Skip</a>
			<button type="submit" class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600">Update pantry</button>
		</div>
	</form>
</BottomSheet>

<!-- ── Save as recipe sheet (step 3, optional) ───────────────────────────── -->
<BottomSheet open={!!data.saveRecipeMeal} onclose={() => goto('/')}>
	<h2 class="text-base font-semibold text-stone-900">Save as recipe?</h2>
	<p class="mt-0.5 mb-3 text-sm text-stone-500">
		Save the ingredients you just used for <span class="font-medium text-stone-700">{data.saveRecipeMeal?.name}</span> as a recipe for next time.
	</p>
	{#if data.saveRecipeMeal && data.saveRecipeMeal.ingredients.length > 0}
		<ul class="mb-4 space-y-1">
			{#each data.saveRecipeMeal.ingredients as ing (ing)}
				<li class="text-sm text-stone-700">· {ing}</li>
			{/each}
		</ul>
	{/if}
	<div class="flex gap-2">
		<a href="/" class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50">Skip</a>
		<form method="POST" action="?/saveRecipe" use:enhance class="flex-1">
			<input type="hidden" name="mealId" value={data.saveRecipeMeal?.id} />
			<button type="submit" class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600">Save recipe</button>
		</form>
	</div>
</BottomSheet>
