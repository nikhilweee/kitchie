<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onclose,
		onback,
		children
	}: {
		open: boolean;
		onclose: () => void;
		onback?: () => void;
		children: Snippet;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 overflow-y-auto bg-white px-4 pt-3 pb-10"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	>
		<div class="mx-auto max-w-lg">
			<!-- Header: back button left, handle center, close button right -->
			<div class="mb-4 flex items-center justify-between">
				{#if onback}
					<button
						type="button"
						onclick={onback}
						aria-label="Go back"
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
					>&lt;</button>
				{:else}
					<div class="w-8 shrink-0"></div>
				{/if}
				<div class="h-1 w-10 rounded-full bg-stone-200"></div>
				<button
					type="button"
					onclick={onclose}
					aria-label="Close"
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
				>✕</button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}
