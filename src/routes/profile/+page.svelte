<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data, form }: { data: PageData; form: { error?: string; success?: boolean } | null } = $props();

	let nameInput = $state(untrack(() => data.user.name ?? ''));
	let usernameInput = $state(untrack(() => data.user.username));
	let saved = $state(false);
</script>

<svelte:head><title>Kitchie | Profile</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Profile" back={true} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
		<!-- Edit profile -->
		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					saved = true;
					setTimeout(() => (saved = false), 2500);
				}
			}}
			class="space-y-4"
		>
			{#if form?.error}
				<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
			{/if}
			{#if saved}
				<p class="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">Profile updated.</p>
			{/if}

			<div>
				<label for="name" class="mb-1 block text-xs font-medium text-stone-500">Display name</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={nameInput}
					placeholder="Your name (optional)"
					autocapitalize="words"
					class="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="username" class="mb-1 block text-xs font-medium text-stone-500">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					bind:value={usernameInput}
					required
					autocomplete="username"
					class="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-orange-500 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
			>
				Save changes
			</button>
		</form>

		<div class="mt-4 space-y-3">
			<a
				href="/profile/password"
				class="block w-full rounded-xl border border-stone-300 py-3 text-center text-sm font-medium text-stone-600 hover:bg-stone-100"
			>
				Change password
			</a>

			<!-- Logout -->
			<form method="POST" action="?/logout" use:enhance>
				<button
					type="submit"
					class="w-full rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-100"
				>
					Log out
				</button>
			</form>
		</div>
	</main>
</div>
