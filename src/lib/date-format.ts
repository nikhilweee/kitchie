export function toDateStr(iso: string): string {
	return iso.split('T')[0];
}

export function toDateTimeLocalStr(iso: string): string {
	return iso.slice(0, 16);
}
