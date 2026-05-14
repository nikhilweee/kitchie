import { browser } from '$app/environment';
import { createPersistedState } from '$lib/persisted.svelte';

const _state = createPersistedState<'light' | 'dark'>('theme', 'light');

// Status-bar color for Android PWAs (and the address-bar tint on Chrome).
// Mirrors the actual rendered page background in each theme — see layout.css
// where data-theme="dark" remaps stone-50 to the visual stone-950. Kept in
// sync with the equivalent constants in app.html's pre-paint script.
const THEME_COLORS = { light: '#fafaf9', dark: '#0c0a09' } as const;

export const theme = {
	get value() { return _state.value; },
	set value(v: 'light' | 'dark') {
		_state.value = v;
		if (browser) {
			document.documentElement.dataset.theme = v;
			document
				.querySelector('meta[name=theme-color]')
				?.setAttribute('content', THEME_COLORS[v]);
		}
	}
};
