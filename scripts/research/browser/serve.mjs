// Сервер для браузерного опыта: раздаёт страницу и модели, принимает обратно
// готовые картинки. Нужен свой, а не python -m http.server, по двум причинам:
// POST для результатов и заголовки COOP/COEP — без них onnxruntime-web не
// получает SharedArrayBuffer и запасной путь на WASM идёт в один поток.
import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('/home/charlie/repos/Upscaler/')('sharp');
const [W, H] = [1440, 3120];

// Присланное сразу режется в обои и большой PNG выбрасывается: /tmp — это
// tmpfs на 16 ГБ, а полноразмерная четырёхкратная картинка весит до 60 МБ.
// Режет sharp тем же lanczos3 и теми же чёрными полями, что и ветка Topaz.
async function letterbox(buf, dest) {
  const s = await sharp(buf).resize({ width: W, height: H, fit: 'inside', kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
    .composite([{ input: s, gravity: 'centre' }]).jpeg({ quality: 92 }).toFile(dest);
}

const HERE = new URL('.', import.meta.url).pathname;
const OUT = path.join(HERE, 'out');
const PORT = 8779;
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.json': 'application/json', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.map': 'application/json' };

const head = (extra = {}) => ({
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  ...extra
});

const body = (req) => new Promise((res, rej) => {
  const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => res(Buffer.concat(c))); req.on('error', rej);
});

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (req.method === 'POST' && u.pathname.startsWith('/save/')) {
      const [, , model, name] = u.pathname.split('/');
      if (/[^\w.-]/.test(model) || /[^\w.-]/.test(name)) throw new Error('bad name');
      await fs.mkdir(path.join(OUT, model), { recursive: true });
      const buf = await body(req);
      const raw = path.join(OUT, model, name);
      await fs.writeFile(raw, buf);
      const m = await sharp(buf).metadata();
      await letterbox(buf, raw.replace(/\.png$/, '.jpg'));
      await fs.unlink(raw);
      console.log(`  saved ${model}/${name} ${m.width}×${m.height} (${(buf.length / 1e6).toFixed(1)}MB → jpg)`);
      res.writeHead(200, head()).end('ok');
      return;
    }
    if (req.method === 'POST' && u.pathname === '/log') {
      const line = (await body(req)).toString();
      await fs.mkdir(OUT, { recursive: true });
      await fs.appendFile(path.join(OUT, 'log.jsonl'), line.trim() + '\n');
      console.log(line.trim().slice(0, 220));
      res.writeHead(200, head()).end('ok');
      return;
    }
    const rel = u.pathname === '/' ? '/local.html' : u.pathname;
    const file = path.join(HERE, decodeURIComponent(rel));
    if (!file.startsWith(HERE)) throw new Error('nope');
    const st = await fs.stat(file);
    res.writeHead(200, head({ 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': 'no-store' }));
    fss.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(404, head({ 'Content-Type': 'text/plain' })).end(String(e.message));
  }
}).listen(PORT, '0.0.0.0', () => console.log(`http://localhost:${PORT}/local.html`));
