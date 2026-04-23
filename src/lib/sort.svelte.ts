type Dir = 'asc' | 'desc';

export function createSort<F extends string>(
	initialField: F,
	initialDir: Dir = 'asc',
	defaultDirFor: (field: F) => Dir = () => 'asc'
) {
	let by = $state(initialField);
	let dir = $state<Dir>(initialDir);
	const key = $derived(`${by}-${dir}`);

	function cycle(field: F) {
		if (by === field) dir = dir === 'asc' ? 'desc' : 'asc';
		else { by = field; dir = defaultDirFor(field); }
	}

	return {
		get by() { return by; },
		set by(v: F) { by = v; },
		get dir() { return dir; },
		set dir(v: Dir) { dir = v; },
		get key() { return key; },
		cycle
	};
}
