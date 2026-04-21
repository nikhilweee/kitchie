<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { form }: { form: { error?: string; success?: boolean } | null } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	const passwordMismatch = $derived(
		newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword
	);
</script>

<svelte:head><title>Kitchie | Change Password</title></svelte:head>

<div class="flex min-h-svh flex-col bg-stone-50">
	<PageHeader title="Change password" back={true} />

	<main class="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
		<form
			method="POST"
			action="?/changePassword"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					currentPassword = '';
					newPassword = '';
					confirmPassword = '';
				}
			}}
			class="space-y-3"
		>
			{#if form?.error}
				<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{form.error}</p>
			{/if}
			{#if form?.success}
				<p class="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">Password changed.</p>
			{/if}

			<input
				name="currentPassword"
				type="password"
				bind:value={currentPassword}
				placeholder="Current password"
				autocomplete="current-password"
				class="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
			/>
			<input
				name="newPassword"
				type="password"
				bind:value={newPassword}
				placeholder="New password (min 8 chars)"
				autocomplete="new-password"
				class="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"
			/>
			<div>
				<input
					name="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					placeholder="Confirm new password"
					autocomplete="new-password"
					class="block w-full rounded-xl border px-4 py-3 text-sm focus:outline-none {passwordMismatch
						? 'border-red-400 bg-red-50 focus:border-red-400'
						: 'border-stone-300 bg-white focus:border-orange-500'}"
				/>
				{#if passwordMismatch}
					<p class="mt-1 text-xs text-red-500">Passwords don't match.</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={passwordMismatch}
				class="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40"
			>
				Change password
			</button>
		</form>
	</main>
</div>
