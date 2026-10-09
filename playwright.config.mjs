import { defineConfig } from "@playwright/test"

export default defineConfig({
	testDir: "tests",
	testMatch: "*.spec.mjs",
	timeout: 20000,
	fullyParallel: true,
	use: {
		baseURL: "http://localhost:4173",
		channel: "chrome",
		viewport: { width: 1440, height: 900 },
	},
	webServer: {
		command: "node tests/Serve.mjs",
		url: "http://localhost:4173",
		reuseExistingServer: true,
	},
})
