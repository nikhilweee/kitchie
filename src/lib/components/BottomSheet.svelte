<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onclose,
		scrollable = false,
		children
	}: {
		open: boolean;
		onclose: () => void;
		scrollable?: boolean;
		children: Snippet;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 bg-black/40"
		role="button"
		tabindex="-1"
		aria-label="Close"
		onclick={onclose}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	></div>
	<div
		class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-4 pt-3 pb-10 shadow-2xl
			{scrollable ? 'max-h-[85svh] overflow-y-auto' : ''}"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>
		{@render children()}
	</div>
{/if}
