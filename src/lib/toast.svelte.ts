export function createToast(duration = 2500) {
	let message = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout>;

	function show(msg: string) {
		clearTimeout(timer);
		message = msg;
		timer = setTimeout(() => (message = null), duration);
	}

	return { get message() { return message; }, show };
}
