<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Kitchie | Sign in</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center bg-stone-50 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold tracking-tight text-stone-900">Kitchie</h1>
			<p class="mt-1 text-sm text-stone-500">Sign in to continue</p>
		</div>

		<form method="POST" class="space-y-4">
			{#if form?.error}
				<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</p>
			{/if}

			<div class="space-y-1">
				<label for="username" class="block text-sm font-medium text-stone-700">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					autocomplete="username"
					autocapitalize="none"
					required
					class="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
				/>
			</div>

			<div class="space-y-1">
				<label for="password" class="block text-sm font-medium text-stone-700">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				class="mt-2 w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 active:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
			>
				Sign in
			</button>
		</form>
	</div>
</div>
