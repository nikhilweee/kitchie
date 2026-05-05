<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus } from 'lucide-svelte';

	let { label, onclick }: { label: string; onclick: () => void } = $props();

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'n' && e.key !== 'N') return;
		const active = document.activeElement;
		if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
		e.preventDefault();
		onclick();
	}

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

<svelte:window onkeydown={onKeydown} />

<div
	class="fixed left-0 right-0 z-10 flex justify-center px-4 pb-2 transition-transform duration-200 {hidden
		? 'translate-y-28'
		: ''}"
	style="bottom: calc(3.5rem + env(safe-area-inset-bottom))"
>
	<button
		{onclick}
		class="flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95 density-fab"
	>
		<Plus class="h-5 w-5" />
		{label}
	</button>
</div>
