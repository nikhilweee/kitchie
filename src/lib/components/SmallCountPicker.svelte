<script lang="ts">
	import { unitAbbrev } from '$lib/units';

	let {
		value = $bindable(1),
		unit = null
	}: { value?: number; unit?: string | null } = $props();

	const label = $derived(unit ? `${value}\u00a0${unitAbbrev(unit)}` : String(value));
</script>

<!-- h-8 × 104px — matches SmallEstimatePicker dimensions -->
<div class="flex shrink-0 items-center gap-0.5" role="group" aria-label="Quantity">
	<button type="button"
		onclick={() => (value = Math.max(0, value - 1))}
		class="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-sm text-stone-500 hover:bg-stone-100">−</button>
	<span class="min-w-[2.25rem] text-center text-sm font-medium text-stone-800">{label}</span>
	<button type="button"
		onclick={() => value++}
		class="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-sm text-stone-500 hover:bg-stone-100">+</button>
</div>
