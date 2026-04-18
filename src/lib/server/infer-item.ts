import { guessCategory } from '$lib/infer';
import { guessQuantityType } from '$lib/quantity';
import { guessUnit } from '$lib/units';

export function inferItemDefaults(name: string) {
	const category = guessCategory(name);
	const quantityType = guessQuantityType(name);
	const unit = quantityType === 'count' ? guessUnit(name) : null;
	return { category, quantityType, unit };
}
