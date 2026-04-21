export type RecipeCourse = 'breakfast' | 'main' | 'snack' | 'dessert';

export const RECIPE_COURSES: RecipeCourse[] = ['breakfast', 'main', 'snack', 'dessert'];

export const RECIPE_COURSE_LABELS: Record<RecipeCourse, string> = {
	breakfast: 'Breakfast',
	main: 'Main Course',
	snack: 'Snack',
	dessert: 'Dessert'
};
