// Значок «Try dimmed» в этикетке карточки: на указателе, на темах и у соседей
// под работой. Витрина привозит каждую
// работу сканом (`catalogueItems` в gallery.js), а у каждой работы, у которой
// есть приглушённый файл, в этикетке стоит этот значок: он переводит одну карточку —
// картинку и «Download wallpaper» — на приглушённый файл и обратно.
//
// Выбор не запоминается и на соседей не распространяется: это примерка одной
// работы, а не настройка сайта. Галочка «Dimmed» на странице работы
// (`dimmed.js`) — настройка, и запоминает она своё сама.
//
// Слушатель один на страницу, а не по одному на карточку: карточек больше ста
// пятидесяти, и все они устроены одинаково. Подпись значка меняет CSS по
// `data-shown` карточки (`.version` в styles.css), так что обе фразы стоят
// в разметке и скрипт слов не держит.

import { turn } from './versions.js';

document.addEventListener('click', event => {
  const link = event.target.closest('.version');
  if (!link) return;
  const card = link.closest('.item[data-shown]');
  const want = card.dataset.shown === 'dim' ? 'scan' : 'dim';
  for (const element of [card, ...card.querySelectorAll('[data-shown]')]) turn(element, want);
});
