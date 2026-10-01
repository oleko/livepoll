# Деплой LivePoll AI на VPS

Сервер: Ubuntu, 2 GB RAM / 1 CPU  
Стек: Node.js 20 + PM2 + nginx + Let's Encrypt

---

## 1. Первоначальная настройка сервера

```bash
# Подключиться по SSH
ssh root@138.16.186.239

# Обновить систему
apt update && apt upgrade -y

# Установить необходимые пакеты
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# Настроить файрвол
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установить PM2
npm install -g pm2

# Создать директорию приложения
mkdir -p /var/www/livepoll
mkdir -p /var/log/pm2
```

---

## 2. Клонировать репозиторий

```bash
cd /var/www
git clone https://github.com/oleko/livepoll.git livepoll
cd livepoll
```

---

## 3. Задать переменные окружения

```bash
cp .env.example .env.local
nano .env.local
```

Заполнить все значения (см. `.env.example`).  
`NEXT_PUBLIC_SITE_URL` — установить в `https://ваш-домен.ru` (или `http://138.16.186.239` для теста без SSL).

---

## 4. Собрать и запустить приложение

```bash
cd /var/www/livepoll
npm ci --omit=dev
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # скопировать и выполнить предложенную команду
```

---

## 5. Настроить nginx

```bash
nano /etc/nginx/sites-available/livepoll
```

Вставить конфиг (заменить `yourdomain.ru` на реальный домен или IP):

```nginx
server {
    listen 80;
    server_name yourdomain.ru www.yourdomain.ru;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/javascript;

    # Статика Next.js с кэшированием
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/livepoll /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 6. SSL через Let's Encrypt (нужен домен)

```bash
certbot --nginx -d yourdomain.ru -d www.yourdomain.ru
```

Certbot автоматически обновит nginx-конфиг и настроит редирект HTTP→HTTPS.

Для автопродления:
```bash
systemctl enable certbot.timer
```

> Без домена: работает на `http://138.16.186.239` — SSL не будет, но Яндекс OAuth требует HTTPS.  
> Временный вариант — настроить Cloudflare Tunnel или получить домен.

---

## 7. Обновление приложения

```bash
cd /var/www/livepoll
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart livepoll
```

---

## 8. Полезные команды

```bash
pm2 status          # статус процессов
pm2 logs livepoll   # логи в реальном времени
pm2 restart livepoll
nginx -t            # проверить конфиг nginx
systemctl reload nginx
```

---

## 9. После деплоя — чеклист

- [ ] Запустить миграцию БД: Supabase Dashboard → SQL Editor → выполнить `supabase/migrations/008_orders.sql`
- [ ] Добавить production URL в Supabase Auth: Dashboard → Authentication → URL Configuration → Site URL + Redirect URLs
- [ ] Настроить Яндекс OAuth: добавить `https://ваш-домен/auth/callback` в OAuth-приложение (см. `YANDEX_OAUTH.md`)
- [ ] Проверить что `NEXT_PUBLIC_SITE_URL` совпадает с реальным URL

---

## 10. Миграции БД: учёт и автоприменение

До сих пор миграции применялись вручную через Supabase Dashboard → SQL Editor, а учёта применённого не было. Из-за этого состояние прода нельзя проверить по репозиторию — и за одну сессию нашлись **две RLS-политики, которые существуют в проде и не описаны ни одной миграцией**. Ещё два случая: миграция 018 отработала вхолостую (искала условие, которого не было), а в 020 `grant execute` ничего не сузил, потому что в Postgres EXECUTE на новую функцию по умолчанию принадлежит `PUBLIC` — нужен явный `REVOKE`. Оба раза ошибку выдала только внешняя проверка, не сам факт «миграция применилась без ошибок».

Ниже — разовая настройка, после которой GitHub Actions применяет недостающие миграции сам.

### 10.1. Разовая настройка (локально, один раз)

```bash
# 1. Токен доступа: Supabase Dashboard → Account → Access Tokens
export SUPABASE_ACCESS_TOKEN=sbp_...

# 2. Связать репозиторий с проектом (project-ref виден в URL дашборда)
npx supabase link --project-ref ikucuostgfsmetztzzup

# 3. Посмотреть, что CLI считает применённым (на чистом проекте — ничего)
npx supabase migration list
```

**Критический шаг.** Прод получил миграции 001–021 вручную, поэтому в журнале их нет. Если этого не исправить, `db push` попытается применить их заново и упадёт. Отметить все как применённые, НЕ выполняя их:

```bash
npx supabase migration repair --status applied 001 002 003 004 005 006 007 008 009 010 \
                                                011 012 013 014 015 016 017 018 019 020 021
npx supabase migration list   # теперь все должны быть помечены applied
```

### 10.2. Включить автоприменение в CI

Добавить в **Settings → Secrets and variables → Actions**:

| Секрет | Значение |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | токен из шага 10.1 |
| `SUPABASE_PROJECT_ID` | `ikucuostgfsmetztzzup` |
| `SUPABASE_DB_PASSWORD` | пароль БД (Dashboard → Settings → Database) |
| `SUPABASE_MIGRATIONS_ENABLED` | `true` |

Шаг `Apply database migrations` в `.github/workflows/deploy.yml` пропускается, пока последнего секрета нет — то есть до завершения шага 10.1 ничего не произойдёт. После включения он выполняется **до** деплоя: упавшая миграция остановит релиз.

### 10.3. Правила для новых миграций

- **Миграция должна применяться повторно без ошибок.** Это проверяет `node scripts/check-migrations.mjs`, он же шаг CI: `create table/index if not exists`, `add column if not exists`, `create or replace function`, `drop ... if exists`, а перед `create policy` — обязательный `drop policy if exists`.
- 15 старых файлов в этот список не входят: в них 57 неповторяемых операций, и переписывать их без тестовой БД — значит получить нерабочий сценарий восстановления ровно в тот момент, когда он понадобится. Задача отдельная, делать её вместе с подъёмом staging.
- **Выдавая права на функцию, сначала `revoke ... from public`.** Иначе `grant to service_role` не сужает ничего (см. `021_revoke_public_execute.sql`).
- **После применения — проверять снаружи, а не доверять «ошибок не было».** Быстрый способ увидеть реальные права анонима:

```bash
# таблицы: ожидаем пустой ответ
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sessions?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# функции: вызывать с ПРАВИЛЬНЫМИ именованными параметрами —
# иначе PostgREST отвечает PGRST202 и для существующей функции тоже
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/count_session_voters" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_session_id":"<uuid>"}'   # ожидаем 42501 permission denied
```

### 10.4. Чего `config.toml` не делает

Файл сгенерирован `supabase init` и описывает **локальный** стек (порты, auth, storage). `db push` использует из него только `project_id` и каталог миграций. Не запускать `supabase config push` — он перезапишет настройки боевого проекта значениями из этого файла, которых никто не сверял с продом.
