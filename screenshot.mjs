import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = '/tmp/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
];

const PAGES = [
  { slug: 'landing',  url: 'http://localhost:3000/' },
  { slug: 'join',     url: 'http://localhost:3000/join/DEMO01' },
  { slug: 'help',     url: 'http://localhost:3000/help' },
  { slug: 'help-slides', url: 'http://localhost:3000/help/slides' },
  { slug: 'help-poll-types', url: 'http://localhost:3000/help/poll-types' },
  { slug: 'auth',     url: 'http://localhost:3000/auth/login' },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  for (const pg of PAGES) {
    await page.goto(pg.url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const file = `${OUT}/${vp.name}-${pg.slug}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${vp.name} ${pg.slug} → ${file}`);
  }
  await ctx.close();
}

await browser.close();
console.log('done');
