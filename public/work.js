// Страница одной работы приходит с сервера готовой. Здесь остаётся то, чего
// в разметке не выразить: жест «подержать, чтобы увидеть, что было», и просмотр
// во весь экран. Если скрипт не загрузился, страница остаётся страницей —
// работа видна, характеристики на месте, файл скачивается.

import { openLightbox } from './lightbox.js';

const frame = document.querySelector('#work-frame');
const picture = document.querySelector('#work-picture');
const terms = document.querySelector('#work-terms');
const compareButton = document.querySelector('#work-compare');

// Сравнение есть не у всякой работы: у присланной посетителем исходника
// не остаётся вовсе. Что именно делает нажатие, решено на сервере и записано
// классом — здесь оно только читается.
const comparable = frame.classList.contains('is-comparable');

function compare(on) {
  frame.classList.toggle('is-degraded', on);
  terms.classList.toggle('is-degraded-type', on);
}

if (comparable) {
  // Держать можно и саму работу, и кнопку. Отпускание ловится вместе с уходом
  // указателя за край: без `pointerleave` «до» осталось бы висеть на экране.
  for (const element of [frame, compareButton]) {
    element.addEventListener('pointerdown', event => {
      // Иначе нажатие протащило бы за собой выделение и перетаскивание картинки.
      event.preventDefault();
      compare(true);
    });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) {
      element.addEventListener(name, () => compare(false));
    }
    element.addEventListener('keydown', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      compare(true);
    });
    element.addEventListener('keyup', event => {
      if (event.key === ' ' || event.key === 'Enter') compare(false);
    });
    element.addEventListener('blur', () => compare(false));
  }
} else {
  frame.addEventListener('click', () => openLightbox(picture.src, picture.alt));
}
