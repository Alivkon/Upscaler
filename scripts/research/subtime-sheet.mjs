import fs from 'node:fs';
const SRC = process.env.SUBS || '/tmp/claude-1000/-home-charlie-repos-Upscaler/bfcc8174-90ee-4ea3-8336-98eee9912a10/scratchpad/subs.json';
const S = JSON.parse(fs.readFileSync(SRC,'utf8'));

const BLOCKS = ['0-4','4-8','8-12','12-16','16-20','20-24'];
const PARIS  = ['02–06','06–10','10–14','14–18','18–22','22–02'];
const DAYKEY = ['Mo','Tu','We','Th','Fr','Sa','Su'];
const DAYRU  = ['пн','вт','ср','чт','пт','сб','вс'];

// --- chi-square survival function (regularized upper incomplete gamma) ---
function gammaln(x){const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,.1208650973866179e-2,-.5395239384953e-5];let y=x,t=x+5.5;t-=(x+.5)*Math.log(t);let s=1.000000000190015;for(let j=0;j<6;j++)s+=c[j]/++y;return -t+Math.log(2.5066282746310005*s/x);}
function gammq(a,x){ if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=0;n<500;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-12)break;}return 1-sum*Math.exp(-x+a*Math.log(x)-gammaln(a));}
  let b=x+1-a,c=1e300,d=1/b,h=d;for(let i=1;i<500;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<1e-12)break;}
  return h*Math.exp(-x+a*Math.log(x)-gammaln(a)); }
const chiP=(chi,df)=>gammq(df/2,chi/2);

// one dimension (hours or days) of one subreddit: baseline, per-cell z, chi-square
function analyse(sub, keys, source){
  const b = keys.map(k=>({k, ...source[k]}));
  const N = b.reduce((a,c)=>a+c.n,0);
  const hits = b.map(c=>Math.round(c.hit/100*c.n));
  const p0 = hits.reduce((a,c)=>a+c,0)/N;
  let chi = 0;
  b.forEach((c,i)=>{
    c.se = Math.sqrt(p0*(1-p0)/c.n)*100;
    c.d  = c.hit - p0*100;              // effect: points away from this sub's usual rate
    c.z  = c.d / c.se;                  // evidence: how much of that is not chance
    const E=c.n*p0, Em=c.n*(1-p0);
    chi += (hits[i]-E)**2/E + ((c.n-hits[i])-Em)**2/Em;
  });
  return { cells:b, base:p0*100, chi, p:chiP(chi, keys.length-1), df:keys.length-1 };
}
for (const [name,s] of Object.entries(S)) {
  s.hours = analyse(name, BLOCKS, s.block);
  s.days  = analyse(name, DAYKEY, s.day);
}

// --- colour: hue+step from the EFFECT (so colour tracks the printed number),
//     fade toward the ground from the EVIDENCE (so weak cells recede). ---
const BLUE=[[10,'#9ec5f4'],[7,'#5598e7'],[4,'#2a78d6'],[2,'#184f95']];  // arms validated --ordinal on #111
const RED =[[10,'#f2a0a0'],[7,'#e06060'],[4,'#bf4040'],[2,'#8c2d2d']];
const GROUND='#111111';
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=h=>{const [r,g,b]=hex(h).map(c=>c/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;};
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function paint(c){
  let base = null;
  if (c.d >= 2)  for(const[t,h]of BLUE) if(c.d>=t){ base=h; break; }
  if (c.d <= -2) for(const[t,h]of RED)  if(-c.d>=t){ base=h; break; }
  if (!base) return { bg:'#211f1d', fg:'rgba(232,230,224,.5)', sure:0 };
  const sure = clamp((Math.abs(c.z)-0.4)/2.1, 0, 1);      // 0 = could be chance, 1 = solid
  const bg = mix(GROUND, base, 0.16 + 0.84*sure);
  const fg = lum(bg) > 0.30 ? `rgba(20,20,20,${(.6+.4*sure).toFixed(2)})`
                            : `rgba(232,230,224,${(.55+.45*sure).toFixed(2)})`;
  return { bg, fg, sure };
}
const fmtP = p => p<1e-4?'&lt;0,0001':p<0.01?p.toFixed(4).replace('.',','):p.toFixed(2).replace('.',',');
const verdict = p => p<0.05/9 ? ['yes','решает'] : p<0.05 ? ['maybe','похоже'] : ['no','нет'];

function grid(dim, keys, labels, sublabels, note){
  const order = Object.entries(S).sort((a,b)=>b[1][dim].chi-a[1][dim].chi);
  const rows = order.map(([name,v])=>{
    const A=v[dim];
    const tds = A.cells.map((c,i)=>{
      const {bg,fg}=paint(c);
      const ev = Math.abs(c.z)<1 ? 'в пределах случайного'
               : `${Math.abs(c.z).toFixed(1).replace('.',',')} σ — ${Math.abs(c.z)<1.5?'ещё может быть случайностью':'на случайность не похоже'}`;
      return `<td class="c" style="background:${bg};color:${fg}" data-t="r/${name}, ${labels[i]}${sublabels?' ('+sublabels[i]+')':''} · ${c.n} постов · медиана ${c.med} · ${c.hit}% в верхней четверти при обычных ${A.base.toFixed(0)}% · ${ev}"><b>${c.hit}<s>%</s></b><i>из&nbsp;${c.n}</i></td>`;
    }).join('');
    const [lvl,word]=verdict(A.p);
    return `<tr><th><a href="https://www.reddit.com/r/${name}/" target="_blank" rel="noopener">r/${name}</a>`
      + `<span>${v.perDay.toFixed(1)}/день · медиана ${v.med}</span></th>${tds}`
      + `<td class="p ${lvl}"><b>${word}</b><i>p&nbsp;${fmtP(A.p)}</i></td></tr>`;
  }).join('\n');
  return { rows, order };
}

const H = grid('hours', BLOCKS, PARIS, BLOCKS.map(b=>b+' UTC'));
const D = grid('days',  DAYKEY, DAYRU);

// Postpone's five ranked hours for r/iwallpaper, read off their page 12.09, Paris time
const PP=[[1,'пн 03',0],[2,'пт 12',2],[3,'вт 05',0],[4,'вт 11',2],[5,'вт 22',5]];
const iw=S.iWallpaper.hours;
const ppCells=BLOCKS.map((b,i)=>{
  const h=PP.filter(p=>p[2]===i); if(!h.length) return `<td class="c pp"></td>`;
  const c=iw.cells[i];
  return `<td class="c pp">${h.map(x=>`<u data-t="Postpone, совет №${x[0]}: ${x[1]} по Парижу. Измерено: ${c.hit}% в верхней четверти при обычных ${iw.base.toFixed(0)}%">#${x[0]}</u>`).join('')}</td>`;
}).join('');

const swatch = v => `<span style="background:${paint(v).bg}"></span>`;
const legEffect = [-12,-8,-5,-3,0,3,5,8,12].map(d=>swatch({d,z:d===0?0:9})).join('');
const legSure   = [3.5,2,1.2,0.6].map(z=>swatch({d:8,z})).join('');

const dayWins = D.order.filter(([,v])=>v.days.p<0.05/9).map(([n])=>n);
const daysFlat = D.order.filter(([,v])=>v.days.p>=0.05).length;

const html=`<!doctype html><meta charset="utf-8">
<title>Девять залов по часам</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:2rem 1.5rem 5rem;font:14px/1.45 system-ui,-apple-system,sans-serif;
  background:#111;color:#e8e6e0;-webkit-text-size-adjust:100%}
.wrap{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:0}
h1{font-size:1.25rem;font-weight:600;margin:0 0 .35rem}
p.lede{color:#9a978f;margin:0 0 1.6rem;max-width:68ch}
p.lede b{color:#cfccc4;font-weight:600}
code{font-size:.92em;color:#a8a59d}
h2{font-size:.98rem;font-weight:600;margin:2.6rem 0 .2rem;border-top:1px solid #2a2a27;padding-top:1.5rem}
p.sub{color:#8f8d86;margin:0 0 1.1rem;max-width:68ch;font-size:.86rem}
.scroll{overflow-x:auto}
table{border-collapse:separate;border-spacing:2px;font-variant-numeric:tabular-nums}
thead th{font-weight:500;color:#8f8d86;font-size:.72rem;padding:0 0 .35rem;text-align:center;line-height:1.25}
thead th small{display:block;color:#5f5e59;font-size:.92em}
thead th.corner,thead th.last{text-align:left}
tbody th{font-weight:500;text-align:left;padding:0 .85rem 0 0;white-space:nowrap;font-size:.82rem}
tbody th a{color:#e8e6e0;text-decoration:none;border-bottom:1px solid #3a3a36}
tbody th a:hover,tbody th a:focus-visible{border-bottom-color:#9a978f;outline:none}
tbody th span{display:block;color:#6f6d67;font-size:.74rem;font-weight:400}
td.c{width:78px;height:46px;text-align:center;border-radius:3px;padding:0;background:#1a1a19}
td.c b{display:block;font-size:.95rem;font-weight:600;line-height:1}
td.c b s{text-decoration:none;font-size:.72em;font-weight:500;opacity:.7;margin-left:.05em}
td.c i{display:block;font-style:normal;font-size:.63rem;opacity:.5;line-height:1.6;letter-spacing:.01em}
td.p{padding-left:.8rem;white-space:nowrap;line-height:1.2}
td.p b{font-size:.78rem;font-weight:600}
td.p i{display:block;font-style:normal;font-size:.68rem;color:#6f6d67}
td.p.yes b{color:#e8e6e0}
td.p.maybe b{color:#9a978f;font-weight:500}
td.p.no b{color:#5f5e59;font-weight:400}
tr.ppr td.c{height:26px;background:transparent}
tr.ppr th{color:#8f8d86;font-size:.74rem;font-weight:400;padding-top:.2rem}
td.pp u{display:inline-block;text-decoration:none;font-size:.7rem;color:#cfccc4;
  border:1px solid #4a4945;border-radius:999px;padding:0 .45rem;margin:0 1px;line-height:1.6}
.key{display:flex;gap:1.6rem;margin:1.4rem 0 0;color:#8f8d86;font-size:.75rem;flex-wrap:wrap}
.key div{display:flex;align-items:center;gap:.45rem}
.key i{display:flex;gap:2px;font-style:normal}
.key i span{width:22px;height:13px;border-radius:2px;display:block}
.key em{font-style:normal;color:#6f6d67}
ul{margin:.5rem 0 0;padding-left:1.1rem;color:#b8b5ad;max-width:70ch}
li{margin-bottom:.5rem}li b{color:#e8e6e0;font-weight:600}
#tip{position:fixed;pointer-events:none;background:#000;border:1px solid #3a3a36;border-radius:4px;
  padding:.35rem .6rem;font-size:.74rem;color:#e8e6e0;opacity:0;transition:opacity .1s;z-index:9;max-width:18rem;line-height:1.35}
@media(prefers-reduced-motion:reduce){#tip{transition:none}}
@media(max-width:640px){td.c{width:58px}tbody th{font-size:.74rem}}
</style>
<div class="wrap">
<h1>Когда постить: девять залов, измерено</h1>
<p class="lede"><b>Крупное число в клетке — доля постов этого отрезка, попавших в верхнюю
четверть зала по очкам</b>; «из 156» под ним — сколько всего постов в клетке, это делитель,
а не измеряемое. Цветом закрашено только крупное. У каждого зала своя
верхняя четверть, поэтому обычный уровень везде около 25: выше — отрезок лучше обычного,
ниже — хуже. Считано на всех постах подряд (~1000 на зал, <code>/new</code>), а не на
лучших: «когда людям удобно постить» не подмешивается.</p>
<p class="lede"><b>Цвет говорит две вещи сразу.</b> Оттенок — насколько число отошло
от обычных 25, синее вверх, красное вниз. Насыщенность — можно ли этому верить: клетка
на 45 постах остаётся тусклой, клетка на 300 с тем же числом горит в полную силу.
Тусклое и серое читать не стоит. Справа — решает ли выбор вообще хоть что-то в этом
зале; «решает» выдержало поправку на девять проверенных залов, «похоже» — нет.</p>

<h2>Час суток</h2>
<p class="sub">Время парижское, под ним UTC. Нижняя строка — пять «лучших часов»,
которые Postpone советует для r/iWallpaper.</p>
<div class="scroll"><table>
<thead><tr><th class="corner"></th>
${PARIS.map((p,i)=>`<th>${p}<small>${BLOCKS[i]} UTC</small></th>`).join('')}
<th class="last">решает?</th></tr></thead>
<tbody>
${H.rows}
<tr class="ppr"><th>Postpone советует</th>${ppCells}<td></td></tr>
</tbody></table></div>

<div class="key">
  <div>хуже обычного<i>${legEffect}</i>лучше</div>
  <div>наверняка<i>${legSure}</i>может быть случайностью</div>
</div>

<h2>День недели</h2>
<p class="sub">Тот же счёт по дням. Сетка почти пустая не потому, что дни не смотрели,
а потому, что смотрели: ${daysFlat} залов из девяти не показывают по дням ничего, чего не
дал бы случай. Исключение одно — r/${dayWins.join(', r/')}.</p>
<div class="scroll"><table>
<thead><tr><th class="corner"></th>
${DAYRU.map(d=>`<th>${d}</th>`).join('')}
<th class="last">решает?</th></tr></thead>
<tbody>
${D.rows}
</tbody></table></div>

<h2>Что из этого следует</h2>
<ul>
<li><b>Европейский день выигрывает в восьми залах из девяти.</b> 10–18 по Парижу — лучший
отрезок, 22–06 — худший. Американский вечер, где «все онлайн», проигрывает.
Похоже, пост, поданный европейским днём, набирает первые голоса и въезжает
в американский день уже поднятым.</li>
<li><b>r/phonewallpapers — исключение.</b> Лучший отрезок там 02–06 по Парижу (35 %),
то есть американский вечер, второй — 14–18 (32 %). Утро 10–14 слабое (21 %),
и вечер 18–02 тоже. Подавать туда стоит в 14–18: это совпадает с остальными залами.</li>
<li><b>Час наверняка решает в трёх залах: r/iWallpaper, r/wallpaper и r/phonewallpapers.</b>
В r/iWallpaper разница более чем трёхкратная — 34 % против 10 %. В r/oilpaintings
и r/ukiyoe похоже, что решает, но одно такое совпадение на девять проверок и ожидается.
В нижних четырёх строчках почти всё тусклое: там час можно не выбирать.</li>
<li><b>День решает ровно в одном зале — r/iphonewallpapers, и сильнее, чем час.</b>
Понедельник 36 %, суббота 15 %, и это единственная проверка по дням, которая
проходит поправку. Забавно, что час там как раз не решает (p&nbsp;0,10): в этом зале
надо выбирать день, а не время суток. В остальных восьми залах день ровный —
выбирать нечего.</li>
<li><b>Пять «лучших часов» Postpone для r/iWallpaper.</b> Три из пяти, включая первый,
попали в худшие отрезки. Их клетка — средний балл за час, а не доля удачных,
и один залётный пост делает час «лучшим».</li>
</ul>
</div>
<div id="tip"></div>
<script>
const tip=document.getElementById('tip');
document.querySelectorAll('[data-t]').forEach(el=>{
  el.addEventListener('pointerenter',()=>{tip.textContent=el.dataset.t;tip.style.opacity=1});
  el.addEventListener('pointermove',e=>{const r=tip.getBoundingClientRect();
    tip.style.left=Math.max(8,Math.min(e.clientX+14,innerWidth-r.width-8))+'px';
    tip.style.top=Math.max(8,e.clientY-r.height-10)+'px';});
  el.addEventListener('pointerleave',()=>tip.style.opacity=0);
});
</script>`;
fs.writeFileSync('.subtime.html',html);

// report to stdout so the numbers are checkable without opening the sheet
for (const [n,v] of Object.entries(S))
  console.log(`${n.padEnd(18)} hours p=${v.hours.p<1e-4?'<0.0001':v.hours.p.toFixed(4)}  days p=${v.days.p.toFixed(4)}  day hits=${v.days.cells.map(c=>c.hit).join(' ')}`);
console.log('\nwrote .subtime.html', html.length, 'bytes');
