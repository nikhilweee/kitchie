<script lang="ts">
	let { title, back }: { title: string; back?: string } = $props();
</script>

<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
	<div class="mx-auto flex max-w-lg items-center gap-3">
		{#if back}
			<a href={back} aria-label="Go back" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100">←</a>
		{/if}
		<h1 class="text-lg font-bold text-stone-900">{title}</h1>
	</div>
</header>
