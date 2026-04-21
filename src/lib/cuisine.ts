export const CUISINE_LABELS = {
	american: 'American',
	chinese: 'Chinese',
	french: 'French',
	greek: 'Greek',
	indian: 'Indian',
	italian: 'Italian',
	japanese: 'Japanese',
	korean: 'Korean',
	mediterranean: 'Mediterranean',
	mexican: 'Mexican',
	middle_eastern: 'Middle Eastern',
	thai: 'Thai',
	vietnamese: 'Vietnamese',
	other: 'Other'
} as const;

export type Cuisine = keyof typeof CUISINE_LABELS;
export const CUISINES = Object.keys(CUISINE_LABELS) as Cuisine[];
