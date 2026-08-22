// Гоняет страницу в отдельном хромиуме с включённым WebGPU и показывает ВСЁ,
// что она говорит: console, ошибки, падения вкладки. Brave, к которому подключён
// браузерный инструмент, адаптера WebGPU не даёт совсем.
//
// Каждая картинка считается в СВОЁМ запуске браузера. Тяжёлые модели роняют
// вкладку на пятой-шестой (видеопамять у встроенной Arc общая с обычной), и один
// общий запуск терял весь остаток набора. Готовое лежит на сервере, поэтому
// перезапуск просто продолжает с того места.
//
//   node drive.mjs <model> <ep> [tile]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs/promises';

const [model = 'clearreality-x4-fix', ep = 'webgpu', tile = '192'] = process.argv.slice(2);
const CH = '/home/charlie/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const HERE = new URL('.', import.meta.url).pathname;

const man = JSON.parse(await fs.readFile(`${HERE}manifest.json`, 'utf8'));
const outDir = `${HERE}out/${model}_${ep}`;
const done = await fs.readdir(outDir).catch(() => []);
const todo = man.filter((p) => p.need > 1.02 && !done.includes(`${p.id}.jpg`)).map((p) => p.id);
console.log(`${model} · ${ep} · tile ${tile} · осталось ${todo.length}: ${todo.join(' ')}`);

for (const id of todo) {
  const url = `http://localhost:8779/local.html?model=${model}&ep=${ep}&tile=${tile}&only=${id}`;
  const browser = await puppeteer.launch({
    executablePath: CH, headless: false,
    env: { ...process.env, DISPLAY: ':1', XDG_RUNTIME_DIR: '/run/user/1000' },
    args: ['--no-sandbox', '--ozone-platform=x11', '--enable-unsafe-webgpu',
           '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--window-size=700,500'],
    defaultViewport: null
  });
  const page = (await browser.pages())[0] || await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (!/404|favicon/.test(t)) console.log(`[${m.type()}] ${t.slice(0, 300)}`); });
  page.on('pageerror', (e) => console.log(`[pageerror] ${String(e).slice(0, 300)}`));
  page.on('error', (e) => console.log(`[crash] ${String(e).slice(0, 300)}`));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('log').textContent.includes('DONE'),
      { timeout: 15 * 60 * 1000, polling: 1000 });
  } catch (e) { console.log(`[${id}] прервано: ${String(e.message).slice(0, 200)}`); }
  await browser.close().catch(() => {});
}
console.log('DONE-ALL');
