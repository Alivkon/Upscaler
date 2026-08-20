// Монохром определяется по описанию материала, а не по пикселям.
//
// Почему не по пикселям. Рисунок пером по серой бумаге, подклеенной на кремовый
// паспарту, набирает цветность вне сепии 76–85 — против 45 у «Interior of
// a Church», которую Charlie взял в образцы. Мера цветности видит насыщенные
// несепийные пиксели и не видит, что все они одного тона: синеватая бумага
// против кремовой подложки — это одна ось, а не набор цветов.
//
// Число цветовых клеток тоже не разделяет, и это проверено на трёх порогах
// доли (5%, 2%, 0.5%, 0.1%): рисунки Гравло дают ровно 2 клетки, но столько же
// дают «Interior of a Church», «Interior of the Pantheon», «In the Woods»
// и «Aizen Myōō». Любой порог, убирающий первые, убирает и вторые.
// Мера пробовалась в этой сессии трижды; заново её изобретать не нужно.
//
// А в поле материала всё написано словами: «Pen and black ink, with traces
// of graphite, on gray laid paper».

// Инструмент, который сам по себе цвета не даёт.
const MONO = /\b(pen|ink|graphite|chalk|charcoal|crayon|pencil|etching|etched|engraving|engraved|drypoint|lithograph|woodcut|woodblock|mezzotint|aquatint|silverpoint|drawing|wash)\b/i;

// Слово, означающее, что цвет всё-таки есть. Проверяется после MONO и отменяет
// его: «woodblock print in colors» и «chromolithograph» — цветные работы.
const COLOUR = /\b(colou?rs?|colou?red|watercolou?r|gouache|tempera|pastel|oil|acrylic|polychrome|chromo\w*|distemper|enamel|fresco|dye|pigments?|opaque|gold|silver|vermilion|indigo|ultramarine|azurite|malachite)\b/i;

// Белила — не цвет, а подсветка. «Brush and brown ink and brown wash,
// heightened with white gouache» — одноцветный рисунок, но слово «gouache»
// в COLOUR стоит и отменяло бы монохром. Вырезаем оборот целиком, а не
// добавляем «white» в исключения: цвет тут отменяет не белое само по себе,
// а то, что оно нанесено поверх. На пуле в 1451 работу поправка добавляет
// пять работ, все верно (Olympus, Mars, The Sick Stag и ещё две); ни один
// из двенадцати образцов Charlie от неё не страдает.
//
// Золото при этом остаётся цветом. «Prepared with gold paint» бывает про
// паспарту, а не про работу, и такие случаи правило пропускает — но отличить
// их от настоящей позолоты по тексту нельзя, а ошибка в эту сторону дешевле:
// пропуск видно глазом на листе отбора, лишнее удаление — нет.
const heightening = k => k.replace(/heightened with[^,;.]*/gi, '').replace(/\b(lead |zinc )?white (gouache|chalk|paint)\b/gi, '');

export const monochrome = technique => {
  const k = technique ?? '';
  return MONO.test(k) && !COLOUR.test(heightening(k)) ? 1 : 0;
};
