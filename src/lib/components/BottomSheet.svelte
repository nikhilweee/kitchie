<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onclose,
		children
	}: {
		open: boolean;
		onclose: () => void;
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
			<div class="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200"></div>
			{@render children()}
		</div>
	</div>
{/if}
