<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Add Meal sheet ───────────────────────────────────────────────────────
	let showAddMeal = $state(false);
	let mealInput = $state('');
	let suggestions = $state<string[]>([]);
	let loadingSuggestions = $state(false);

	// Open sheet and immediately fetch proactive suggestions
	async function openAddMeal() {
		showAddMeal = true;
		mealInput = '';
		await fetchSuggestions('');
		setTimeout(() => inputEl?.focus(), 50);
	}

	function closeAddMeal() {
		showAddMeal = false;
		mealInput = '';
		suggestions = [];
	}

	let inputEl = $state<HTMLInputElement | undefined>(undefined);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function fetchSuggestions(q: string) {
		loadingSuggestions = true;
		const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}`);
		suggestions = await res.json();
		loadingSuggestions = false;
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(mealInput), 200);
	}

	function selectSuggestion(name: string) {
		mealInput = name;
		suggestions = [];
	}

	// ── Meal log grouping ────────────────────────────────────────────────────
	type Entry = PageData['entries'][0];

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
			new Date().toLocaleDateString('en-US', {
				weekday: 'long',
				month: 'short',
				day: 'numeric'
			})
		);
	}

	// ── Pantry update sheet (step 2) ─────────────────────────────────────────
	let pantrySelections = $state<Record<string, boolean>>({});

	$effect(() => {
		if (data.pantrySuggestions.length > 0) {
			pantrySelections = Object.fromEntries(
				data.pantrySuggestions.map((s) => [s.item.id, s.suggested])
			);
		}
	});
</script>

<svelte:head>
	<title>Kitchie</title>
</svelte:head>

<!-- ── Backdrop ──────────────────────────────────────────────────────────── -->
{#if showAddMeal || data.updateMeal}
	<div
		class="fixed inset-0 z-40 bg-black/40"
		role="button"
		tabindex="-1"
		aria-label="Close"
		onclick={() => {
			closeAddMeal();
			if (data.updateMeal) goto('/');
		}}
		onkeydown={(e) => e.key === 'Escape' && (closeAddMeal(), data.updateMeal && goto('/'))}
	></div>
{/if}

<!-- ── App shell ──────────────────────────────────────────────────────────── -->
<div class="flex min-h-svh flex-col bg-stone-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
		<div class="mx-auto flex max-w-lg items-center justify-between">
			<h1 class="text-lg font-bold text-stone-900">Kitchie</h1>
			<span class="text-sm text-stone-400">{data.user?.username}</span>
		</div>
	</header>

	<!-- Meal log -->
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
								<div class="flex-1">
									<p class="font-medium text-stone-900">{entry.name}</p>
									{#if entry.ingredients.length > 0}
										<p class="mt-0.5 text-xs text-stone-400">
											{entry.ingredients.join(', ')}
										</p>
									{/if}
								</div>
								<span class="shrink-0 text-xs text-stone-400">{formatTime(entry.loggedAt)}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
	</main>

	<!-- Add Meal FAB -->
	<div class="fixed bottom-14 left-0 right-0 z-30 flex justify-center px-4 pb-2">
		<button
			onclick={openAddMeal}
			class="flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95"
		>
			<span class="text-xl leading-none">+</span> Add Meal
		</button>
	</div>
</div>

<!-- ── Add Meal sheet ─────────────────────────────────────────────────────── -->
{#if showAddMeal}
	<div
		class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-4 pt-3 pb-8 shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-label="Add meal"
	>
		<!-- Handle -->
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>

		<h2 class="mb-3 text-base font-semibold text-stone-900">What did you eat?</h2>

		<form
			method="POST"
			action="?/addMeal"
			use:enhance
		>
			<input
				bind:this={inputEl}
				bind:value={mealInput}
				oninput={onInput}
				name="name"
				type="text"
				placeholder="e.g. Avocado toast"
				autocomplete="off"
				autocapitalize="sentences"
				class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
			/>

			<!-- Suggestions -->
			{#if suggestions.length > 0}
				<ul class="mt-2 space-y-1">
					{#each suggestions as s (s)}
						<li>
							<button
								type="button"
								onclick={() => selectSuggestion(s)}
								class="w-full rounded-lg px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 active:bg-stone-200"
							>
								{s}
							</button>
						</li>
					{/each}
				</ul>
			{:else if mealInput.length > 0 && !loadingSuggestions}
				<p class="mt-2 px-1 text-xs text-stone-400">No past matches — will save as new meal.</p>
			{/if}

			<div class="mt-4 flex gap-2">
				<button
					type="button"
					onclick={closeAddMeal}
					class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!mealInput.trim()}
					class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
				>
					Log meal
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
		aria-label="Update pantry"
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>

		<h2 class="text-base font-semibold text-stone-900">Update pantry</h2>
		<p class="mt-0.5 mb-4 text-sm text-stone-500">
			What did you use for <span class="font-medium text-stone-700">{data.updateMeal.name}</span>?
		</p>

		{#if data.pantrySuggestions.length === 0}
			<p class="py-6 text-center text-sm text-stone-400">
				Your pantry is empty — add items first.
			</p>
			<a
				href="/"
				class="block w-full rounded-xl bg-stone-100 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-200"
			>
				Skip for now
			</a>
		{:else}
			<form method="POST" action="?/updatePantry" use:enhance>
				<input type="hidden" name="mealId" value={data.updateMeal.id} />

				<ul class="space-y-2">
					{#each data.pantrySuggestions as { item, suggested } (item.id)}
						<li class="flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3">
							<input
								type="checkbox"
								name="itemId"
								value={item.id}
								checked={pantrySelections[item.id] ?? suggested}
								onchange={(e) => {
									pantrySelections[item.id] = e.currentTarget.checked;
								}}
								class="h-5 w-5 rounded border-stone-300 text-orange-500 focus:ring-orange-500/30"
							/>
							<span class="flex-1 text-sm font-medium text-stone-800">{item.name}</span>
							<input
								type="number"
								name="quantityUsed"
								value="1"
								min="0.1"
								step="0.5"
								class="w-16 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm text-stone-700 focus:border-orange-500 focus:outline-none"
							/>
						</li>
					{/each}
				</ul>

				<div class="mt-4 flex gap-2">
					<a
						href="/"
						class="flex-1 rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-50"
					>
						Skip
					</a>
					<button
						type="submit"
						class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
					>
						Update pantry
					</button>
				</div>
			</form>
		{/if}
	</div>
{/if}
