<script lang="ts">
	// value: 1 = full (3/3 green), 0.5 = half (2/3 yellow), 0.1 = low (1/3 red), 0 = empty (gray)
	let {
		value = $bindable(1),
		readonly = false,
		name
	}: { value?: number; readonly?: boolean; name?: string } = $props();

	// Map a value to 0, 1, 2, or 3 filled zones
	function level(): 0 | 1 | 2 | 3 {
		if (value <= 0) return 0;
		if (value >= 0.9) return 3;
		if (value >= 0.3) return 2;
		return 1;
	}

	// Color class for a zone given current fill level
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

{#if readonly}
	{@const l = level()}
	<div class="flex gap-0.5" aria-label="Quantity level">
		{#each [1, 2, 3] as zone}
			<div class="h-3 w-1.5 rounded-sm {zoneColor(zone as 1|2|3, l)}"></div>
		{/each}
	</div>
{:else}
	<div
		class="grid h-[42px] w-full grid-cols-3 overflow-hidden rounded-xl border border-stone-200"
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
{/if}
