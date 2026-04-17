import type { PantryCategory } from '$lib/server/db/schema';

// Default TTL in days per category (from PRD decisions)
export const EXPIRY_TTL_DAYS: Record<PantryCategory, number> = {
	fresh_produce: 6,
	fresh_meat_fish: 2,
	dairy: 10,
	cooked_leftovers: 4,
	bread_bakery: 6,
	frozen: 90,
	dry_goods: 365,
	canned_goods: 730,
	condiments: 180,
	packaged_snacks: 90,
	other: 30
};

export const CATEGORY_LABELS: Record<PantryCategory, string> = {
	fresh_produce: 'Fresh produce',
	fresh_meat_fish: 'Meat / fish',
	dairy: 'Dairy',
	cooked_leftovers: 'Leftovers',
	bread_bakery: 'Bread / bakery',
	frozen: 'Frozen',
	dry_goods: 'Dry goods',
	canned_goods: 'Canned',
	condiments: 'Condiments',
	packaged_snacks: 'Snacks',
	other: 'Other'
};

export function calcExpiry(category: PantryCategory, purchaseDate: Date): Date {
	const ttl = EXPIRY_TTL_DAYS[category] ?? 30;
	const expiry = new Date(purchaseDate);
	expiry.setDate(expiry.getDate() + ttl);
	return expiry;
}

export function daysUntilExpiry(expiryDate: Date): number {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const exp = new Date(expiryDate);
	exp.setHours(0, 0, 0, 0);
	return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
