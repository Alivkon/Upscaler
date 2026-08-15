const form = document.querySelector('#upscale-form');
const input = document.querySelector('#photo');
const dropzone = document.querySelector('#dropzone');
const button = document.querySelector('#submit');
const buttonLabel = button.querySelector('span');
const activeModel = document.querySelector('input[name="model"]');
const modelTabs = document.querySelectorAll('.model-tab');
const ordinarySettings = document.querySelector('#ordinary-settings');
const portraitSettings = document.querySelector('#portrait-settings');
const label = document.querySelector('#file-label');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const placeholder = document.querySelector('#preview-placeholder');
const resultImage = document.querySelector('#result-image');
const resultLink = document.querySelector('#result-link');
const result = document.querySelector('#result');
const modelTitles = { real_esrgan: 'Real-ESRGAN', nano_banana: 'Nano Banana', nano_banana_pro: 'Nano Banana Pro' };

function resetResult() {
  resultImage.removeAttribute('src');
  resultLink.removeAttribute('href');
  resultLink.hidden = true;
  placeholder.hidden = false;
  result.hidden = true;
}
resetResult();

function showImage(url) {
  resultImage.src = url;
  resultLink.href = url;
  resultLink.hidden = false;
  placeholder.hidden = true;
}

function selectFile(file) {
  if (!file) return;
  const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
  label.textContent = file.name; button.disabled = false; status.textContent = '';
  resetResult();
}
input.addEventListener('change', () => selectFile(input.files[0]));
form.addEventListener('change', event => {
  if (event.target.name === 'portrait_model') activeModel.value = event.target.value;
  if (event.target.name === 'output_size' || event.target.name === 'portrait_output_size') buttonLabel.textContent = `Улучшить ${event.target.value.replace('x', '×').toUpperCase()}`;
});
modelTabs.forEach(tab => tab.addEventListener('click', () => {
  const portrait = tab.id === 'portrait-tab';
  modelTabs.forEach(item => item.setAttribute('aria-selected', String(item === tab)));
  ordinarySettings.hidden = portrait;
  portraitSettings.hidden = !portrait;
  activeModel.value = portrait ? form.querySelector('input[name="portrait_model"]:checked').value : 'real_esrgan';
  const activeSize = portrait ? '1k' : 'x2';
  form.querySelectorAll(`input[name="${portrait ? 'portrait_output_size' : 'output_size'}"]`).forEach(input => { input.checked = input.value === activeSize; });
  buttonLabel.textContent = `Улучшить ${activeSize.replace('x', '×').toUpperCase()}`;
}));
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!input.files[0]) return;
  button.disabled = true; result.hidden = true; resetResult();
  status.textContent = `Загружаем фото и запускаем ${modelTitles[activeModel.value]}… Обычно это занимает до минуты.`;
  try {
    const response = await fetch('/api/upscale', { method: 'POST', body: new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    showImage(data.url);
    const download = document.querySelector('#download'); download.href = data.url; download.download = data.filename;
    result.hidden = false; status.textContent = '';
  } catch (error) { status.textContent = `Ошибка: ${error.message}`; }
  finally { button.disabled = false; }
});
