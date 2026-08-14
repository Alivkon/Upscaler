const form = document.querySelector('#upscale-form');
const input = document.querySelector('#photo');
const dropzone = document.querySelector('#dropzone');
const button = document.querySelector('#submit');
const label = document.querySelector('#file-label');
const status = document.querySelector('#status');
const result = document.querySelector('#result');

function selectFile(file) {
  if (!file) return;
  const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
  label.textContent = file.name; button.disabled = false; status.textContent = '';
}
input.addEventListener('change', () => selectFile(input.files[0]));
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => selectFile(event.dataTransfer.files[0]));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!input.files[0]) return;
  button.disabled = true; result.hidden = true;
  status.textContent = 'Загружаем фото и запускаем Topaz AI… Обычно это занимает до минуты.';
  try {
    const response = await fetch('/api/upscale', { method: 'POST', body: new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    document.querySelector('#result-image').src = data.url;
    const download = document.querySelector('#download'); download.href = data.url; download.download = data.filename;
    result.hidden = false; status.textContent = '';
  } catch (error) { status.textContent = `Ошибка: ${error.message}`; }
  finally { button.disabled = false; }
});
