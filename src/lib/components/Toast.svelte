<script lang="ts">
	import { fly } from 'svelte/transition';

	let { message }: { message: string | null } = $props();
</script>

{#if message}
	<div
		class="pointer-events-none fixed top-16 left-0 right-0 z-[60] flex justify-center px-4"
		transition:fly={{ y: -6, duration: 200 }}
	>
		<div class="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
			{message}
		</div>
	</div>
{/if}
