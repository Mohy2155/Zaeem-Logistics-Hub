import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (e2e/*.e2e.ts), run with `npm run e2e`.
 *
 * - Default: the demo build (mock API in the browser) on port 4300, started here. No API or SQL Server needed,
 *   and every test gets a fresh browser context, so the demo data re-seeds.
 * - E2E_TARGET=fullstack: the dev server on port 4200 against the real API. The tests place orders and record
 *   payments, so start the API on a scratch database first (see README) and confirm with E2E_ALLOW_FULLSTACK=1.
 */
const fullStack = process.env['E2E_TARGET'] === 'fullstack';
if (fullStack && process.env['E2E_ALLOW_FULLSTACK'] !== '1') {
  throw new Error(
    'E2E_TARGET=fullstack places real orders and payments through the API. Start the API on a scratch database ' +
    '(see zaeem-distribute-ui/README.md, "End-to-end tests"), then run again with E2E_ALLOW_FULLSTACK=1.'
  );
}

const ci = !!process.env['CI'];
// The demo serves under the GitHub Pages base path, exactly as deployed.
const baseURL = fullStack ? 'http://localhost:4200/' : 'http://localhost:4300/Zaeem-Logistics-Hub/';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Full-stack tests share one database; one worker keeps the before/after balance checks independent.
  workers: fullStack ? 1 : undefined,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: fullStack ? 'npx ng serve --port 4200' : 'npx ng serve --configuration demo --port 4300',
    url: baseURL,
    reuseExistingServer: !ci,
    timeout: 240_000,
  },
});
