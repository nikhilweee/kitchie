<script lang="ts">
	let { title }: { title: string } = $props();
</script>

<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
	<div class="mx-auto max-w-lg">
		<h1 class="text-lg font-bold text-stone-900">{title}</h1>
	</div>
</header>
