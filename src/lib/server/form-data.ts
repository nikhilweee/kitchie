export function getString(d: FormData, key: string): string {
	return String(d.get(key) ?? '').trim();
}

export function getNumber(d: FormData, key: string, fallback = 0): number {
	return parseFloat(String(d.get(key) ?? '')) || fallback;
}

export function getStrings(d: FormData, key: string): string[] {
	return d.getAll(key).map(String);
}

export function getNumbers(d: FormData, key: string): number[] {
	return d.getAll(key).map(Number);
}
