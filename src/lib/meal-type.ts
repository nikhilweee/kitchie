import type { MealType } from '$lib/server/db/schema';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
	breakfast: 'Breakfast',
	lunch: 'Lunch',
	dinner: 'Dinner',
	snack: 'Snack'
};

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function guessMealType(hour: number): MealType {
	if (hour >= 7 && hour < 11) return 'breakfast';
	if (hour >= 12 && hour < 15) return 'lunch';
	if (hour >= 18 && hour < 22) return 'dinner';
	return 'snack';
}

// Returns current datetime as "YYYY-MM-DDTHH:MM" rounded to nearest 15 min
export function currentDateTimeStr(): string {
	const now = new Date();
	now.setMinutes(Math.round(now.getMinutes() / 15) * 15, 0, 0);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Combines today's date with a HH:MM time string into a Date
export function combineDateAndTime(date: Date, timeStr: string): Date {
	const [h, m] = timeStr.split(':').map(Number);
	const result = new Date(date);
	result.setHours(h ?? 0, m ?? 0, 0, 0);
	return result;
}
