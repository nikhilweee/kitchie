export const UNITS = [
	{ label: 'count', value: 'count' },
	{ label: 'oz',    value: 'oz'    },
	{ label: 'fl oz', value: 'fl oz' },
	{ label: 'g',     value: 'g'     },
	{ label: 'kg',    value: 'kg'    },
	{ label: 'lb',    value: 'lb'    },
	{ label: 'cups',  value: 'cups'  },
	{ label: 'tbsp',  value: 'tbsp'  },
	{ label: 'tsp',   value: 'tsp'   },
	{ label: 'pt',    value: 'pt'    },
	{ label: 'qt',    value: 'qt'    },
	{ label: 'gal',   value: 'gal'   },
	{ label: 'mL',    value: 'mL'    },
	{ label: 'L',     value: 'L'     },
] as const;

export type Unit = (typeof UNITS)[number]['value'];

const ABBREV: Record<string, string> = {
	count: 'ct', cups: 'cp', tbsp: 'tb', tsp: 'ts', mL: 'ml',
	'fl oz': 'fl', gal: 'gl'
};

export function unitAbbrev(unit: string): string {
	return ABBREV[unit] ?? (unit.length <= 2 ? unit : unit.slice(0, 2));
}

export function guessUnit(name: string): Unit {
	const l = name.toLowerCase();
	if (/milk|juice|oil|sauce|broth|stock|water|cream/.test(l)) return 'L';
	if (/flour|sugar|rice|salt|powder|spice/.test(l)) return 'g';
	return 'count';
}
