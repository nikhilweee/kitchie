<script lang="ts">
	import { onMount } from 'svelte';

	let { label, onclick }: { label: string; onclick: () => void } = $props();

	let hidden = $state(false);
	let lastY = 0;

	onMount(() => {
		function onScroll() {
			const y = window.scrollY;
			if (y > lastY + 4) {
				hidden = true;
			} else if (y < lastY - 4) {
				hidden = false;
			}
			lastY = y;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<div
	class="fixed bottom-14 left-0 right-0 z-10 flex justify-center px-4 pb-2 transition-transform duration-200 {hidden
		? 'translate-y-28'
		: ''}"
>
	<button
		{onclick}
		class="flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95"
	>
		<span class="text-xl leading-none">+</span>
		{label}
	</button>
</div>
