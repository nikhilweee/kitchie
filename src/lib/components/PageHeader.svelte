<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ChevronLeft, Menu } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let { title, back, onhamburger, actions }: { title: string; back?: string | true; onhamburger?: () => void; actions?: Snippet } = $props();

	function initials(user: { name: string | null; username: string }) {
		const src = user.name ?? user.username;
		return src
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
	<div class="relative mx-auto flex max-w-lg items-center">
		<!-- Left: back button or spacer -->
		<div class="w-8 shrink-0">
			{#if back === true}
				<button type="button" onclick={() => history.back()} aria-label="Go back" class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 dark:bg-stone-200 dark:text-stone-700 dark:hover:bg-stone-300"><ChevronLeft class="h-4 w-4" /></button>
			{:else if back}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={back} aria-label="Go back" class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 dark:bg-stone-200 dark:text-stone-700 dark:hover:bg-stone-300"><ChevronLeft class="h-4 w-4" /></a>
			{:else if onhamburger}
				<button type="button" onclick={onhamburger} aria-label="Open menu" class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 dark:bg-stone-200 dark:text-stone-700 dark:hover:bg-stone-300"><Menu class="h-5 w-5" /></button>
			{/if}
		</div>

		<!-- Title: absolutely centered within the container -->
		<h1 class="flex-1 text-center text-lg font-bold text-stone-900">{title}</h1>

		<!-- Right: actions or avatar -->
		<div class="min-w-8 shrink-0 flex items-center justify-end gap-2">
			{#if actions}
				{@render actions()}
			{/if}
			{#if page.data.user}
				<a
					href={resolve('/profile')}
					class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600 shadow-sm hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800"
					aria-label="Profile"
				>
					{initials(page.data.user)}
				</a>
			{/if}
		</div>
	</div>
</header>
