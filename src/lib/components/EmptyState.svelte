<script lang="ts">
	import type { Component } from 'svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { icon: Icon, heading, detail }: { icon: Component<any>; heading: string; detail: string } =
		$props();
</script>

<div class="mt-16 text-center text-stone-400">
	<Icon class="mx-auto h-12 w-12" />
	<p class="mt-4 text-base font-medium">{heading}</p>
	<p class="mt-1 text-sm">{detail}</p>
</div>
