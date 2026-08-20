// Отсев портретов настоящих людей по названию работы.
//
// Зачем: у Кливленда поля жанра нет, Wikidata знает жанр у меньшей части
// работ, а самый частый портрет в дампе называется просто «Martin Luther
// Hurlbut» — ни одного слова, за которое цепляется правило по ролям
// (portrait, lady, saint). Нужен признак «это имя человека».
//
// Что НЕ отсеивается: боги, святые, герои мифа и книг. «Krishna and Gopis»,
// «St. Christopher», «Hamlet: Polonius and Hamlet» остаются — Charlie их берёт.
// Уходят только настоящие люди: заказчики портретов, актёры, полководцы.
//
// Откуда берутся имена. Первый источник — сам дамп: поле автора у каждой
// записи заведомо содержит имя человека. Тринадцать тысяч авторских строк
// дают три тысячи именных токенов, внешнего справочника не требуется.
// Второй — отсутствие слова в английском словаре: «Hurlbut», «Apthorp»,
// «Jingyang» в нём не значатся, а «bamboo», «landscape», «evening» значатся.
// Словарь берётся только из строчных статей: заглавные статьи Debian содержат
// и «Martin», и «Washington», и «Princeton», то есть ровно то, что мы ищем,
// и как отрицательный признак бесполезны.
//
// Запуск:
//   node scripts/research/name-filter.mjs               — точность и полнота на разметке
//   node scripts/research/name-filter.mjs pool.json     — отсев файла с полем t
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const HOME = process.env.HOME;
const DICT = '/usr/share/dict/american-english';
const INDEX = `${HOME}/tessarum-harvest/browse-all/index.json`;
const LABELS = 'scripts/research/name-filter-labels.json';

// --- словари ---------------------------------------------------------------

// Только строчные статьи: заглавные — имена собственные, они бы съели признак.
const words = new Set(
  (await fs.readFile(DICT, 'utf8'))
    .split('\n')
    .filter(w => /^[a-z]+$/.test(w))
);

// Скобки в авторской строке — это гражданство и годы жизни. «Master of the
// Playing Cards» и «Workshop of…» — прозвища по работе, а не имена.
const gaz = new Map();
{
  const index = JSON.parse(await fs.readFile(INDEX, 'utf8'));
  for (const record of Object.values(index))
    for (const creator of record.creators ?? []) {
      const bare = creator.replace(/\([^)]*\)/g, ' ').replace(/[,;].*$/, ' ');
      if (/\b(master of|school|workshop|unknown|circle of|follower of)\b/i.test(bare)) continue;
      for (const token of bare.split(/[^A-Za-zÀ-ɏ'’-]+/)) {
        if (token.length < 2) continue;
        const key = token.toLowerCase();
        gaz.set(key, (gaz.get(key) ?? 0) + 1);
      }
    }
}

// --- списки ----------------------------------------------------------------

const STOP = new Set(`a an the of and or in on at with from to for by his her their its this that
into under over near before after between through against upon out off down up as is are was were
be been being not no nor but so than then when where while who whom which what how why`.split(/\s+/));

// Служебные слова чужих языков. Их присутствие означает, что название
// описательное, и признак «слова нет в английском словаре» ничего не значит:
// там его нет ни у чего. «Repas des Bûcherons» — не имя человека.
const FOREIGN = /\b(la|le|les|un|une|de|des|du|au|aux|et|en|sur|dans|avec|pour|par|sous|il|lo|gli|di|della|dei|nel|con|per|der|die|das|den|dem|und|von|zur|zum|mit|auf|im|el|los|las|y|van|het|een|op)\b/i;

const HONORIFIC = new Set(`mr mrs ms miss master mme madame monsieur mlle mademoiselle sir lady lord
dame don dona signor signora signore herr frau rev reverend dr doctor capt captain col colonel
lt lieutenant gen general maj major sgt sergeant senator governor president judge king queen prince
princess duke duchess count countess baron baroness earl marquis marquise emperor empress
pope cardinal bishop abbot shogun maharaja maharani infante infanta sultan shah tsar czar`.split(/\s+/));

// Роль без имени: «Portrait of a Woman» — тоже портрет настоящего человека.
const ROLE = /\b(portrait|portraits|self-portrait|bust|effigy|likeness)\s+of\b/i;

// Боги, святые и вымышленные. Правило на них молчит.
//
// В списке нарочно нет обычных имён — Иосифа, Давида, Анны, Екатерины,
// Фрэнсиса, Георгия: они и человеческие тоже, и запрет по ним убил бы
// «Portrait of Dr. Karl Joseph Meyer» и «David R. Strang». Святость таких
// работ ловится не именем, а словом saint / virgin / holy рядом.
const DIVINE = new Set(`krishna radha gopis shiva parvati brahma vishnu ganesha lakshmi durga kali
hanuman rama sita arjuna bhima draupadi nala damayanti kaliya balarama subhadra jagannath rukmini
rukma vajradhara nairatmya virupa kanha mahasiddha mahasiddhas apsara buddha shakyamuni amitabha
maitreya guanyin kannon avalokiteshvara manjushri samantabhadra bodhidharma bodhisattva tara
christ satan lucifer magdalene lazarus samson delilah goliath elisha elijah jonah tobias susanna
herod pilate khujasta chanda lorik bijan shahr-arai
venus jupiter juno apollo minerva mercury bacchus ceres neptune vulcan cupid psyche syrinx orpheus
eurydice narcissus daphne europa leda danae perseus andromeda hercules heracles achilles hector
odysseus penelope ajax aeneas dido medea circe prometheus atlas flora fortuna athena aphrodite eros
zeus hera hermes artemis zephyre
faust mephistopheles mephistopheles hamlet ophelia polonius othello desdemona prospero caliban
quixote punchinello harlequin columbine pierrot pantalone mab oberon titania puck`.split(/\s+/));

// Слово рядом с именем, означающее, что назван святой или божество.
// Проверено на выброшенных: без второй строки уходили «Rakkan (Arhat)»,
// «Guardian Kings: Dhrtarastra and Virupaksa» и «Pichvai of Shri Nathji» —
// имена там есть, но это божества, и Charlie их оставляет.
const SACRED = /\b(saint|sainte|santa|santo|san|st\.?|virgin|madonna|holy|christ|jesus|buddha|bodhisattva|deity|deities|god|gods|goddess|apostle|evangelist|prophet|martyr|angel|angels|nymph|nymphs|satyr|muse|trinity|passion|crucifixion|nativity|annunciation|adoration)\b|\b(arhat|rakkan|luohan|guardian king|deva|devi|naga|yaksh\w*|immortals?|sennin|ecce homo|pichvai|shri|dharmapala|lokapala|mandala|thangka|dhrtarastra|virupaksa|virudhaka|vaishravana|jizo|fudo|kishimojin|benten|hotei)\b/i;

// Название места, построенное из имени: «Convent of St. Saba», «Castle of
// Martinsburg», «Views of Rome». Имя есть, человека на картинке нет.
const PLACE = /^(a\s+)?(view|views|panorama|prospect|plan|map)\b|\b(convent|castle|château|chateau|church|cathedral|abbey|monastery|chapel|temple|shrine|mosque|city|town|village|street|bridge|gate|tower|palace|hospital|college|school|library|museum|theat(re|er)|hotel|inn|tavern|farm|mill|garden|square|harbou?r|port|canal|river|lake|mount|island|valley|house|teahouse|pavilion)\b/i;

// Работа не о человеке, а о чём-то, сделанном по поводу человека или по чужому
// образцу: «Design for a Frame for the Portrait of…», «Landscape in the Style
// of Juran», «Bookplate: Edmund Poley of Badley».
const ABOUT = /^(design|study|sketch|model|cast|copy|frame|monument|tomb|medal|coin|seal|bookplate|frontispiece|title\s*page|cover|text|folio|preface|album|page|leaf|plate)\b|\bin the (style|manner) of\b|\bcopy of\b|\bservice\b|\bsheet music\b|\bby [A-Z]/i;

// --- правило ---------------------------------------------------------------

const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const key = t => strip(t).toLowerCase().replace(/[’']s$/, '').replace(/[.'’-]+$/, '');

// Попадание в список имён засчитывается не всякое. Среди авторов есть Little,
// Fair, Bell — фамилии, совпадающие с обычными словами. Если слово есть
// в словаре, нужен вес: у «martin» шестьдесят три автора, у «little» — три.
const named = t => {
  const k = key(t);
  const hits = gaz.get(k) ?? 0;
  return words.has(k) ? hits >= 20 : hits >= 2;
};

// Прилагательное перед обращением означает описание, а не человека:
// «Young Lady», «Old Master». Настоящее обращение стоит вплотную к имени.
const ADJ = new Set(`young old little fair beautiful elegant seated standing reclining sleeping
dead poor rich great grand small first second third new`.split(/\s+/));

// Иностранные слова места: они не в английском словаре и потому выглядят
// именами. «Ponte Vecchio», «Chemin de Toulon», «Le bord au Gein» — места.
const FOREIGN_PLACE = new Set(`ponte pont piazza campo chemin rue bord quai porta via calle plaza
strada corso vicolo borgo torre castello palazzo chateau schloss platz strasse gasse brucke kirche
dom kloster burg berg tal see stadt dorf`.split(/\s+/));

// Диакритика — надёжный признак французского или итальянского названия;
// служебные слова там есть не всегда («Baigneuse assise», «Cafès Chantants»).
const accented = s => s !== strip(s);

function segment(title) {
  // У серийных названий предмет стоит после последнего двоеточия:
  // «The Passion: The Last Supper» — про сцену, не про серию.
  let s = title.includes(':') ? title.slice(title.lastIndexOf(':') + 1) : title;
  // Скобки с пометой издания или стороны листа выбрасываем, содержательные
  // («Portrait of a Woman (Judith Colman Bulfinch?)») оставляем.
  s = s.replace(/\(([^)]*)\)/g, (all, inner) =>
    /\b(recto|verso|vol\.?|no\.?|plate|pl\.?|par |by |ed\.|edition|service|series|from|r\.\s*\d)\b/i.test(inner) ? ' ' : ` ${inner} `
  );
  return s.trim();
}

const tokens = s => s.split(/[^A-Za-zÀ-ɏ'’-]+/).filter(t => t.length > 1 && !/^[IVXLC]+$/.test(t));

// Токен встречался в авторской строке — значит это имя, даже если слово есть
// в словаре: «martin» — и птица, и имя шестидесяти трёх авторов.
const nameLike = token => {
  const k = key(token);
  if (STOP.has(k) || FOREIGN_PLACE.has(k)) return false;
  if (named(token)) return true;
  return !words.has(k);
};

export function looksLikePerson(title) {
  const whole = title.trim();
  const s = segment(title);
  const toks = tokens(s);
  const all = tokens(whole);

  // Божественное и вымышленное — мимо, что бы дальше ни нашлось.
  if (all.some(t => DIVINE.has(key(t)))) return 0;
  if (SACRED.test(whole)) return 0;
  // Место и «работа по поводу» проверяются по всему названию, а не по хвосту:
  // «Views of Rome: The Isola Tiberina» — про Рим, хотя после двоеточия Рима нет.
  if (PLACE.test(whole) || ABOUT.test(whole)) return 0;
  if (all.some(t => FOREIGN_PLACE.has(key(t)))) return 0;

  // Обращение считается только вплотную к имени: «Sir Seymour Haden»
  // и «Cardinal Manning» — люди, «Our Lady of Good Counsel» и «The Fourth King
  // of Hell» — нет, там дальше предлог. После обращения имя опознаётся
  // не словарём, а положением: доказательство уже дало само обращение.
  for (let i = 0; i < toks.length - 1; i++) {
    if (!HONORIFIC.has(key(toks[i]))) continue;
    if (i > 0 && ADJ.has(key(toks[i - 1]))) continue;
    if (STOP.has(key(toks[i + 1]))) continue;
    if (/^[A-ZÀ-Þ]/.test(toks[i + 1])) return 1;
  }
  if (ROLE.test(whole)) return 1;

  const content = toks.filter(t => !STOP.has(key(t)) && !FOREIGN.test(key(t)));
  if (!content.length) return 0;

  // Предлог места между двумя именными словами: «Stratford on Avon»,
  // «The Fair at Impruneta». Человека так не называют.
  for (let i = 1; i < toks.length - 1; i++)
    if (/^(on|at|in|near|upon|by|beside)$/i.test(toks[i]) && nameLike(toks[i - 1]) && nameLike(toks[i + 1])) return 0;

  // Имя внутри повествовательного названия. Целиком именем такое название
  // не выглядит — «Maximilian Makes Peace with Henry VII» полно обычных слов, —
  // поэтому ищется пара: два подряд или двое через «and». Оба слова должны
  // быть в списке имён по-настоящему, одной незнакомости словарю мало,
  // иначе сюда попадут все чужеязычные названия разом.
  const pair = (a, b) => named(a) && named(b) && /^[A-ZÀ-Þ]/.test(a) && /^[A-ZÀ-Þ]/.test(b);
  for (let i = 0; i < toks.length - 1; i++) {
    if (pair(toks[i], toks[i + 1])) return 1;
    if (i > 0 && /^and$/i.test(toks[i]) && pair(toks[i - 1], toks[i + 1])) return 1;
  }

  const hits = content.filter(nameLike);
  // Признак срабатывает, только когда именем выглядит всё название целиком.
  // Иначе «Yutai Peak» и «Haboku, Splashed Ink Landscape» — тоже имена:
  // нарицательное слово рядом означает, что названо место или вещь, не человек.
  // Фамилия сплошь и рядом совпадает с обычным словом: Cooper — бондарь,
  // Barber — брадобрей, Stone — камень. Одно такое слово прощается, но только
  // если рядом стоит настоящее попадание в список имён: у «Thomas» сто сорок
  // четыре автора, и тогда «Thomas Abthorpe Cooper» — человек. Без этого
  // условия сюда же попадёт «Yutai Peak».
  // Послабление только с трёх слов и только если обычное слово не звание:
  // «Bourgeois de Paris» — сословие, «Young Lady» — описание, а не Cooper.
  const slack =
    content.length >= 3 && content.some(named) && !content.some(t => HONORIFIC.has(key(t))) ? 1 : 0;
  if (content.length - hits.length > slack) return 0;
  // Имя пишут с большой буквы всё целиком. Строчное содержательное слово
  // означает описание, а не имя: «Baigneuse assise» — сидящая купальщица,
  // и по-французски это два незнакомых словарю слова, как «Frans Snyders».
  if (!content.every(t => /^[A-ZÀ-Þ]/.test(t))) return 0;
  // На чужом языке признак «нет в словаре» не работает — там нет ничего:
  // «Baigneuse assise» и «Repas des Bûcherons» выглядят именами ровно так же,
  // как «Eugène Delacroix». Требуем настоящего попадания в список имён.
  if (FOREIGN.test(s) || accented(s)) return content.some(named) ? 1 : 0;
  // Одного незнакомого слова мало: «Dordrecht», «Olevano», «Vallkulla» — города
  // и вещи. Двух хватает, одного — только если оно есть в списке имён.
  if (content.length >= 2) return 1;
  return named(content[0]) ? 1 : 0;
}

// --- проверка --------------------------------------------------------------

// Только при запуске файла напрямую. Раньше проверка шла и при импорте: любой,
// кто брал отсюда `looksLikePerson`, получал вместе с ней разбор чужих
// аргументов командной строки и падение на первом же незнакомом флаге.
const cli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const target = cli ? process.argv[2] : undefined;
if (!cli) {
  // ничего: модуль подключён ради правила, а не ради проверки
} else if (!target) {
  const rows = JSON.parse(await fs.readFile(LABELS, 'utf8'));
  const tp = [], fp = [], fn = [];
  for (const r of rows) {
    const got = looksLikePerson(r.t);
    if (got && r.y) tp.push(r.t);
    else if (got && !r.y) fp.push(r.t);
    else if (!got && r.y) fn.push(r.t);
  }
  const precision = tp.length / Math.max(1, tp.length + fp.length);
  const recall = tp.length / Math.max(1, tp.length + fn.length);
  console.log(`размечено ${rows.length}, из них портретов настоящих людей ${rows.filter(r => r.y).length}`);
  console.log(`сработало ${tp.length + fp.length}: верно ${tp.length}, ложно ${fp.length}, пропущено ${fn.length}`);
  console.log(`точность ${(precision * 100).toFixed(1)}%  полнота ${(recall * 100).toFixed(1)}%`);
  console.log(`\nложные срабатывания (${fp.length}) — эти работы правило выбросит зря:`);
  for (const t of fp) console.log(`  ${t}`);
  console.log(`\nпропуски (${fn.length}) — портреты, которые правило оставит:`);
  for (const t of fn) console.log(`  ${t}`);
} else {
  const pool = JSON.parse(await fs.readFile(target, 'utf8'));
  const kept = pool.filter(w => !looksLikePerson(w.t ?? w.title ?? ''));
  console.log(`${pool.length} на входе, ${pool.length - kept.length} с именем человека, ${kept.length} осталось`);
  const out = target.replace(/\.json$/, '-noname.json');
  await fs.writeFile(out, JSON.stringify(kept));
  console.log(out);
}
