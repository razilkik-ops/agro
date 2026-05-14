# АгроДеталь

Статический сайт магазина запчастей для сельхозтехники.

## Деплой

Проект можно публиковать как статический сайт через GitHub Pages, Render, Netlify или любой обычный хостинг.

Точка входа: `index.html`.

## Backend режим (цены сразу на карточках)

Добавлен сервер `server.mjs`, который:

1. раздает сайт и API с одного origin;
2. берет товары по странице (`20` шт);
3. на сервере подтягивает цены/названия из BartsParts и пишет результат в `data/bartsparts/cache/*.json`;
4. отдает поиск через `/api/search`, чтобы найденные товары тоже показывались с актуальной ценой, а не только карточки каталога.

Запуск:

```bash
node server.mjs
```

По умолчанию сервер стартует на `http://localhost:8787`.
Основные env для API:

- `PORT` (по умолчанию `8787`)
- `API_PRODUCTS_PER_PAGE` (по умолчанию `20`)
- `API_ENRICH_CONCURRENCY` (по умолчанию `6`)
- `API_REQUEST_DELAY_MS` (по умолчанию `40`)
- `API_PRICE_CACHE_TTL_MS` (по умолчанию `10800000`, 3 часа)

## Синхронизация каталога BartsParts

Скрипт `tools/sync-bartsparts.mjs` работает в 4 этапа:

1. загружает полный список брендов со страницы `https://bartsparts.com/brands`;
2. строит полный индекс SKU по sitemap в `data/bartsparts/index/*`;
3. фоново обогащает карточки (название, цена, старая цена, валюта, изображение, наличие, история цены) порциями и хранит кэш в `data/bartsparts/cache/*`;
4. собирает витрину сайта в `data/catalog/*`, `data/catalog.json` и глобальный поисковый индекс в `data/catalog/search/*`.

Журнал последних запусков хранится в `data/bartsparts/import-logs.json`, состояние продолжения — в `data/bartsparts/sync-state.json`.

Полный импорт всех брендов:

```bash
BARTSPARTS_BRANDS=all BARTSPARTS_REFRESH_INDEX=1 node tools/sync-bartsparts.mjs
```

Импорт одного бренда:

```bash
BARTSPARTS_BRANDS=john-deere node tools/sync-bartsparts.mjs
```

Только пересобрать локальные JSON-страницы и поиск без запросов карточек:

```bash
BARTSPARTS_ENRICH_PER_RUN=0 node tools/sync-bartsparts.mjs
```

Скрипт не обходит авторизацию, капчи или антибот-защиту. Перед массовым запуском проверяйте правила сайта-донора и снижайте `BARTSPARTS_ENRICH_CONCURRENCY`/увеличивайте `BARTSPARTS_REQUEST_DELAY_MS`, если сайт начинает отвечать ограничениями.

Основные переменные окружения:

- `BARTSPARTS_CHUNK_SIZE` — размер страницы каталога (по умолчанию `1000`).
- `BARTSPARTS_BRANDS` — `all` или список slug через запятую для импорта отдельных брендов.
- `BARTSPARTS_ENRICH_PER_RUN` — сколько карточек товаров догружать за один запуск (по умолчанию `2500`).
- `BARTSPARTS_ENRICH_CONCURRENCY` — параллелизм запросов при обогащении (по умолчанию `4`).
- `BARTSPARTS_REQUEST_DELAY_MS` — задержка между запросами (по умолчанию `120`).
- `BARTSPARTS_TRANSLATION_BATCH_SIZE` — размер батча перевода названий (по умолчанию `40`).
- `BARTSPARTS_ERROR_RETRY_HOURS` — через сколько часов повторять карточки со статусом ошибки (по умолчанию `12`).
- `BARTSPARTS_SEARCH_PREFIX_LENGTH` — длина shard-префикса для глобального поиска (по умолчанию `3`).
- `BARTSPARTS_PRICE_MARKUP` — наценка к исходной цене в процентах (по умолчанию `20`).
- `BARTSPARTS_REFRESH_INDEX` — принудительная пересборка полного индекса (`1` или `0`, по умолчанию `0`).

## Поиск и пагинация

- Обычный просмотр каталога работает лениво: фронтенд грузит только `data/catalog/<brand>/page-N.json`.
- Глобальный поиск не читает весь каталог целиком и не ходит из браузера в BartsParts.
- Для поиска синкер собирает shard-файлы в `data/catalog/search/*.json` и манифест `data/catalog/search/index.json`.
- В поиск попадают все товары, даже если у части из них еще нет цены.
- Если цены нет, на сайте товар все равно находится и показывается со статусом `Цена уточняется`.

## Рекомендуемые Repository Variables

Ниже значения, с которых имеет смысл стартовать в GitHub Actions `Settings -> Secrets and variables -> Actions -> Variables`.

Для обычного workflow `.github/workflows/sync-catalog.yml`:

- `BARTSPARTS_BRANDS=all` — брать все бренды со страницы `https://bartsparts.com/brands`; можно указать список slug через запятую для частичной синхронизации.
- `BARTSPARTS_CHUNK_SIZE=1000`
- `BARTSPARTS_FEATURED_PER_BRAND=12`
- `BARTSPARTS_PRICE_MARKUP=20`
- `BARTSPARTS_ENRICH_PER_RUN=2500`
- `BARTSPARTS_ENRICH_CONCURRENCY=4`
- `BARTSPARTS_REQUEST_DELAY_MS=120`
- `BARTSPARTS_TRANSLATION_BATCH_SIZE=40`
- `BARTSPARTS_ERROR_RETRY_HOURS=12`
- `BARTSPARTS_REFRESH_INDEX=0`

Для ночного добирания `.github/workflows/sync-catalog-nightly.yml`:

- `BARTSPARTS_NIGHTLY_ENRICH_PER_RUN=15000`
- `BARTSPARTS_NIGHTLY_ENRICH_CONCURRENCY=8`
- `BARTSPARTS_NIGHTLY_REQUEST_DELAY_MS=80`
- `BARTSPARTS_NIGHTLY_TRANSLATION_BATCH_SIZE=60`
- `BARTSPARTS_NIGHTLY_ERROR_RETRY_HOURS=6`
- `BARTSPARTS_NIGHTLY_REFRESH_INDEX=0`

Если BartsParts начнет отвечать `403` или `429`, в первую очередь уменьшайте `BARTSPARTS_NIGHTLY_ENRICH_CONCURRENCY` до `6` и поднимайте `BARTSPARTS_NIGHTLY_REQUEST_DELAY_MS` до `120-150`.

## Workflow

- `.github/workflows/sync-catalog.yml` запускается каждый час по cron `18 * * * *` и делает безопасное инкрементальное добирание.
- `.github/workflows/sync-catalog-nightly.yml` запускается каждый день по cron `42 1 * * *` (01:42 UTC) и использует более агрессивные настройки обогащения.
- Для защиты от гонок оба workflow объединены в один `concurrency`-group `bartsparts-sync`, поэтому параллельно они не стартуют.
