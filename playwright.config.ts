import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  outputDir: 'test-results',
  workers: 1,
  timeout: 90_000,
  use: { baseURL: 'http://127.0.0.1:4187', headless: true, actionTimeout: 12_000 },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
    { name: 'firefox', use: { browserName: 'firefox', launchOptions: { timeout: 25_000 } } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: [
    {
      command: 'bun run start',
      url: 'http://127.0.0.1:4187',
      env: {
        GAME_RUNTIME: 'development',
        GAME_STUDIO_ACCOUNTS: '0',
        GAME_PORT: '4187',
        GAME_DB: ':memory:',
        GAME_AI_ENABLED: '0',
        GAME_DEMO_RUNS: '1',
        GAME_CANVAS_ORIGINS: 'http://127.0.0.1:4199',
      },
      reuseExistingServer: false,
    },
    {
      command: 'bun tests/browser/embed-fixture.ts',
      url: 'http://127.0.0.1:4199',
      reuseExistingServer: false,
    },
  ],
});
