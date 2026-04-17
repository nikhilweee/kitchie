import { db } from '$lib/server/db';
import { mealEntries } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface ScoredMeal {
	name: string;
	score: number;
	count: number;
	lastEaten: Date;
}

// Hour of day → meal period bucket
function mealPeriod(hour: number): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
	if (hour >= 6 && hour < 11) return 'breakfast';
	if (hour >= 11 && hour < 15) return 'lunch';
	if (hour >= 17 && hour < 22) return 'dinner';
	return 'snack';
}

export async function getSuggestions(
	userId: string,
	query: string,
	limit = 6
): Promise<string[]> {
	const all = await db
		.select()
		.from(mealEntries)
		.where(eq(mealEntries.userId, userId));

	if (all.length === 0) return [];

	const now = new Date();
	const currentPeriod = mealPeriod(now.getHours());

	// Aggregate by name
	const byName = new Map<string, ScoredMeal>();
	for (const entry of all) {
		const key = entry.name.toLowerCase();
		const existing = byName.get(key);
		if (existing) {
			existing.count++;
			if (entry.loggedAt > existing.lastEaten) existing.lastEaten = entry.loggedAt;
		} else {
			byName.set(key, { name: entry.name, score: 0, count: 1, lastEaten: entry.loggedAt });
		}
	}

	const nowMs = now.getTime();
	const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

	for (const meal of byName.values()) {
		// Frequency score (log scale)
		meal.score += Math.log(meal.count + 1) * 10;

		// Recency: bonus if eaten in last 7 days
		const ageMs = nowMs - meal.lastEaten.getTime();
		if (ageMs < sevenDaysMs) {
			meal.score += (1 - ageMs / sevenDaysMs) * 15;
		}

		// Time-of-day match bonus: check historical entries for this meal name
		const matchingPeriodCount = all.filter(
			(e) =>
				e.name.toLowerCase() === meal.name.toLowerCase() &&
				mealPeriod(e.loggedAt.getHours()) === currentPeriod
		).length;
		meal.score += matchingPeriodCount * 8;
	}

	let candidates = Array.from(byName.values());

	// Filter by query prefix (case-insensitive)
	if (query.trim()) {
		const q = query.toLowerCase();
		candidates = candidates.filter((m) => m.name.toLowerCase().includes(q));
	}

	return candidates
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((m) => m.name);
}
