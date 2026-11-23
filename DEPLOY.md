# Деплой «Лоска»

Документ описывает, как поднять этот проект на бесплатном или почти бесплатном
хостинге. **Сайт никуда не задеплоен**: ниже только проверенные локально шаги и
конфиги. Ничего не публиковалось, домены и DNS не настраивались.

## 1. Что именно нужно развернуть

Приложению нужны три вещи, которых нет у чистого serverless:

| Что | Где живёт | Почему важно |
|---|---|---|
| SQLite-база | `data/losk.db` (плюс `-wal`, `-shm`) | заявки, сметы, сессии, платежи, аудит |
| Загруженные фото | `data/uploads/` | фото «до/после» владельца и фото из заявки клиента |
| VAPID-ключи | `data/secrets.json` | без них push-подписки перестают работать |

Всё это задаётся переменной `DATA_DIR` (`lib/db.ts`), по умолчанию это `./data`.
Каталог должен быть **записываемым и постоянным**: если он исчезает при перезапуске
или деплое, исчезают заявки, фото и сессии.

Ещё одна вещь, которая живёт в памяти процесса: rate limit (`lib/ratelimit.ts`).
На одном Node-процессе это нормально, при нескольких инстансах нужен общий счётчик.

## 2. Вариант A: Node-хостинг с диском (рекомендуется)

Это единственный вариант, при котором проект работает **без переписывания кода**:
SQLite с WAL, файлы на диске, один процесс, сессии и лимиты как задумано.

Куда это ставится:

- **Oracle Cloud Always Free** (ARM VM 4 CPU / 24 ГБ RAM, диск входит): самый
  честный «бесплатно», но регистрация и сеть иногда раздражают.
- **Fly.io, Railway, Render**: тарифы с постоянным volume начинаются примерно с
  $5/мес. У Render бесплатный web service **без диска**, поэтому данные будут
  теряться; нужен платный инстанс плюс disk.
- **Российский VPS** (Timeweb, Beget, reg.ru, Aeza): от ~150–300 ₽/мес, домен `.ru`
  и оплата картой без вопросов.
- **Домашний сервер / офисный мини-ПК**: годится для пилота, если есть белый IP
  или туннель (Cloudflare Tunnel).

### 2.1. Docker (один файл, любой хост)

В репозитории есть `Dockerfile` и `.dockerignore`. Образ собирается с адресом
сайта в аргументе: `NEXT_PUBLIC_*` в Next.js вшивается на этапе сборки, поэтому
после смены домена образ нужно пересобрать.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://losk.example \
  -t losk:latest .

docker run -d --name losk \
  --restart unless-stopped \
  -p 127.0.0.1:3210:3210 \
  --env-file .env.production \
  -v /srv/losk/data:/app/data \
  losk:latest
```

`-v /srv/losk/data:/app/data` и есть постоянное хранилище. Каталог создайте заранее
и отдайте пользователю контейнера (`node`, UID 1000): `sudo mkdir -p /srv/losk/data
&& sudo chown 1000:1000 /srv/losk/data`.

### 2.2. Без Docker (systemd)

```bash
# на сервере
sudo apt install -y nodejs npm nginx
sudo useradd --system --home /srv/losk --shell /usr/sbin/nologin losk
sudo mkdir -p /srv/losk && sudo chown losk:losk /srv/losk
# скопируйте проект в /srv/losk, затем
sudo -u losk bash -c 'cd /srv/losk && npm ci && npm run build'
```

`/etc/systemd/system/losk.service`:

```ini
[Unit]
Description=Losk
After=network.target

[Service]
Type=simple
User=losk
WorkingDirectory=/srv/losk
Environment=NODE_ENV=production
EnvironmentFile=/srv/losk/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Caddy как reverse proxy (сам выпускает HTTPS):

```
losk.example {
    reverse_proxy 127.0.0.1:3210
}
```

nginx-вариант: `proxy_pass http://127.0.0.1:3210;` и
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, плюс
`TRUST_PROXY=1` в окружении, иначе все посетители попадут в один бакет rate limit.

### 2.3. Переменные окружения

Скопируйте `.env.example` в `.env.production` и заполните:

```bash
NEXT_PUBLIC_SITE_URL=https://losk.example   # тот же адрес, с которым собран образ
SESSION_SECRET=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)
PAYMENT_WEBHOOK_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=owner@losk.ru
ADMIN_PASSWORD=<сильный пароль>
DEMO_MODE=0
# COOKIE_INSECURE не задавайте: на HTTPS cookie должны быть Secure
# TRUST_PROXY=1, если стоит nginx/Caddy/Cloudflare
```

### 2.4. Проверка после запуска

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://losk.example/
curl -sS https://losk.example/robots.txt
curl -sS https://losk.example/sitemap.xml | head -c 300
```

Затем вручную: отправить заявку с фото на `/`, открыть `/admin/login`, войти,
убедиться, что фото видно в карточке заявки.

### 2.5. Бэкап

База и фото это и есть бизнес. Минимум раз в сутки:

```bash
# консистентная копия без остановки сервера
sqlite3 /srv/losk/data/losk.db ".backup '/srv/backup/losk-$(date +%F).db'"
rsync -a /srv/losk/data/uploads/ /srv/backup/uploads/
```

Храните копии вне сервера (S3, другой диск, `rclone`). Проверьте восстановление
хотя бы один раз: скопировать файл на чистую машину и открыть кабинет.

## 3. Вариант B: serverless (Vercel / Netlify) и почему так нельзя «как есть»

У Vercel и Netlify корневая файловая система только для чтения, запись разрешена
лишь во временный каталог. Функции запускаются во множестве инстансов, и инстанс
может быть остановлен в любой момент. Для этого проекта это означает:

| Что сломается | Как проявляется |
|---|---|
| SQLite в `data/` | файл не создать или он исчезнет после деплоя/холодного старта: заявки и сессии пропадают |
| `data/uploads/` | загруженные фото теряются, `/api/media/[id]` отдаёт 404 |
| `data/secrets.json` | VAPID-ключи пересоздаются на каждом инстансе, push-подписки перестают совпадать |
| Rate limit в памяти | лимит считается отдельно на каждый инстанс, защита от перебора фактически исчезает |
| SQLite-транзакции | два инстанса на одном файле (если подключить сетевой диск) дают блокировки и порчу WAL |
| Размер запроса | у Vercel Hobby тело запроса ограничено 4.5 МБ, поэтому фото «до 5 МБ» платформа отклонит раньше приложения |

Чтобы уехать на serverless, нужно заменить три вещи, и это отдельная работа:

1. **База.** Supabase (Postgres, free tier) или Neon; альтернатива Turso/libSQL
   (SQLite-совместимая, но внешняя). Меняется драйвер в `lib/db.ts`
   (`all/get/run/tx`) и синтаксис миграций; JSON-колонки остаются JSON/`jsonb`.
2. **Файлы.** Supabase Storage, Cloudflare R2 или S3: загрузка идёт либо через
   API-роут (тогда лимит тела запроса платформы всё равно действует), либо
   presigned URL напрямую в хранилище. Раздачу `/api/media/[id]` нужно заменить
   на подписанные ссылки с проверкой прав.
3. **Лимиты и сессии.** Общий счётчик (Upstash Redis) для `lib/ratelimit.ts`;
   сессии уже лежат в базе, так что после переезда на Postgres переживут
   несколько инстансов.

Пока этого не сделано, `DEPLOY.md` не обещает, что проект заработает на Vercel:
он заработает, но данные не сохранятся. Это не «мелкий нюанс», а суть сервиса.

Если всё же нужен serverless-хостинг, порядок такой: Supabase (Postgres +
Storage) → перенос `lib/db.ts` и загрузок → Upstash для лимитов → после этого
Vercel/Netlify. Оценка: день на базу и файлы, полдня на лимиты и проверку.
Для пилота дешевле и надёжнее вариант A.

## 4. Чек-лист перед публикацией

- [ ] `DEMO_MODE=0` (иначе кабинет открывается в один клик кнопкой на `/admin/login`)
- [ ] Заданы все секреты из §2.3, `COOKIE_INSECURE` отсутствует
- [ ] `NEXT_PUBLIC_SITE_URL` совпадает с реальным адресом (canonical, OG, ссылки в push)
- [ ] `TRUST_PROXY=1`, если перед приложением стоит прокси
- [ ] HTTPS работает, `http://` редиректит на `https://`
- [ ] `npm run typecheck && npm run build && npm run pentest` зелёные на том же коде
- [ ] Бэкап базы и `data/uploads` настроен и проверен восстановлением
- [ ] Реальные контакты и реквизиты в `lib/brand.ts` и `lib/legal.ts`
- [ ] Платёжный провайдер вместо sandbox (`lib/payments.ts`), вебхук на реальном секрете

## 5. Известные ограничения

- Один процесс. Горизонтальное масштабирование требует Postgres, общего
  хранилища файлов и Redis для лимитов.
- SQLite и WAL рассчитаны на локальный диск. Сетевые ФС (NFS, SMB) не подходят.
- Загрузка фото идёт через приложение: при очень медленном канале клиента
  соединение держится дольше, чем на CDN-загрузке.
- Push зависит от браузера: на iOS работает только для установленного PWA.
