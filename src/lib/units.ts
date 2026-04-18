export const UNITS = [
	{ label: 'count', value: 'count' },
	{ label: 'oz',    value: 'oz'    },
	{ label: 'g',     value: 'g'     },
	{ label: 'kg',    value: 'kg'    },
	{ label: 'lb',    value: 'lb'    },
	{ label: 'cups',  value: 'cups'  },
	{ label: 'tbsp',  value: 'tbsp'  },
	{ label: 'tsp',   value: 'tsp'   },
	{ label: 'mL',    value: 'mL'    },
	{ label: 'L',     value: 'L'     },
] as const;

export type Unit = (typeof UNITS)[number]['value'];

export function guessUnit(name: string): Unit {
	const l = name.toLowerCase();
	if (/milk|juice|oil|sauce|broth|stock|water|cream/.test(l)) return 'L';
	if (/flour|sugar|rice|salt|powder|spice/.test(l)) return 'g';
	return 'count';
}
