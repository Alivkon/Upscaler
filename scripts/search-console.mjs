// Search Console — что Google делает с витриной до того, как человек до неё
// дошёл: показал ли, по какому запросу и на какой строке. Журнал видит только
// дошедших, поэтому эти числа стоят на доске рядом с ним, а не вместо него.
//
// Картинки и веб запрашиваются раздельно и так же хранятся, суммы нет нигде.
// Для витрины обоев главная вкладка — картинки, и в сумме именно она тонет:
// первая неделя дала 20 показов на позиции 51 в картинках и 12 на 7,8 в вебе
// (`research/2026-09-12-HANDOVER-analytics.md`) — средняя из двух не описала бы
// ни то, ни другое.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

export const SITE = 'sc-domain:tessarum.com';
export const TYPES = ['image', 'web'];

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Окно — неделя, а не сутки доски: показов у витрины единицы в день, и дневное
// окно почти всегда пусто. Кончается окно не сегодня: окончательные сутки Google
// отдаёт с опозданием в два-три дня, и пустой хвост читался бы как «перестали
// показывать».
const DAYS = 7;
const LAG = 3;

// Вход сервисным аккаунтом — подписанный JWT в обмен на токен на час.
// Библиотека Google для этого не нужна: вся процедура — одна подпись RS256.
// Токен нигде не печатается, как и ключи в AGENTS.md.
async function tokenOf(keyFile) {
  const key = JSON.parse(await fs.readFile(keyFile, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({
    iss: key.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  })}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Google не принял ключ: ${body.error_description || body.error}`);
  return body.access_token;
}

async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  // Самый частый отказ — 403: аккаунт не добавлен пользователем ресурса
  // в самой Search Console. Текст Google называет это прямо, его и отдаём.
  if (!response.ok) throw new Error(`Search Console отказала (${response.status}): ${result.error?.message}`);
  return result.rows || [];
}

// Снимок целиком: итог, дни, запросы и страницы — по каждому типу поиска.
// Итог запрашивается отдельно, а не складывается из запросов: редкие запросы
// Google не называет, и сумма по ним всегда меньше настоящих показов.
export async function searchReport(keyFile) {
  const token = await tokenOf(keyFile);
  const day = back => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);
  const window = { from: day(LAG + DAYS - 1), to: day(LAG) };
  const report = { site: SITE, window, fetched: new Date().toISOString() };
  for (const type of TYPES) {
    const ask = dimensions =>
      query(token, { startDate: window.from, endDate: window.to, type, dimensions, rowLimit: 25 });
    const [total, byDay, byQuery, byPage] = await Promise.all([ask([]), ask(['date']), ask(['query']), ask(['page'])]);
    report[type] = { total: total[0] ?? null, byDay, byQuery, byPage };
  }
  return report;
}
