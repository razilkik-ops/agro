# АгроДеталь

Статический сайт магазина запчастей для сельхозтехники.

## Деплой

Проект можно публиковать как статический сайт через GitHub Pages, Render, Netlify или любой обычный хостинг.

Точка входа: `index.html`.

## Синхронизация каталога BartsParts

Скрипт `tools/sync-bartsparts.mjs` работает в 3 этапа:

1. строит полный индекс SKU по sitemap в `data/bartsparts/index/*`;
2. фоново обогащает карточки (название + цена) порциями и хранит кэш в `data/bartsparts/cache/*`;
3. собирает витрину сайта в `data/catalog/*`, `data/catalog.json` и глобальный поисковый индекс в `data/catalog/search/*`.

Основные переменные окружения:

- `BARTSPARTS_CHUNK_SIZE` — размер страницы каталога (по умолчанию `1000`).
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

- `BARTSPARTS_BRANDS=john-deere,fendt,case-ih,new-holland,claas,krone`
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

- `.github/workflows/sync-catalog.yml` запускается каждые 6 часов по cron `18 */6 * * *` и делает безопасное инкрементальное добирание.
- `.github/workflows/sync-catalog-nightly.yml` запускается каждый день по cron `42 1 * * *` (01:42 UTC) и использует более агрессивные настройки обогащения.
- Для защиты от гонок оба workflow объединены в один `concurrency`-group `bartsparts-sync`, поэтому параллельно они не стартуют.
