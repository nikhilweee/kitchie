import { browser } from '$app/environment';

export function createPersistedState<T>(key: string, defaultValue: T) {
	const stored = browser ? localStorage.getItem(key) : null;
	let value = $state<T>(stored !== null ? JSON.parse(stored) : defaultValue);
	return {
		get value() { return value; },
		set value(v: T) { value = v; if (browser) localStorage.setItem(key, JSON.stringify(v)); }
	};
}
