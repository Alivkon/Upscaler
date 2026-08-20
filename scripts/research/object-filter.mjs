// Снимок предмета, а не плоская работа — и какого именно предмета.
//
// Ковёр, ваза, камея, облачение, комод — их фотографируют, и обоями они
// в общем случае не становятся. Но не все одинаково: кусок ткани, снятый
// в край кадра, — это плоский прямоугольник сплошного узора, то есть ровно
// то, чем обои и являются. Поэтому правило не отвечает «да/нет», а называет
// разряд, и что с разрядом делать — решает вызывающий.
//
// 17 августа Charlie решил убирать и ткань тоже. Решение живёт на листе
// отбора отдельной галочкой, а не здесь: разряд — это описание работы,
// и оно не меняется оттого, что поменялся вкус. `isObject` ниже оставлен
// как был, у него разряды прежние.
//
// Разряды:
//   'textile' — плоский кусок ткани: покрывало, ковёр, кайма, панель.
//   'garment' — сшитое в объём и носимое: риза, шаль, сумка. Убираем: складки,
//               тень, силуэт — узор виден кусками.
//   'thing'   — предмет в пространстве: ваза, лампа, медальон, дверь. Убираем.
//
// Разряд читается не по словам-материалам, а по тому, КАК записан материал:
// у плоской работы это краска на подложке («oil on canvas», «ink and color
// on silk»), у предмета — опись того, из чего он сделан («Porcelain»,
// «Cotton and wool»). Слово «silk» встречается в пуле 305 раз и само по себе
// не значит ничего.

// Вещество, из которого предмет сделан.
const SOLID =
  /\b(porcelain|ceramic|stoneware|earthenware|jade|ivory|lacquer|terracotta|marble|bronze|brass|pewter|glass|bone|shell|alabaster|granite|jasperware|faience)\b/i;

// Слова ткацкого дела: они бывают только у ткани, не у картины на шёлке.
const TEXTILE =
  /\b(warp|weft|twill|satin weave|plain weave|tapestry|brocade|damask|embroider\w*|knotted|pile|velvet|woven|weave|raffia|camelid|fibers?|quilt\w*|appliqu)/i;

// «на подложке» — краска лежит на чём-то плоском.
const FLATSUP = /\b(on|over)\s+(paper|canvas|panel|silk|board|card|vellum|parchment|linen|ivory|copper|porcelain)\b/i;

// Живописный или печатный материал: значит, работа плоская.
const MEDIUM =
  /\b(oil|tempera|watercolou?r|gouache|ink|chalk|charcoal|graphite|pastel|etching|engraving|lithograph|woodcut|woodblock|albumen|gelatin|photograph|drypoint|mezzotint|aquatint|silverpoint)\b/i;

// Мебель и обстановка, названные в заголовке. Нужны потому, что музей пишет
// «color on wood; Painting» и про доску, и про расписную дверь: по материалу
// их не отличить. Список нарочно короткий и привязан к началу заголовка —
// «Vase of Flowers» это натюрморт, а не ваза, и такие слова сюда не берутся.
const THING =
  /^(pair of |a )?(painted )?(door|doors|chest|cabinet|screen|casket|trunk|desk|table|chair|cupboard|shutters?)\b/i;

// Носимое: сшито в объём, снимается на манекене или разложенным складками.
const WEAR =
  /\b(chasuble|cope|dalmatic|stole|vestment|mitre|robe|kimono|kosode|coat|jacket|dress|gown|skirt|shirt|tunic|cap|hat|bonnet|shoe|boot|glove|purse|bag|pouch|sash|apron|shawl|collar|headdress|costume|uniform|fan|umbrella|parasol|doll|puppet)\b/i;

// ...но кусок ткани остаётся куском, даже если назван по одежде, для которой
// предназначался: «Panel (Dress Fabric)», «Fragment from a Chasuble».
// Без этой оговорки из 29 «носимых» двенадцать оказывались плоскими отрезами.
const PIECE = /\b(fragment|panel|length|border|fabric|band|yardage|sample|swatch|width)\b/i;

export const objectKind = (technique, title) => {
  const k = technique ?? '';
  const t = title ?? '';
  if (THING.test(t)) return 'thing';
  if (!k) return null;
  if (FLATSUP.test(k) || MEDIUM.test(k)) return null;
  if (TEXTILE.test(k)) return WEAR.test(t) && !PIECE.test(t) ? 'garment' : 'textile';
  return SOLID.test(k) ? 'thing' : null;
};

// По умолчанию убираются предметы и одежда, ткань остаётся.
export const isObject = (technique, title) => {
  const kind = objectKind(technique, title);
  return kind === 'thing' || kind === 'garment' ? 1 : 0;
};
