import { text, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401);

	const items = await db.select().from(pantryItems)
		.where(eq(pantryItems.userId, locals.user.id))
		.orderBy(pantryItems.name);

	const active = items.filter((i) => i.status === 'active');
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	function daysUntil(date: Date): number {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		return Math.round((d.getTime() - today.getTime()) / 86400000);
	}

	function expLabel(date: Date): string {
		const d = daysUntil(new Date(date));
		if (d < 0) return `${Math.abs(d)}d ago`;
		if (d === 0) return 'today';
		if (d === 1) return 'tomorrow';
		return `${d}d`;
	}

	function qtyLabel(item: typeof active[0]): string {
		if (item.quantityType === 'estimate')
			return item.quantity >= 0.9 ? 'full' : item.quantity >= 0.4 ? 'half' : 'low';
		const unit = item.unit && item.unit !== 'count' ? ` ${item.unit}` : '';
		return `${item.quantity}${unit}`;
	}

	const BUCKETS = [
		{ label: 'Expired',           test: (d: number) => d < 0  },
		{ label: 'Expires This Week', test: (d: number) => d <= 7  },
		{ label: 'Expires Later',     test: () => true              },
	];

	const groups = new Map<string, string[]>(BUCKETS.map((b) => [b.label, []]));

	for (const item of active) {
		const days = daysUntil(new Date(item.expiryDate));
		const bucket = BUCKETS.find((b) => b.test(days))!;
		groups.get(bucket.label)!.push(`- ${item.name} (qty: ${qtyLabel(item)}, exp: ${expLabel(item.expiryDate)})`);
	}

	const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	const parts: string[] = [`Pantry as of ${dateStr}`];

	for (const [label, lines] of groups) {
		if (lines.length === 0) continue;
		parts.push(`\n${label}:`);
		parts.push(...lines);
	}

	return text(parts.join('\n'));
};
