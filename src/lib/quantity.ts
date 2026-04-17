import type { QuantityType } from '$lib/server/db/schema';

// Only clearly countable discrete items use count; everything else defaults to estimate
const COUNT_KEYWORDS = [
	'egg', 'eggs', 'banana', 'bananas', 'apple', 'apples', 'orange', 'oranges',
	'lemon', 'lemons', 'lime', 'limes', 'potato', 'potatoes', 'onion', 'onions',
	'tomato', 'tomatoes', 'avocado', 'avocados', 'can', 'cans', 'tin', 'tins',
	'bottle', 'bottles', 'bag', 'bags', 'box', 'boxes', 'pack', 'packs',
	'piece', 'pieces', 'slice', 'slices', 'loaf', 'loaves', 'roll', 'rolls',
	'bun', 'buns', 'muffin', 'muffins', 'bagel', 'bagels', 'wrap', 'wraps',
	'bar', 'bars', 'sachet', 'sachets', 'tablet', 'tablets'
];

export function guessQuantityType(name: string): QuantityType {
	const lower = name.toLowerCase();
	return COUNT_KEYWORDS.some((k) => lower.includes(k)) ? 'count' : 'estimate';
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
