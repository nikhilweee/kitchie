import { expect, type Page } from '@playwright/test';

// At max scroll, the bottom edge of the last <li> in <main> must be at or
// above the *top* of any fixed element overlapping the bottom of the viewport
// (the global bottom nav, a Checkout FAB, etc). If it's below any of those,
// content is hidden behind the overlay even though the page is "fully
// scrolled" — the user can't reach those items by scrolling at all.
//
// Pair with `test.use({ viewport: { width: 375, height: 500 } })` so modest
// seed data overflows.
export async function assertLastItemReachable(page: Page) {
	await page.waitForFunction(() => document.body.scrollHeight > window.innerHeight);
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.waitForFunction(
		() => Math.abs(window.scrollY - (document.body.scrollHeight - window.innerHeight)) < 5
	);
	// Scrolling down triggers the AddButton / Checkout FAB to auto-hide via a
	// 200ms CSS transform transition. Wait for that to settle so getBoundingClientRect
	// reflects the final position, not a mid-animation frame.
	await page.waitForTimeout(250);
	const result = await page.evaluate(() => {
		const items = document.querySelectorAll('main li');
		const last = items[items.length - 1];
		// Find the highest top edge among all position:fixed elements that
		// overlap the bottom half of the viewport — that's the effective
		// floor that scrollable content can't go below.
		const vh = window.innerHeight;
		let effectiveBottom = vh;
		for (const el of document.querySelectorAll<HTMLElement>('*')) {
			const cs = getComputedStyle(el);
			if (cs.position !== 'fixed') continue;
			const rect = el.getBoundingClientRect();
			if (rect.height === 0 || rect.width === 0) continue;
			if (rect.top >= vh / 2 && rect.top < effectiveBottom && rect.bottom > vh / 2) {
				effectiveBottom = rect.top;
			}
		}
		return {
			count: items.length,
			lastBottom: last ? last.getBoundingClientRect().bottom : null,
			effectiveBottom,
			viewportHeight: vh
		};
	});
	expect(result.count, 'expected at least one <li> in main').toBeGreaterThan(0);
	expect(
		result.lastBottom,
		`last <main li> bottom (${result.lastBottom}px) is below the top of fixed bottom chrome at ${result.effectiveBottom}px (viewport ${result.viewportHeight}px) — content is occluded by the fixed nav or FAB; add bottom padding to PageShell mainClass`
	).toBeLessThanOrEqual(result.effectiveBottom);
}
