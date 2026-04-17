import type { QuantityType } from '$lib/server/db/schema';

// Keywords that indicate a bulk/liquid item → use fuzzy estimate
const ESTIMATE_KEYWORDS = [
	'milk', 'flour', 'sugar', 'oil', 'butter', 'cream', 'juice', 'water',
	'sauce', 'syrup', 'honey', 'vinegar', 'broth', 'stock', 'wine', 'beer',
	'yogurt', 'yoghurt', 'oats', 'oatmeal', 'rice', 'pasta', 'cereal',
	'powder', 'spice', 'salt', 'pepper', 'cumin', 'paprika', 'cinnamon',
	'coffee', 'tea', 'shampoo', 'soap', 'detergent'
];

export function guessQuantityType(name: string): QuantityType {
	const lower = name.toLowerCase();
	return ESTIMATE_KEYWORDS.some((k) => lower.includes(k)) ? 'estimate' : 'count';
}

// Estimate levels stored as numbers: full=1, half=0.5, low=0.1
export const ESTIMATE_OPTIONS = [
	{ label: 'Full', value: 1 },
	{ label: '~Half', value: 0.5 },
	{ label: 'Low', value: 0.1 }
] as const;

export function estimateLabel(value: number): string {
	if (value >= 0.9) return 'Full';
	if (value >= 0.3) return '~Half';
	return 'Low';
}
