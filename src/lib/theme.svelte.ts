import { browser } from '$app/environment';
import { createPersistedState } from '$lib/persisted.svelte';

const _state = createPersistedState<'light' | 'dark'>('theme', 'light');

export const theme = {
	get value() { return _state.value; },
	set value(v: 'light' | 'dark') {
		_state.value = v;
		if (browser) document.documentElement.dataset.theme = v;
	}
};
