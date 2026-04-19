<script lang="ts">
	// Compact 3-zone estimate picker for use in list rows (h-8, fixed width).
	// value: 1 = full (green), 0.5 = half (yellow), 0.1 = low (red), 0 = empty (gray)
	let {
		value = $bindable(1),
		name
	}: { value?: number; name?: string } = $props();

	function level(): 0 | 1 | 2 | 3 {
		if (value <= 0) return 0;
		if (value >= 0.9) return 3;
		if (value >= 0.3) return 2;
		return 1;
	}

	function zoneColor(zone: 1 | 2 | 3, currentLevel: 0 | 1 | 2 | 3): string {
		if (zone > currentLevel) return 'bg-stone-200';
		if (currentLevel === 1) return 'bg-red-500';
		if (currentLevel === 2) return 'bg-yellow-400';
		return 'bg-green-500';
	}

	function setValue(zone: 1 | 2 | 3) {
		if (zone === 1 && level() === 1) {
			value = 0; // tap red again → empty
		} else {
			value = zone === 1 ? 0.1 : zone === 2 ? 0.5 : 1;
		}
	}
</script>

{#if name}
	<input type="hidden" {name} value={value} />
{/if}

<div
	class="grid h-8 w-[6.5rem] shrink-0 grid-cols-3 overflow-hidden rounded-lg border border-stone-200"
	role="group"
	aria-label="Quantity level"
>
	{#each [1, 2, 3] as zone}
		{@const l = level()}
		<button
			type="button"
			onclick={() => setValue(zone as 1 | 2 | 3)}
			aria-pressed={l === zone}
			class="h-full transition-colors {zoneColor(zone as 1|2|3, l)} {l === zone ? 'opacity-100' : 'opacity-60 hover:opacity-80'}"
		></button>
	{/each}
</div>
