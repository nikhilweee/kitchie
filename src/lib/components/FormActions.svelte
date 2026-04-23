<script lang="ts">
	let {
		isEditing,
		saveLabel = isEditing ? 'Save' : 'Add',
		deleteAction,
		disabled = false,
		oncancel
	}: {
		isEditing: boolean;
		saveLabel?: string;
		deleteAction?: string;
		disabled?: boolean;
		oncancel: () => void;
	} = $props();
</script>

<div class="mt-4 flex gap-2">
	{#if isEditing}
		<button
			type="submit"
			formaction={deleteAction}
			data-shortcut="delete"
			class="flex-1 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50 density-sheet-btn"
		>
			Delete
		</button>
	{:else}
		<button
			type="button"
			onclick={oncancel}
			class="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 density-sheet-btn"
		>
			Cancel
		</button>
	{/if}
	<button
		type="submit"
		{disabled}
		data-shortcut="primary"
		class="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 density-sheet-btn"
	>
		{saveLabel}
	</button>
</div>
