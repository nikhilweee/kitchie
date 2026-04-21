<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';
	import { Utensils, ChefHat, ShoppingBasket } from 'lucide-svelte';
	import type { Component } from 'svelte';

	let { children, data }: { children: any; data: LayoutData } = $props();

	const navItems: { href: string; label: string; icon: Component }[] = [
		{ href: '/meals', label: 'Meals', icon: Utensils },
		{ href: '/recipes', label: 'Recipes', icon: ChefHat },
		{ href: '/pantry', label: 'Pantry', icon: ShoppingBasket }
	];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}

{#if data.user}
	<nav class="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white">
		<ul class="mx-auto flex max-w-lg">
			{#each navItems as item (item.href)}
				{@const active =
					item.href === '/' ? page.url.pathname === '/meals' : page.url.pathname.startsWith(item.href)}
				<li class="flex-1">
					<a
						href={item.href}
						class="flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors {active
							? 'text-orange-500'
							: 'text-stone-400 hover:text-stone-600'}"
					>
						<item.icon class="h-5 w-5" />
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
