const form = document.querySelector('#upscale-form');
const input = document.querySelector('#photo');
const dropzone = document.querySelector('#dropzone');
const button = document.querySelector('#submit');
const label = document.querySelector('#file-label');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const placeholder = document.querySelector('#preview-placeholder');
const resultImage = document.querySelector('#result-image');
const result = document.querySelector('#result');

function resetResult() {
  resultImage.removeAttribute('src');
  resultImage.hidden = true;
  placeholder.hidden = false;
  result.hidden = true;
}
resetResult();

function showImage(url) {
  resultImage.src = url;
  resultImage.hidden = false;
  placeholder.hidden = true;
}

function selectFile(file) {
  if (!file) return;
  const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
  label.textContent = file.name; button.disabled = false; status.textContent = '';
  resetResult();
}
input.addEventListener('change', () => selectFile(input.files[0]));
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!input.files[0]) return;
  button.disabled = true; result.hidden = true; resetResult();
  const modelName = form.querySelector('input[name="model"]:checked').closest('.model-card').querySelector('b').textContent;
  status.textContent = `Загружаем фото и запускаем ${modelName}… Обычно это занимает до минуты.`;
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
