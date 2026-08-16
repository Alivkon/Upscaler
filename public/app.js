// Адреса и переключение страниц.
//
// Три адреса: `/` — витрина, `/w/vl-0001` — одна работа, `/restore` — приёмка.
// У работы адрес настоящий, а не якорь: на неё приходят из поиска картинок,
// и ссылка на неё должна открываться сама по себе. Отдаёт эти адреса
// `server.js` тем же `index.html`.

import * as collection from './collection.js';
import { clearWork, showWork } from './work.js';
import { renderEmpty } from './intake.js';

const views = {
  collection: document.querySelector('#collection-view'),
  work: document.querySelector('#work-view'),
  intake: document.querySelector('#intake-view')
};

function render(pathname) {
  const work = /^\/w\/(.+)$/.exec(pathname);
  const name = work ? 'work' : pathname === '/restore' ? 'intake' : 'collection';
  for (const [key, section] of Object.entries(views)) section.hidden = key !== name;
  for (const item of document.querySelectorAll('.masthead__nav [data-path]')) {
    // «Коллекция» подсвечена и на странице одной работы: работа лежит в ней
    const current = (item.dataset.path === '/restore') === (name === 'intake');
    if (current) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  if (work) showWork(work[1]);
  else clearWork();
  collection.scheduleRefresh();
  scrollTo(0, 0);
}

function go(pathname) {
  if (pathname !== location.pathname) history.pushState(null, '', pathname);
  render(pathname);
}

// Один обработчик на всю страницу: карточки создаются заново при каждом
// обновлении витрины, и вешать на них слушатели по одному незачем.
document.addEventListener('click', event => {
  const path = event.target.closest('[data-path]');
  if (path) return go(path.dataset.path);
  // ссылка внутри карточки — это скачивание, перехватывать его не надо
  if (event.target.closest('a')) return;
  const card = event.target.closest('[data-ref]');
  if (card) go(`/w/${card.dataset.ref}`);
});

addEventListener('popstate', () => render(location.pathname));
document.addEventListener('visibilitychange', collection.scheduleRefresh);

renderEmpty();
render(location.pathname);
collection.load().catch(collection.showFailure);
