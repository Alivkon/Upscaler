// Просмотр во весь экран. На странице работы изображение ограничено высотой
// записи, а файл больше — это способ увидеть его целиком, ничего не скачивая.

const box = document.querySelector('#lightbox');
const picture = document.querySelector('#lightbox-image');
const close = document.querySelector('#lightbox-close');

export function openLightbox(source, alt) {
  picture.src = source;
  picture.alt = alt;
  box.hidden = false;
  document.body.classList.add('is-locked');
  close.focus();
}

function closeLightbox() {
  box.hidden = true;
  picture.removeAttribute('src');
  document.body.classList.remove('is-locked');
}

close.addEventListener('click', closeLightbox);
box.addEventListener('click', event => event.target === box && closeLightbox());
addEventListener('keydown', event => event.key === 'Escape' && !box.hidden && closeLightbox());
