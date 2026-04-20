<script lang="ts">
	import { page } from '$app/state';

	let { title, back }: { title: string; back?: string | true } = $props();

	function initials(user: { name: string | null; username: string }) {
		const src = user.name ?? user.username;
		return src
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
	<div class="relative mx-auto flex max-w-lg items-center">
		<!-- Left: back button or spacer -->
		<div class="w-8 shrink-0">
			{#if back === true}
				<button type="button" onclick={() => history.back()} aria-label="Go back" class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800">&lt;</button>
			{:else if back}
				<a href={back} aria-label="Go back" class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800">&lt;</a>
			{/if}
		</div>

		<!-- Title: absolutely centered within the container -->
		<h1 class="flex-1 text-center text-lg font-bold text-stone-900">{title}</h1>

		<!-- Right: avatar -->
		<div class="w-8 shrink-0 flex justify-end">
			{#if page.data.user}
				<a
					href="/profile"
					class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600 shadow-sm hover:bg-orange-200"
					aria-label="Profile"
				>
					{initials(page.data.user)}
				</a>
			{/if}
		</div>
	</div>
</header>
