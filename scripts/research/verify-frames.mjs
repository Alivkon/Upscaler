#!/usr/bin/env node
// Сверка выпущенных кадров с плитой: вырезать проём по записанному правилу
// и сравнить с тем кадром, который лежит на диске.
//
// ЗАЧЕМ ОН ЕСТЬ ФАЙЛОМ. Правило кадра записано в пикселях плиты ПОСЛЕ `trim`,
// и любая правка `trim` двигает начало отсчёта: снял 40 слева — весь кадр
// уехал на 40. Ошибка не роняет сборку и не видна в размерах, она видна
// только на самой картинке. Способ проверки переписывался руками дважды за
// день 23.08 и оба раза выбрасывался; здесь он лежит, чтобы третий раз его
// не сочиняли.
//
// ЧТО ЗНАЧАТ ЧИСЛА. Средняя разность по яркости на серых миниатюрах 64×64.
// Шум JPEG около 2 из 255, чужой кадр около 30. Порог 4 разделяет их с
// запасом — замерено на 90 кадрах.
//
//   node scripts/research/verify-frames.mjs                    вся витрина
//   node scripts/research/verify-frames.mjs vl-0028,vl-0139    перечисление
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IMG = path.join(ROOT, 'images');
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;

// Те же пропорции и та же арифметика, что у генератора. Повторены, а не
// импортированы: проверка не должна брать ответ у того, кого проверяет.
const RATIOS = { phone: 9 / 19.5, tall: 9 / 16, wide: 16 / 9 };
const windowSize = (ratio, w, h) =>
  w / h > ratio ? { width: Math.round(h * ratio), height: h } : { width: w, height: Math.round(w / ratio) };
const frameCrop = (rule, kind) => {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return null;
  if (!Object.keys(rule).some(key => key in RATIOS)) return rule;
  return rule[kind] ?? (kind === 'tall' ? rule.phone : null) ?? null;
};

const THRESHOLD = 4;
const N = 64;
const grey = buf => sharp(buf).greyscale().resize(N, N, { fit: 'fill' }).raw().toBuffer();
const diff = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
};

const entries = [];
for (const name of (await fs.readdir(path.join(IMG, 'manifest'))).filter(n => n.endsWith('.json'))) {
  const parsed = JSON.parse(await fs.readFile(path.join(IMG, 'manifest', name), 'utf8'));
  if (Array.isArray(parsed)) entries.push(...parsed);
}

let worst = 0, worstAt = '', checked = 0;
const bad = [];
for (const entry of entries) {
  if (only && !only.has(entry.ref)) continue;
  const plate = sharp(path.join(IMG, entry.file));
  for (const [kind, ratio] of Object.entries(RATIOS)) {
    const crop = entry.crops?.[kind];
    if (!crop) continue;
    const box = windowSize(ratio, entry.width, entry.height);
    const rule = frameCrop(entry.crop === 'centre' ? null : entry.crop, kind);
    const clamp = (v, max) => Math.min(Math.max(v, 0), max);
    const left = rule?.left != null ? clamp(rule.left, entry.width - box.width) : Math.round((entry.width - box.width) / 2);
    const top = rule?.top != null ? clamp(rule.top, entry.height - box.height) : Math.round((entry.height - box.height) / 2);
    const cut = await plate.clone().extract({ left, top, ...box }).toBuffer();
    const d = diff(await grey(cut), await grey(await fs.readFile(path.join(IMG, crop.file))));
    checked++;
    if (d > worst) { worst = d; worstAt = `${entry.ref} ${kind}`; }
    if (d > THRESHOLD) bad.push(`${entry.ref} ${kind} — ${d.toFixed(1)}`);
  }
}

console.log(`сверено ${checked} кадров · худшее расхождение ${worst.toFixed(2)} (${worstAt})`);
console.log(`шум JPEG ≈2, чужой кадр ≈30, порог ${THRESHOLD}`);
if (bad.length) {
  console.log(`\nне совпали с плитой — ${bad.length}:`);
  for (const line of bad) console.log('  ' + line);
  process.exitCode = 1;
} else {
  console.log('\nвсе кадры вырезаны там, где записано');
}
