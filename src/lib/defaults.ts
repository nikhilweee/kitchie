// Category definitions include old slug for one-time data migration
const CATEGORY_DEFS = [
	{ slug: 'produce',    name: 'Produce',    ttlDays: 7,   sortOrder: 1  },
	{ slug: 'meat',       name: 'Meat',       ttlDays: 7,   sortOrder: 2  },
	{ slug: 'dairy',      name: 'Dairy',      ttlDays: 14,  sortOrder: 3  },
	{ slug: 'leftovers',  name: 'Leftovers',  ttlDays: 3,   sortOrder: 4  },
	{ slug: 'bakery',     name: 'Bakery',     ttlDays: 7,   sortOrder: 5  },
	{ slug: 'frozen',     name: 'Frozen',     ttlDays: 90,  sortOrder: 6  },
	{ slug: 'dry',        name: 'Dry',        ttlDays: 365, sortOrder: 7  },
	{ slug: 'canned',     name: 'Canned',     ttlDays: 730, sortOrder: 8  },
	{ slug: 'condiments', name: 'Condiments', ttlDays: 180, sortOrder: 9  },
	{ slug: 'snacks',     name: 'Snacks',     ttlDays: 90,  sortOrder: 10 },
	{ slug: 'other',      name: 'Other',      ttlDays: 30,  sortOrder: 11 },
];

export const DEFAULT_CATEGORIES = CATEGORY_DEFS.map((c) => ({
	name: c.name,
	ttlDays: c.ttlDays,
	sortOrder: c.sortOrder
}));
export const SLUG_TO_CATEGORY_NAME: Record<string, string> = Object.fromEntries(
	CATEGORY_DEFS.map((c) => [c.slug, c.name])
);

// Cuisine definitions include old slug for one-time data migration
const CUISINE_DEFS = [
	{ slug: 'american',     name: 'American'      },
	{ slug: 'chinese',      name: 'Chinese'       },
	{ slug: 'french',       name: 'French'        },
	{ slug: 'greek',        name: 'Greek'         },
	{ slug: 'indian',       name: 'Indian'        },
	{ slug: 'italian',      name: 'Italian'       },
	{ slug: 'japanese',     name: 'Japanese'      },
	{ slug: 'korean',       name: 'Korean'        },
	{ slug: 'mediterranean',name: 'Mediterranean' },
	{ slug: 'mexican',      name: 'Mexican'       },
	{ slug: 'thai',         name: 'Thai'          },
	{ slug: 'vietnamese',   name: 'Vietnamese'    },
	{ slug: 'other',        name: 'Other'         },
];

export const DEFAULT_CUISINES = CUISINE_DEFS.map((c) => c.name);
export const SLUG_TO_CUISINE_NAME: Record<string, string> = Object.fromEntries(
	CUISINE_DEFS.map((c) => [c.slug, c.name])
);
