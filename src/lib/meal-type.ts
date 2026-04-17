import type { MealType } from '$lib/server/db/schema';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
	breakfast: 'Breakfast',
	lunch: 'Lunch',
	dinner: 'Dinner',
	snack: 'Snack'
};

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function guessMealType(hour: number): MealType {
	if (hour >= 5 && hour < 11) return 'breakfast';
	if (hour >= 11 && hour < 15) return 'lunch';
	if (hour >= 17 && hour < 22) return 'dinner';
	return 'snack';
}

// Returns current datetime as "YYYY-MM-DDTHH:MM" for <input type="datetime-local">
export function currentDateTimeStr(): string {
	const now = new Date();
	return (
		`${now.getFullYear()}-` +
		`${String(now.getMonth() + 1).padStart(2, '0')}-` +
		`${String(now.getDate()).padStart(2, '0')}T` +
		`${String(now.getHours()).padStart(2, '0')}:` +
		`${String(now.getMinutes()).padStart(2, '0')}`
	);
}

// Combines today's date with a HH:MM time string into a Date
export function combineDateAndTime(date: Date, timeStr: string): Date {
	const [h, m] = timeStr.split(':').map(Number);
	const result = new Date(date);
	result.setHours(h ?? 0, m ?? 0, 0, 0);
	return result;
}
