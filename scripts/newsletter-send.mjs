// Отправить выпуск рассылки одному адресу через Resend.
//
//   node scripts/newsletter-send.mjs newsletter/2026-10-15.html кому@example.com
//
// Выпуск — готовый HTML в `newsletter/`, тема письма — его `<title>`: одно
// место на оба, иначе тема и заголовок однажды разошлись бы. Картинки
// и ссылки в нём — полные адреса tessarum.com, письмо ничего не вкладывает.
//
// Отправитель hello@tessarum.com, ответ туда же: Porkbun пересылает его
// хозяину, и подписчик, ответивший «unsubscribe», не видит личного адреса.
// Ссылки отписки в письме нет, отписка — ответом; это годится, пока
// подписчиков единицы.
//
// Адреса здесь не хранятся и не печатаются: список живёт на боевой машине
// (`mailing.js`, `MAIL_DIR`), и кому слать, решает тот, кто запускает.
// Ключ — `RESEND_API_KEY` из `.env`, с правом только отправлять.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FROM = 'Charlie at Tessarum <hello@tessarum.com>';
const REPLY_TO = 'hello@tessarum.com';

const [issue, to] = process.argv.slice(2);
if (!issue || !to) {
  console.error('нужно: node scripts/newsletter-send.mjs <выпуск.html> <адрес>');
  process.exit(1);
}

const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const key = env
  .match(/^RESEND_API_KEY=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, '');
if (!key) throw new Error('RESEND_API_KEY нет в .env');

const html = fs.readFileSync(path.resolve(issue), 'utf8');
const subject = html.match(/<title>([^<]+)<\/title>/)?.[1];
if (!subject) throw new Error(`у выпуска нет <title>: ${issue}`);

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html })
});
console.log(response.status, await response.text());
if (!response.ok) process.exit(1);
