#!/usr/bin/env bash
# Выкладка на боевую машину. Подробности — в DEPLOYMENT.md.
#
# Две половины едут раздельно и разными правилами. Код — точным списком
# с `--delete`: удалённая работа должна исчезнуть и с сервера, иначе каталог
# там окажется больше здешнего. Картинки — списком из `scripts/shipping-list.mjs`
# и без `--delete`: их на сервере три гигабайта, стирать их из-за опечатки
# в имени переменной незачем, а лишний файл в `images/` стоит только места.
set -euo pipefail

HOST=${DEPLOY_HOST:-root@145.223.96.83}
DIR=${DEPLOY_DIR:-/opt/apps/upscaler}
HERE=$(cd "$(dirname "$0")/.." && pwd)

cd "$HERE"

# Сначала проверка, потом отправка: сломанный каталог видно здесь за секунду,
# а на сервере — по пятисотой в браузере.
echo "==> yarn verify"
yarn verify

echo "==> код"
# `.env` в списке нет намеренно: он живёт только на машине и в git не попадает
# (AGENTS.md, «Секреты и деньги»). Меняете переменные — правьте его там руками.
# DEPLOYMENT.md образу не нужен, но едет: машина должна уметь рассказать
# о себе тому, кто зашёл на неё по ssh, а не только тому, у кого открыт git.
#
# `service/` в списке нет намеренно: там обработчик, который считает на чужой
# видеокарте, и едет он не сюда, а туда — `modal deploy service/upscale_modal.py`
# со своей машины. Сайт зовёт его по адресу из `.env`; выкладка сайта и выкладка
# модели с этого дня разные действия, и путать их нельзя — передеплой сайта
# модель не обновляет, а передеплой модели не требует трогать сайт.
rsync -a --delete --info=stats1 \
  Dockerfile docker-compose.yml .dockerignore package.json yarn.lock DEPLOYMENT.md \
  gallery.js http-error.js limits.js pages.js server.js treatment.js upscaler.js works.js \
  catalogue public scripts \
  "$HOST:$DIR/"

echo "==> коллекция"
# Список печатается в stdout, жалобы — в stderr; смотрите на них, работа
# без манифеста на витрину не выйдет.
node scripts/shipping-list.mjs > /tmp/tessarum-shipping-list.txt
echo "файлов в списке: $(wc -l < /tmp/tessarum-shipping-list.txt)"
rsync -a --info=progress2 --files-from=/tmp/tessarum-shipping-list.txt \
  images/ "$HOST:$DIR/images/"

echo "==> пересборка"
ssh "$HOST" "cd $DIR && docker compose --project-directory $DIR up -d --build"

echo "==> проверка"
# Здоровье контейнера считает сам docker: `start_period` в compose — двадцать
# секунд, поэтому ждём, а не спрашиваем сразу.
sleep 25
ssh "$HOST" "docker ps --filter name=upscaler --format '{{.Names}} {{.Status}}'"
for path in / /robots.txt /sitemap.xml; do
  printf '%-14s %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://tessarum.com$path")"
done
