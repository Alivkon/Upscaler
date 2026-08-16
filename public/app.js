const $ = s => document.querySelector(s),
  $$ = s => document.querySelectorAll(s),
  gallery = $('#gallery-view'),
  studio = $('#studio-view'),
  grid = $('#gallery-grid'),
  form = $('#upscale-form'),
  file = $('#photo'),
  drop = $('#dropzone'),
  submit = $('#submit'),
  active = $('#active-model'),
  ordinary = $('#ordinary-settings'),
  portrait = $('#portrait-settings'),
  result = $('#result'),
  statusLine = $('#status');
let filename, timer;
function view(n) {
  let g = n === 'gallery';
  gallery.hidden = !g;
  studio.hidden = g;
  $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === n));
  g ? refreshTimer() : clearTimeout(timer);
}
function cards(images) {
  grid.replaceChildren(
    ...images.map(i => {
      let e = document.createElement('article');
      e.className = 'card';
      e.innerHTML = `<img src="${i.url}" alt="${i.title}" loading="lazy"><div><span>${i.source === 'shared' ? 'Работа сообщества' : 'LLM · новая работа'}</span><a href="${i.url}" download>Скачать</a></div>`;
      return e;
    })
  );
}
async function load(refresh = false) {
  let r = await fetch(refresh ? '/api/gallery/refresh' : '/api/gallery', { method: refresh ? 'POST' : 'GET' });
  if (!r.ok) throw Error();
  cards((await r.json()).images);
}
function refreshTimer() {
  clearTimeout(timer);
  if (!document.hidden)
    timer = setTimeout(async () => {
      try {
        await load(true);
      } finally {
        if (!document.hidden && !gallery.hidden) refreshTimer();
      }
    }, 300000);
}
// Размер результата берётся из того набора переключателей, который сейчас показан.
function currentOutputSize() {
  return $(`input[name="${portrait.hidden ? 'output_size' : 'portrait_output_size'}"]:checked`).value;
}
function updateSubmitLabel() {
  submit.querySelector('span').textContent = `Улучшить ${currentOutputSize().replace('x', '×').toUpperCase()}`;
}
function setMode(p) {
  ordinary.hidden = p;
  portrait.hidden = !p;
  $('#ordinary-tab').classList.toggle('active', !p);
  $('#portrait-tab').classList.toggle('active', p);
  active.value = p ? $('input[name="portrait_model"]:checked').value : 'real_esrgan';
  updateSubmitLabel();
}
function select(f) {
  if (!f) return;
  let d = new DataTransfer();
  d.items.add(f);
  file.files = d.files;
  $('#file-label').textContent = f.name;
  submit.disabled = false;
}
$$('[data-view]').forEach(b => (b.onclick = () => view(b.dataset.view)));
$('#ordinary-tab').onclick = () => setMode(false);
$('#portrait-tab').onclick = () => setMode(true);
file.onchange = () => select(file.files[0]);
['dragenter', 'dragover'].forEach(t =>
  drop.addEventListener(t, e => {
    e.preventDefault();
    drop.classList.add('drag');
  })
);
['dragleave', 'drop'].forEach(t =>
  drop.addEventListener(t, e => {
    e.preventDefault();
    drop.classList.remove('drag');
  })
);
drop.addEventListener('drop', e => select(e.dataTransfer.files[0]));
form.onchange = e => {
  if (e.target.name === 'portrait_model') active.value = e.target.value;
  if (/output_size/.test(e.target.name)) updateSubmitLabel();
};
form.onsubmit = async e => {
  e.preventDefault();
  if (!file.files[0]) return;
  submit.disabled = true;
  statusLine.textContent = 'Запускаем обработку…';
  try {
    let r = await fetch('/api/upscale', { method: 'POST', body: new FormData(form) }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    filename = d.filename;
    $('#result-image').src = d.url;
    $('#result-link').href = d.url;
    $('#download').href = d.url;
    $('#download').download = d.filename;
    $('#share').disabled = false;
    result.hidden = false;
    statusLine.textContent = '';
  } catch (x) {
    statusLine.textContent = `Ошибка: ${x.message}`;
  } finally {
    submit.disabled = false;
  }
};
$('#share').onclick = async () => {
  if (!filename) return;
  let r = await fetch(`/api/gallery/share/${encodeURIComponent(filename)}`, { method: 'POST' }),
    d = await r.json();
  if (!r.ok) return ($('#share-status').textContent = d.error);
  cards(d.images);
  $('#share').disabled = true;
  $('#share-status').textContent =
    'Готово: работа добавлена в начало коллекции. Скидка 50% будет доступна после запуска оплаты.';
};
document.onvisibilitychange = () => (document.hidden ? clearTimeout(timer) : !gallery.hidden && refreshTimer());
const box = document.createElement('div'),
  boxImg = document.createElement('img'),
  boxClose = document.createElement('button');
Object.assign(box.style, {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(8,12,18,.94)',
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px'
});
Object.assign(boxImg.style, { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' });
boxClose.textContent = '×';
boxClose.type = 'button';
Object.assign(boxClose.style, {
  position: 'absolute',
  top: '18px',
  right: '22px',
  border: 0,
  borderRadius: '50%',
  width: '42px',
  height: '42px',
  fontSize: '32px',
  cursor: 'pointer'
});
box.append(boxImg, boxClose);
document.body.append(box);
function openLightbox(url, alt) {
  boxImg.src = url;
  boxImg.alt = alt;
  box.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  boxClose.focus();
}
function closeLightbox() {
  box.style.display = 'none';
  boxImg.removeAttribute('src');
  document.body.style.overflow = '';
}
boxClose.onclick = closeLightbox;
box.onclick = e => e.target === box && closeLightbox();
document.onkeydown = e => e.key === 'Escape' && box.style.display === 'flex' && closeLightbox();
grid.onclick = e => {
  let img = e.target.closest('.card img');
  if (img) {
    e.preventDefault();
    openLightbox(img.src, img.alt);
  }
};
load().catch(() => (grid.textContent = 'Коллекция временно недоступна.'));
refreshTimer();
