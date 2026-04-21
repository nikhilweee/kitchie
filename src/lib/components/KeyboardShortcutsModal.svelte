<script lang="ts">
	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	const shortcuts = [
		{ label: 'Save / Confirm', keys: ['⌘', '↵'] },
		{ label: 'Trash / Delete', keys: ['⌘', '⌫'] },
		{ label: 'Close sheet',    keys: ['Esc'] },
		{ label: 'Keyboard shortcuts', keys: ['?'] },
	];
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onclose(); }} />

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
		onclick={onclose}
		aria-label="Close keyboard shortcuts"
	>
		<div
			class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label="Keyboard shortcuts"
			tabindex="-1"
		>
			<h2 class="mb-4 text-sm font-semibold text-stone-700">Keyboard shortcuts</h2>
			<dl class="space-y-3">
				{#each shortcuts as s (s.label)}
					<div class="flex items-center justify-between">
						<dt class="text-sm text-stone-500">{s.label}</dt>
						<dd class="flex gap-1">
							{#each s.keys as k (k)}
								<kbd class="rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{k}</kbd>
							{/each}
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	</button>
{/if}
