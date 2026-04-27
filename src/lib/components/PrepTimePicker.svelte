<script module lang="ts">
	export const PREP_TIME_LABELS: Record<number, string> = { 1: 'Quick', 2: 'Medium', 3: 'Long' };

	function zoneColor(zone: number, level: number | null): string {
		if (!level || zone > level) return 'bg-stone-200';
		if (level === 1) return 'bg-green-500';
		if (level === 2) return 'bg-yellow-400';
		return 'bg-red-500';
	}
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
	class="grid h-[42px] w-full grid-cols-3 overflow-hidden rounded-xl border border-stone-200"
	role="group"
	aria-label="Prep time"
>
	{#each [1, 2, 3] as n (n)}
		<button
			type="button"
			onclick={() => select(n)}
			aria-pressed={value === n}
			aria-label={PREP_TIME_LABELS[n]}
			class="h-full transition-colors {zoneColor(n, value)} {value === n ? 'opacity-100' : 'opacity-60 hover:opacity-80'}"
		></button>
	{/each}
</div>
