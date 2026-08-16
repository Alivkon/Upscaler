// Витрина: список работ и его пополнение.

import { entry } from './record.js';

const FAILURE = 'Коллекция временно недоступна.';
const REFRESH_INTERVAL = 300000;

const view = document.querySelector('#collection-view');
const grid = document.querySelector('#collection');
let refreshTimer;
let known = null;
let inFlight = null;

async function request(promote) {
  const response = await fetch(promote ? '/api/gallery/refresh' : '/api/gallery', {
    method: promote ? 'POST' : 'GET'
  });
  if (!response.ok) throw new Error(FAILURE);
  known = (await response.json()).images;
  return known;
}

// Список запрашивается один раз: страница одной работы берёт его отсюда же,
// и два одновременных обращения не должны дать двух запросов.
export function items() {
  if (known) return Promise.resolve(known);
  inFlight ??= request(false).finally(() => (inFlight = null));
  return inFlight;
}

export function show(images) {
  known = images;
  grid.className = 'collection';
  grid.replaceChildren(...images.map(entry));
}

export function showFailure() {
  grid.className = 'notice';
  grid.textContent = FAILURE;
}

export async function load(promote = false) {
  show(promote ? await request(true) : await items());
}

// Пополнение идёт, только пока витрина открыта и вкладка на виду: обновлять
// то, чего никто не смотрит, незачем.
export function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (document.hidden || view.hidden) return;
  refreshTimer = setTimeout(async () => {
    try {
      await load(true);
    } catch {
      // пополнение фоновое: неудача не должна стирать уже показанное
    }
    scheduleRefresh();
  }, REFRESH_INTERVAL);
}
