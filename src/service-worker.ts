/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

declare let self: ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(ASSETS);
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			for (const key of keys) {
				if (key !== CACHE) await caches.delete(key);
			}
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			if (ASSETS.includes(url.pathname)) {
				const cached = await caches.match(event.request);
				if (cached) return cached;
			}
			// Pages and API responses are auth-gated and depend on live DB state,
			// so we don't cache them — pass straight to network. This is enough
			// for Chrome's PWA-install criteria (a fetch handler that responds).
			return fetch(event.request);
		})()
	);
});
