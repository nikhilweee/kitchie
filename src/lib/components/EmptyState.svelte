<script lang="ts">
	let { emoji, heading, detail }: { emoji: string; heading: string; detail: string } = $props();
</script>

<div class="mt-16 text-center text-stone-400">
	<p class="text-5xl">{emoji}</p>
	<p class="mt-4 text-base font-medium">{heading}</p>
	<p class="mt-1 text-sm">{detail}</p>
</div>
