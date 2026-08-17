// Страница одной работы приходит с сервера готовой. Здесь остаётся то, чего
// в разметке не выразить: жест «подержать, чтобы разглядеть», и просмотр
// во весь экран. Если скрипт не загрузился, страница остаётся страницей —
// работа видна, характеристики на месте, файл скачивается.

import { openLightbox } from './lightbox.js';

const frame = document.querySelector('#work-frame');
const picture = document.querySelector('#work-picture');

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

if (!comparable) {
  frame.addEventListener('click', () => openFull(picture));
} else {
  const loupe = document.querySelector('#work-loupe');
  const afterPane = loupe.querySelector('.loupe__pane--after');
  const beforePane = loupe.querySelector('.loupe__pane--before');

  // Натуральные размеры мастера — из атрибутов, а не из `naturalWidth`:
  // по причине, изложенной выше, `naturalWidth` под `srcset` отдаёт не то.
  // В атрибутах стоит то, что измерено при сборке плашки.
  const master = {
    width: Number(picture.getAttribute('width')),
    height: Number(picture.getAttribute('height'))
  };

  // `src` — это адрес из атрибута, мастер; `currentSrc` был бы выбранной
  // копией. Стеклу нужен первый: в нём и живёт разница, которую показывают.
  const paint = (pane, source) => {
    pane.style.backgroundImage = `url("${source}")`;
    // Оба файла разложены в одних координатах — координатах мастера. Для
    // «после» это натуральный размер, для «до» — растяжение, то самое,
    // которому файл подвергнется на большом экране. Отсюда же берётся то,
    // что участок сцены продолжается через шов: сдвиг фона у половин общий.
    pane.style.backgroundSize = `${master.width}px ${master.height}px`;
  };
  paint(afterPane, picture.src);
  paint(beforePane, document.querySelector('#work-before').src);

  // Мастер страницей не загружается: `sizes` у проёма — 562 px, и по srcset
  // браузер берёт копию 960w. Стеклу нужен именно мастер, иначе «1:1» будет
  // не 1:1, а враньём в четыре мегабайта. Заказываем его, пока рука идёт
  // к работе, — за это время он обычно и приходит.
  let warmed = false;
  const warm = () => {
    if (warmed) return;
    warmed = true;
    new Image().src = picture.src;
  };

  const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

  // Стекло — доля меньшей стороны работы, а не постоянная величина: у кадра
  // телефона в проёме около 260 px ширины, и окно шире работы село бы
  // на паспарту, где сравнивать нечего.
  const glassSize = box => clamp(Math.round(Math.min(box.width, box.height) * 0.55), 110, 260);

  /**
   * Поставить стекло на точку и набрать в него то, что под ним оказалось.
   *
   * `event` — указатель; `null` означает «середина работы» и приходит
   * с клавиатуры и с кнопки, где указателя над работой нет.
   *
   * Стекло показывает ровно тот участок, который собой закрывает, и на
   * касании тоже: подъём над пальцем сдвигает и окно, и участок вместе,
   * поэтому увеличительное стекло остаётся увеличительным стеклом, а палец
   * его не заслоняет.
   *
   * Подрезок две, и они независимы. Первая держит участок внутри файла:
   * у края стекло иначе набралось бы пустотой. Вторая держит само стекло
   * внутри проёма, потому что проём с `overflow: hidden` срезал бы ему бок.
   * У самого края работы они расходятся на несколько пикселей — стекло
   * упирается в край и там останавливается.
   *
   * Все измерения сняты до первой записи в стиль: иначе чтение размеров
   * после записи заставляло бы браузер пересчитывать раскладку на каждом
   * движении пальца.
   */
  function place(event) {
    const box = picture.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const glass = glassSize(box);
    // Палец закрывает собой стекло, поэтому на касании оно встаёт выше точки.
    // Мышь не закрывает ничего, и подъёма там нет.
    const lift = event && event.pointerType === 'touch' ? glass * 0.8 : 0;

    const px = event ? clamp(event.clientX - box.left, 0, box.width) : box.width / 2;
    const py = event ? clamp(event.clientY - box.top - lift, 0, box.height) : box.height / 2;

    // Работа стоит в проёме по высоте (`height: 100%` в styles.css), значит
    // экранный масштаб — это отношение показанной высоты к натуральной.
    const scale = box.height / master.height;
    const originX = clamp(px / scale - glass / 2, 0, master.width - glass);
    const originY = clamp(py / scale - glass / 2, 0, master.height - glass);
    const inFrameX = box.left - frameBox.left + px;
    const inFrameY = box.top - frameBox.top + py;

    const offset = `${-originX}px ${-originY}px`;
    afterPane.style.backgroundPosition = offset;
    beforePane.style.backgroundPosition = offset;
    loupe.style.setProperty('--glass', `${glass}px`);
    loupe.style.left = `${clamp(inFrameX - glass / 2, 0, frameBox.width - glass)}px`;
    loupe.style.top = `${clamp(inFrameY - glass / 2, 0, frameBox.height - glass)}px`;
  }

  const hide = () => frame.classList.remove('is-comparing');
  function show(event) {
    place(event);
    frame.classList.add('is-comparing');
  }

  // Щёлкнуть и подержать — на одном элементе, и различает их не элемент,
  // а время. Короткое нажатие, не сдвинувшееся с места, — щелчок; всё
  // остальное — «держат».
  //
  // Порог сдвига нужен отдельно от порога времени: работу разглядывают,
  // возя стеклом, и быстрый рывок мышью — это разглядывание, а не промах
  // по щелчку. Шесть пикселей — обычный запас на дрожание руки.
  const HOLD_MS = 250;
  const DRIFT = 6;

  let pressed = null;

  frame.addEventListener('pointerenter', warm);
  frame.addEventListener('focus', warm);

  frame.addEventListener('pointerdown', event => {
    // Иначе нажатие протащило бы за собой выделение и перетаскивание картинки.
    event.preventDefault();
    pressed = { at: event.timeStamp, x: event.clientX, y: event.clientY, still: true };
    show(event);
  });

  frame.addEventListener('pointermove', event => {
    if (!pressed) return;
    if (Math.abs(event.clientX - pressed.x) > DRIFT || Math.abs(event.clientY - pressed.y) > DRIFT) {
      pressed.still = false;
    }
    place(event);
  });

  frame.addEventListener('pointerup', event => {
    const click = pressed && pressed.still && event.timeStamp - pressed.at < HOLD_MS;
    pressed = null;
    hide();
    // Лайтбокс открывается после того, как стекло убрано: иначе оно осталось
    // бы висеть под ним и вернулось бы на экран при закрытии.
    if (click) openFull(picture);
  });

  // Уход указателя за край и отмена — не щелчок: стекло просто убирается.
  // Без этого оно осталось бы висеть на экране.
  for (const name of ['pointercancel', 'pointerleave']) {
    frame.addEventListener(name, () => {
      pressed = null;
      hide();
    });
  }

  // С клавиатуры два действия разводятся так же, как у обычной кнопки:
  // Enter срабатывает на нажатии и означает «сделать», пробел удерживается
  // и отпускается — им и держат.
  frame.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openFull(picture);
    } else if (event.key === ' ') {
      event.preventDefault();
      show(null);
    }
  });
  frame.addEventListener('keyup', event => {
    if (event.key === ' ') hide();
  });
  frame.addEventListener('blur', hide);

  // Стекло стоит в координатах проёма и посчитано по его размеру: при смене
  // ширины окна и то и другое меняется, а держать в этот момент никто ничего
  // не может — поэтому не пересчитываем, а убираем.
  addEventListener('resize', hide);
}

// Предложение реставрировать своё раскрывается, как только файл взяли.
//
// Сначала оно раскрывалось один раз за посещение, и отметка о показе
// лежала в `sessionStorage`: коллекцию смотрят подряд, и реплика,
// повторённая на пятой работе, казалась преследованием. На деле вышло
// обратное — реплика показывалась и пропадала навсегда, стоило
// перезагрузить страницу или уйти на соседнюю работу; вернуть её было
// нечем, кроме нового окна.
//
// Но неверен был и сам довод. Это не оклик, а ответ на нажатие, и
// незваной реплика не бывает по устройству: без нажатия её не бывает
// вовсе. Ответ же на одно и то же действие должен быть один и тот же,
// иначе кнопка в одинаковых обстоятельствах ведёт себя по-разному —
// а это дороже, чем повтор.
//
// Считается именно нажатие на кнопку: скачал браузер или нет, странице
// не сообщают. Правая кнопка и «сохранить как» мимо, и это правильно —
// там человек уже знает, чего хочет.
const offer = document.querySelector('#work-offer');
const download = document.querySelector('.actions .btn[download]');

if (offer && download) {
  download.addEventListener('click', () => offer.classList.add('is-offered'));
}
