import { defineConfig, devices } from '@playwright/test';

const port = 8081;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    viewport: { width: 420, height: 860 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 420, height: 860 } } }],
  webServer: {
    command: `npx expo export --platform web --output-dir web-dist && node e2e/serve.mjs`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { PORT: String(port), EXPO_NO_TELEMETRY: '1' },
  },
});
