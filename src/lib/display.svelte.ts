import { browser } from '$app/environment';
import { createPersistedState } from '$lib/persisted.svelte';

const _state = createPersistedState<'comfortable' | 'slim'>('display', 'comfortable');

export const display = {
	get value() { return _state.value; },
	set value(v: 'comfortable' | 'slim') {
		_state.value = v;
		if (browser) document.documentElement.dataset.display = v;
	}
};
