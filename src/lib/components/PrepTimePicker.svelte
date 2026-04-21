<script module lang="ts">
	export const PREP_TIME_LABELS: Record<number, string> = { 1: 'Quick', 2: 'Easy', 3: 'Medium', 4: 'Long' };
</script>

<script lang="ts">
	let {
		value = $bindable<number | null>(null),
		name
	}: { value?: number | null; name?: string } = $props();

	function select(n: number) {
		value = value === n ? null : n; // tap again to deselect
	}
</script>

{#if name}
	<input type="hidden" {name} value={value ?? ''} />
{/if}

<div
	class="grid h-[42px] w-full grid-cols-4 overflow-hidden rounded-xl border border-stone-200"
	role="group"
	aria-label="Prep time"
>
	{#each [1, 2, 3, 4] as n (n)}
		<button
			type="button"
			onclick={() => select(n)}
			aria-pressed={value === n}
			aria-label={PREP_TIME_LABELS[n]}
			class="h-full text-xs font-medium transition-colors {value === n
				? 'bg-stone-800 text-white'
				: 'bg-white text-stone-400 hover:bg-stone-100'} {n > 1 ? 'border-l border-stone-200' : ''}"
		>{PREP_TIME_LABELS[n]}</button>
	{/each}
</div>
