// Fires callback when a click occurs outside the given node.
// Uses pointerup so that dropdown items receive their click before the overlay closes.
export function clickOutside(node: HTMLElement, callback: () => void) {
	function handle(event: PointerEvent) {
		if (!node.contains(event.target as Node)) {
			callback();
		}
	}
	document.addEventListener('pointerup', handle);
	return {
		destroy() {
			document.removeEventListener('pointerup', handle);
		}
	};
}
