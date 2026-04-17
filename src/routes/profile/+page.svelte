<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nameInput = $state(data.user.name ?? '');
	let usernameInput = $state(data.user.username);
	let currentPassword = $state('');
	let newPassword = $state('');
	let saved = $state(false);
</script>

<svelte:head><title>Profile — Kitchie</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
		<div class="mx-auto max-w-lg">
			<h1 class="text-lg font-bold text-stone-900">Profile</h1>
		</div>
	</header>

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
		<!-- Edit profile -->
		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					saved = true;
					currentPassword = '';
					newPassword = '';
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

			<div class="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
				<p class="text-xs font-medium text-stone-500">Change password <span class="font-normal">(leave blank to keep current)</span></p>
				<input
					name="currentPassword"
					type="password"
					bind:value={currentPassword}
					placeholder="Current password"
					autocomplete="current-password"
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
				/>
				<input
					name="newPassword"
					type="password"
					bind:value={newPassword}
					placeholder="New password (min 8 chars)"
					autocomplete="new-password"
					class="block w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
			>
				Save changes
			</button>
		</form>

		<!-- Logout -->
		<form method="POST" action="?/logout" use:enhance class="mt-6">
			<button
				type="submit"
				class="w-full rounded-xl border border-stone-300 py-3 text-sm font-medium text-stone-600 hover:bg-stone-100"
			>
				Log out
			</button>
		</form>
	</main>
</div>
