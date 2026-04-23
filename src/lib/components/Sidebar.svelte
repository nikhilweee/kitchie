<script lang="ts">
	import { Tag, UtensilsCrossed, Clipboard, ClipboardCheck, SlidersHorizontal } from 'lucide-svelte';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	let copied = $state(false);

	async function copyPantry() {
		const res = await fetch('/api/pantry-export');
		if (!res.ok) return;
		await navigator.clipboard.writeText(await res.text());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if open}
	<!-- Overlay -->
	<button
		type="button"
		class="fixed inset-0 z-50 bg-black/40"
		aria-label="Close menu"
		onclick={onclose}
	></button>

	<!-- Panel -->
	<div
		class="fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col bg-white shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-label="Menu"
	>
		<div class="border-b border-stone-100 px-5 py-3">
			<p class="flex h-8 items-center text-lg font-bold text-stone-900">Kitchie</p>
		</div>

		<nav class="flex-1 px-3 py-3">
			<p class="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Settings</p>
			<a
				href="/settings/categories"
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
			>
				<Tag class="h-4 w-4 text-stone-400" />
				Categories
			</a>
			<a
				href="/settings/cuisines"
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
			>
				<UtensilsCrossed class="h-4 w-4 text-stone-400" />
				Cuisines
			</a>
			<a
				href="/settings/display"
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
			>
				<SlidersHorizontal class="h-4 w-4 text-stone-400" />
				Display
			</a>
			<p class="mt-3 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Tools</p>
			<button
				type="button"
				onclick={copyPantry}
				class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
			>
				{#if copied}
					<ClipboardCheck class="h-4 w-4 text-green-500" />
					<span class="text-green-600">Copied!</span>
				{:else}
					<Clipboard class="h-4 w-4 text-stone-400" />
					Copy Pantry Items
				{/if}
			</button>
		</nav>
	</div>
{/if}
