# Увеличение на чужой видеокарте, взятой на секунды.
#
#   modal deploy service/upscale_modal.py
#
# Та же плиточная развёртка, что в браузере (`public/upscale-local.js`), но
# моделью, которую выбрали вслепую обоями во весь экран: `4x_NMKD-Siax_200k`,
# лицензия WTFPL (research/2026-08-24-the-model-he-picked-cannot-run-here.md).
# В браузере она в двадцать семь раз медленнее нынешней и роняет вкладку, на
# боевой коробке без видеокарты ей нужно двадцать пять минут на мегапиксель, —
# то есть кроме как здесь считать её негде.
#
# Померено: холодный старт около 13 секунд сверх счёта, 0.47 с на плитку,
# $0.0044 за картинку вместе с полным холодным стартом.
from __future__ import annotations

import hashlib
import io
import time

import modal

# Аннотации в этом файле — строки, а не объекты (`from __future__`). Иначе
# `Request` в подписи обработчика вычислялся бы при разборе файла на нашей
# машине, где fastapi не установлен вовсе: файл читается и здесь тоже, чтобы
# собрать из него описание приложения.
MODEL = "4x_NMKD-Siax_200k.onnx"
# Модель качается при СБОРКЕ ОБРАЗА, а не с чьей-то машины и не при старте
# контейнера. С машины — потому что тогда выкладка зависела бы от файла в
# `~/.cache` у того, кто её запускает, и на чистой копии репозитория не
# собралась бы вовсе. При старте — потому что 68 МБ на каждом холодном запуске
# это и секунды ожидания, и оплаченные секунды.
MODEL_URL = f"https://huggingface.co/yuvraj108c/ComfyUI-Upscaler-Onnx/resolve/main/{MODEL}"
# Сумма проверяется в образе: адрес чужой, содержимое по нему может смениться,
# а молча подменённая модель — это молча другая картинка на выходе.
MODEL_SHA = "0e090d7dba554acc00b2c8fdf0524b9b8acd52de5daada4aba7f5c4ec50dcd78"

# Плитка и поля — те же числа, что в браузере и в замерах. Поля в 16 пикселей
# закрывают шов, край добивается повтором пикселя.
TILE, OV = 200, 16

# Потолок входа. Сервер и так уменьшает картинку перед отправкой ровно до той
# стороны, из которой ×4 даёт обещанный размер (`upscaler.js`), так что сюда
# больше и не приходит. Число стоит здесь второй раз и по своей причине: это
# единственное, что отделяет счёт в минуту от счёта в час, если однажды
# позвать эндпоинт мимо сервера. 4.2 Мп — это около ста плиток, то есть
# примерно пятьдесят секунд на T4.
MAX_PIXELS = 4_200_000
MAX_SIDE = 2048

image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04", add_python="3.11")
    # версия прибита намеренно: onnxruntime-gpu привязан к поколению CUDA, и
    # свежий пакет попросил бы CUDA 13 у образа с 12.4. 1.20.2 — под CUDA 12.x
    # и cuDNN 9, ровно то, что в базовом образе. Образ не тонкий по той же
    # причине: без CUDA и cuDNN onnxruntime молча откатывается на процессор,
    # и всё работает — только считает в двадцать раз медленнее и за наши деньги.
    .pip_install("onnxruntime-gpu==1.20.2", "numpy", "pillow", "fastapi[standard]")
    .apt_install("curl", "ca-certificates")
    .run_commands(
        "mkdir -p /models",
        f"curl -fsSL -o /models/{MODEL} {MODEL_URL}",
        f"echo '{MODEL_SHA}  /models/{MODEL}' | sha256sum -c -",
    )
)

with image.imports():
    import numpy as np
    import onnxruntime as ort
    from fastapi import Request, Response
    from PIL import Image

app = modal.App("upscale", image=image)


# `requires_proxy_auth` — ворота на краю, до контейнера. Проверка внутри
# обработчика тоже отсекла бы чужого, но уже после того, как ради него
# подняли видеокарту: у бессерверного счёта холодный старт стоит денег сам
# по себе, и открытый адрес, который кто-то нашёл, — это счёт за отказы.
# Ключ и секрет заводятся один раз в панели Modal (Settings → Proxy Auth
# Tokens) и живут у нас в `.env`.
#
# scaledown_window маленькое намеренно: тёплое окно окупается, когда следующий
# запрос приходит внутрь него, а к нам приходят из поиска раз в год. Минута
# ожидания после каждого вызова — это около $14 в месяц оплаченного простоя
# на пустой машине.
#
# timeout, max_containers и потолок входа — три разных ответа на один вопрос
# «сколько это может стоить, если что-то пойдёт не так». Дольше двух минут
# один вызов не считается, больше двух машин разом не поднимается, картинка
# крупнее 4.2 Мп не принимается вовсе. Четвёртый ответ — суточные ворота
# в `limits.js`, и он единственный, который видит посетитель.
@app.cls(gpu="T4", scaledown_window=10, max_containers=2, timeout=120, retries=1)
class Upscaler:
    # Сессия собирается один раз на контейнер, а не на запрос: пока контейнер
    # жив, следующий посетитель платит только за сам счёт.
    @modal.enter()
    def load(self):
        started = time.time()
        self.sess = ort.InferenceSession(
            f"/models/{MODEL}",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        self.load_secs = time.time() - started
        self.provider = self.sess.get_providers()[0]
        self.inp = self.sess.get_inputs()[0].name
        self.out = self.sess.get_outputs()[0].name
        self.served = 0

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    async def upscale(self, request: Request):
        # Тело — сами байты картинки, а не json с base64: base64 это треть
        # веса сверх, и на обратном пути у восьмимегапиксельного результата
        # это мегабайты чужого канала за ничто.
        raw = await request.body()
        if not raw:
            return Response("empty body", status_code=400)
        try:
            src = np.asarray(Image.open(io.BytesIO(raw)).convert("RGB"))
        except Exception:
            return Response("not an image", status_code=400)
        h, w, _ = src.shape
        if w * h > MAX_PIXELS or max(w, h) > MAX_SIDE:
            return Response(f"{w}x{h} is larger than this endpoint accepts", status_code=413)

        started = time.time()
        dst, tiles = self.run(src, w, h)
        infer = time.time() - started

        # jpeg, а не png: у результата до 17 мегапикселей, и png такого размера
        # — это десятки мегабайт по проводу за разницу, которой на фотографии
        # не видно. q95 4:4:4 — то же качество, каким собирался лист обоев,
        # на котором эту модель и выбрали.
        buf = io.BytesIO()
        Image.fromarray(dst).save(buf, "JPEG", quality=95, subsampling=0)
        self.served += 1
        return Response(
            buf.getvalue(),
            media_type="image/jpeg",
            headers={
                # Не отладка: по этим числам видно, за что заплачено, и
                # холодный ли был запуск. Читает их `upscaler.js` и кладёт
                # в лог — иначе цена вызова известна только из панели Modal.
                "X-Cold": "1" if self.served == 1 else "0",
                "X-Infer-Secs": f"{infer:.1f}",
                "X-Load-Secs": f"{self.load_secs:.1f}",
                "X-Tiles": str(tiles),
                "X-Provider": self.provider,
                "X-Size": f"{w}x{h}->{dst.shape[1]}x{dst.shape[0]}",
            },
        )

    # Развёртка вынесена из обработчика: в нём остаётся разбор запроса и
    # ответ, здесь — счёт. Проверено попиксельно против браузерного пути:
    # среднее расхождение 0.001 из 255 после приведения обеих к одному jpeg.
    def run(self, src, w, h):
        # Край достраивается повтором пикселя, а не чёрным: иначе у границы
        # кадра модель рисует по чёрному полю тёмную кайму. Заодно ширина и
        # высота дотягиваются до целого числа плиток.
        pw = -(-w // TILE) * TILE
        ph = -(-h // TILE) * TILE
        pad = np.pad(src, ((OV, ph - h + OV), (OV, pw - w + OV), (0, 0)), mode="edge")

        side = TILE + 2 * OV
        dst = None
        tiles = 0
        for y in range(0, ph, TILE):
            for x in range(0, pw, TILE):
                tile = pad[y:y + side, x:x + side].transpose(2, 0, 1)[None].astype(np.float32) / 255
                got = self.sess.run([self.out], {self.inp: tile})[0][0]
                if dst is None:
                    scale = got.shape[2] // side
                    margin = OV * scale
                    dst = np.empty((h * scale, w * scale, 3), np.uint8)
                # из плитки берётся только то, что попадает в настоящий кадр:
                # добивка справа и снизу — служебная, в картинку она не идёт
                cw = min(TILE, w - x) * scale
                ch = min(TILE, h - y) * scale
                if cw <= 0 or ch <= 0:
                    continue
                core = got[:, margin:margin + ch, margin:margin + cw].transpose(1, 2, 0)
                dst[y * scale:y * scale + ch, x * scale:x * scale + cw] = \
                    np.clip(core * 255 + 0.5, 0, 255).astype(np.uint8)
                tiles += 1
        return dst, tiles


# Сумма модели названа в двух местах — здесь и в образе. Здесь она проверяется
# не у скачанного, а у того файла, что лежит рядом с этим скриптом на чужой
# машине: `modal run service/upscale_modal.py` печатает, совпадает ли то, что
# поедет в образ, с тем, на чём мерили.
@app.local_entrypoint()
def main(path: str = ""):
    if not path:
        print(f"{MODEL}\n  {MODEL_URL}\n  sha256 {MODEL_SHA}")
        return
    got = hashlib.sha256(open(path, "rb").read()).hexdigest()
    print(f"{path}\n  sha256 {got}\n  {'совпадает' if got == MODEL_SHA else 'НЕ СОВПАДАЕТ'}")
