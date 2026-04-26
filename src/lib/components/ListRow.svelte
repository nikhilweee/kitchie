<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		draggable,
		ondragstart,
		ondragover,
		ondrop,
		ondragend,
		faded = false,
		class: extra = '',
		children
	}: {
		draggable?: boolean;
		ondragstart?: (e: DragEvent) => void;
		ondragover?: (e: DragEvent) => void;
		ondrop?: (e: DragEvent) => void;
		ondragend?: (e: DragEvent) => void;
		faded?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<li
	class="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs density-li transition-opacity {faded ? 'opacity-40' : ''} {extra}"
	{draggable}
	{ondragstart}
	{ondragover}
	{ondrop}
	{ondragend}
>
	{@render children()}
</li>
