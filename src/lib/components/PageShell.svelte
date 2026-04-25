<script lang="ts">
	import type { Snippet } from 'svelte';
	import PageHeader from './PageHeader.svelte';
	import Sidebar from './Sidebar.svelte';

	let {
		title,
		back,
		mainClass = 'px-4 py-4',
		actions,
		children
	}: {
		title: string;
		back?: string | true;
		mainClass?: string;
		actions?: Snippet;
		children: Snippet;
	} = $props();

	let sidebarOpen = $state(false);
</script>

{#if !back}
	<Sidebar open={sidebarOpen} onclose={() => (sidebarOpen = false)} />
{/if}

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader
		{title}
		{back}
		{actions}
		onhamburger={back ? undefined : () => (sidebarOpen = true)}
	/>
	<main class="mx-auto w-full max-w-lg flex-1 {mainClass}">
		{@render children()}
	</main>
</div>
