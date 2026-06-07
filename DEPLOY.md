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
