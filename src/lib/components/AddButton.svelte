<script lang="ts">
	let { label, onclick }: { label: string; onclick: () => void } = $props();
</script>

<div class="fixed bottom-14 left-0 right-0 z-30 flex justify-center px-4 pb-2">
	<button
		{onclick}
		class="flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-orange-600 active:scale-95"
	>
		<span class="text-xl leading-none">+</span>
		{label}
	</button>
</div>
