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

/**
 * Открыть во весь экран — всегда полный файл, тот, что стоит в `src`.
 *
 * У изображения с `srcset` рядом есть уменьшенная копия для показа, и взять
 * её было бы дешевле: браузер её уже загрузил. Но «во весь экран» тогда
 * перестало бы открывать во весь экран — на широком мониторе копия
 * растянулась бы, и жест соврал бы о том, что делает.
 *
 * Отличить случай, когда копии всё-таки хватает, по `naturalWidth` нельзя:
 * при дескрипторах `w` браузер отдаёт intrinsic-размер, поделённый на
 * выбранную плотность, — файл 1600 px в проёме 1080 px отчитывается как
 * 1080 px. Замерено на этой самой странице. Условие на нём выглядит
 * работающим и не срабатывает никогда, поэтому его здесь нет.
 *
 * Правило одно на все изображения страницы: и на работу, и на экранный кадр.
 */
const openFull = image => openLightbox(image.src, image.alt);

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
  frame.addEventListener('click', () => openFull(picture));
}
