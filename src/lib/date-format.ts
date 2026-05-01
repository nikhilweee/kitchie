export function toDateStr(iso: string): string {
	const [year, month, day] = iso.split('T')[0].split('-');
	return `${month}/${day}/${year}`;
}

export function toDateTimeLocalStr(iso: string): string {
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
