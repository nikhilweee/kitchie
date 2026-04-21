import { defineConfig } from '@playwright/test';
import { STORAGE_STATE } from './playwright/global-setup';

export default defineConfig({
	testDir: 'playwright',
	globalSetup: 'playwright/global-setup.ts',
	workers: 2,
	use: {
		baseURL: 'http://localhost:4173',
		storageState: STORAGE_STATE,
	},
	webServer: {
		command: 'DATABASE_URL=test.db npm run preview',
		port: 4173,
		reuseExistingServer: false,
		timeout: 30000,
	},
});
