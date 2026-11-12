#!/usr/bin/env node
/**
 * Run via: pnpm dlx playwright@1.52.0 install chromium
 *          pnpm dlx playwright@1.52.0 node scripts/harness-playwright-capture.mjs [storageState] [outDir]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const storagePath = process.argv[2] ?? '/tmp/ap-harness.json';
const outDir = process.argv[3] ?? '/opt/cursor/artifacts/real-ui/build2c';
const base = process.env.HARNESS_BASE_URL ?? 'http://127.0.0.1:3005';

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: storagePath });
const page = await context.newPage();

await page.goto(`${base}/map/12`, { waitUntil: 'networkidle', timeout: 120_000 });
await page.screenshot({ path: join(outDir, 'layout-default.png'), fullPage: true });

const themes = [
  { name: 'aperture', value: 'exp-dark' },
  { name: 'slate', value: 'exp-slate' },
  { name: 'light', value: 'exp-light' },
  { name: 'classic', value: 'exp-classic' },
];

for (const t of themes) {
  await context.addCookies([
    { name: 'ap_map_theme', value: t.value, domain: '127.0.0.1', path: '/', secure: false, sameSite: 'Lax' },
  ]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({ path: join(outDir, `theme-${t.name}.png`), fullPage: true });
}

await page.goto(`${base}/account`, { waitUntil: 'networkidle' });
await page.screenshot({ path: join(outDir, 'settings-account.png'), fullPage: true });

await browser.close();
console.log(`Wrote captures under ${outDir}`);
