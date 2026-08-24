# Образ для боевой машины. Шага сборки у проекта нет, поэтому здесь только
# зависимости и исходники: `node server.js` запускает ровно те файлы, которые
# лежат в репозитории.
FROM node:22-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Зависимости отдельным слоем: они меняются раз в месяц, а код — каждый день,
# и при правке `pages.js` пересобирать `node_modules` незачем. `sharp` тянет
# бинарник под платформу, поэтому ставится внутри образа, а не копируется
# с машины разработчика.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

# Файлы перечислены поимённо, а не `COPY . .`: в корне лежат черновики
# исследований (`.*.mjs`), `.env` и гигабайты `images/`, и все они попадали бы
# в образ. Появился новый модуль — допишите его здесь, иначе контейнер
# упадёт на `import` при старте.
COPY catalogue ./catalogue
COPY public ./public
COPY scripts ./scripts
COPY gallery.js http-error.js limits.js pages.js server.js treatment.js upscaler.js works.js ./

# Не root: процессу нужно только читать код и писать в `images/`, который
# приходит томом снаружи.
USER 1001:1001

EXPOSE 3000

CMD ["yarn", "start"]
