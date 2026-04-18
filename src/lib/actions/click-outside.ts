// Fires callback when a pointerdown event occurs outside the given node.
// Works on both mouse and touch (mobile-safe).
export function clickOutside(node: HTMLElement, callback: () => void) {
	function handle(event: PointerEvent) {
		if (!node.contains(event.target as Node)) {
			callback();
		}
	}
	document.addEventListener('pointerdown', handle);
	return {
		destroy() {
			document.removeEventListener('pointerdown', handle);
		}
	};
}
