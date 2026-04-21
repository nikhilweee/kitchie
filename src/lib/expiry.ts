export function calcExpiry(ttlDays: number, purchaseDate: Date): Date {
	const expiry = new Date(purchaseDate);
	expiry.setDate(expiry.getDate() + ttlDays);
	return expiry;
}

export function daysUntilExpiry(expiryDate: Date): number {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const exp = new Date(expiryDate);
	exp.setHours(0, 0, 0, 0);
	return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
