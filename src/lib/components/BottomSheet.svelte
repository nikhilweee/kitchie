<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronLeft, X } from 'lucide-svelte';

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

<svelte:window onkeydown={(e) => {
	if (!open) return;
	const meta = e.metaKey || e.ctrlKey;
	const active = document.activeElement as HTMLElement | null;
	const inputFocused = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');

	if (e.key === 'Escape') {
		if (inputFocused) { active.blur(); e.preventDefault(); }
		else { onclose(); }
		return;
	}

	if (meta && e.key === 'Enter') {
		e.preventDefault();
		document.querySelector<HTMLElement>('[role="dialog"] [data-shortcut="primary"]')?.click();
		return;
	}

	if (meta && (e.key === 'Delete' || e.key === 'Backspace')) {
		e.preventDefault();
		document.querySelector<HTMLElement>('[role="dialog"] [data-shortcut="delete"]')?.click();
	}
}} />

{#if open}
	<div
		class="fixed inset-0 z-50 overflow-y-auto bg-white px-4 pt-3 pb-10"
		role="dialog"
		aria-modal="true"
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
					><ChevronLeft class="h-4 w-4" /></button>
				{:else}
					<div class="w-8 shrink-0"></div>
				{/if}
				<div class="h-1 w-10 rounded-full bg-stone-200"></div>
				<button
					type="button"
					onclick={onclose}
					aria-label="Close"
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
				><X class="h-4 w-4" /></button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}
