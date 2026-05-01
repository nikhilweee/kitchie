<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import { display } from '$lib/display.svelte';
	import { theme } from '$lib/theme.svelte';
</script>

<svelte:head><title>Kitchie | Display</title></svelte:head>

<PageShell title="Display" mainClass="px-4 py-6 space-y-6">
	<div>
		<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Density</p>
		<div class="flex overflow-hidden rounded-xl border border-stone-200 bg-white text-sm font-medium shadow-xs">
			<button
				type="button"
				onclick={() => (display.value = 'comfortable')}
				class="flex-1 py-3 transition-colors {display.value === 'comfortable' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
			>Comfortable</button>
			<button
				type="button"
				onclick={() => (display.value = 'slim')}
				class="flex-1 py-3 transition-colors {display.value === 'slim' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
			>Slim</button>
		</div>
		<p class="mt-2 text-xs text-stone-400">
			Slim hides secondary labels and tightens list item spacing.
		</p>
	</div>

	<div>
		<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Theme</p>
		<div class="flex overflow-hidden rounded-xl border border-stone-200 bg-white text-sm font-medium shadow-xs">
			<button
				type="button"
				onclick={() => (theme.value = 'light')}
				class="flex-1 py-3 transition-colors {theme.value === 'light' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
			>Light</button>
			<button
				type="button"
				onclick={() => (theme.value = 'dark')}
				class="flex-1 py-3 transition-colors {theme.value === 'dark' ? 'bg-stone-800 text-white dark:bg-stone-500 dark:text-stone-950' : 'text-stone-500 hover:bg-stone-100 dark:text-stone-300'}"
			>Dark</button>
		</div>
	</div>
</PageShell>
