// Проверка страниц для обхода. Ломается здесь молча и в сторону «страницы нет»:
// художник дорос до своей страницы, а записи о нём нет, — и страница просто
// не появилась; написание имени в каталоге сменилось — и работы ушли от
// художника без единой ошибки. Разбор — research/2026-09-23-browse-pages.md.
import { ARTISTS, MIN_WORKS, artistOf, displayName } from '../artists.js';

const problems = [];
const complain = what => problems.push(what);
const expect = (what, actual, wanted) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    complain(`${what}: ожидали ${JSON.stringify(wanted)}, вышло ${JSON.stringify(actual)}`);
};

// Работа в том виде, в каком её отдаёт галерея, но только с нужными полями.
const work = (ref, creator, origin = 'America', creatorKind) => ({
  ref,
  origin,
  provenance: { creator, ...(creatorKind ? { creatorKind } : {}) }
});

// Два написания одного человека сходятся, копия к нему не приписывается.
expect('Тайкан без годов', artistOf(work('a', 'Yokoyama Taikan'))?.slug, 'yokoyama-taikan');
expect('Тайкан с годами', artistOf(work('b', 'Yokoyama Taikan (1868-1958)'))?.slug, 'yokoyama-taikan');
expect(
  'копия после Коула',
  artistOf(work('c', 'After Thomas Cole (unidentified copyist)', 'America', 'unknown')),
  null
);
expect('не записанный художник', artistOf(work('d', 'Claude Monet')), null);
expect('имя записанного', displayName(work('e', 'Yokoyama Taikan (1868-1958)')), 'Yokoyama Taikan');
expect('годы снимаются с незаписанного', displayName(work('f', 'Kobayashi Kokei (1883-1957)')), 'Kobayashi Kokei');
expect('годы с вопросом', displayName(work('g', 'Kaji Tameya (?-1894)')), 'Kaji Tameya');
expect('порог', MIN_WORKS, 4);

if (problems.length) {
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\nобход: ${problems.length} проблем`);
  process.exit(1);
}
console.log(`обход: художников записано ${ARTISTS.length}`);
