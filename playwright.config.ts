import { defineConfig } from '@playwright/test';
import { STORAGE_STATE } from './playwright/global-setup';

export default defineConfig({
	testDir: 'playwright',
	globalSetup: 'playwright/global-setup.ts',
	workers: 1,
	use: {
		baseURL: 'http://localhost:5173',
		storageState: STORAGE_STATE,
	},
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true,
		timeout: 60000,
	},
});
