# Настройка Яндекс OAuth

## 1. Создать OAuth-приложение в Яндексе

1. Открыть [https://oauth.yandex.ru/](https://oauth.yandex.ru/) → **Создать приложение**
2. Название: `LivePoll AI`
3. Платформы: выбрать **Веб-сервисы**
4. В поле **Callback URI** указать:
   ```
   https://<ваш-домен>/auth/callback
   ```
   Для локальной разработки добавить отдельно:
   ```
   http://localhost:3000/auth/callback
   ```
5. Доступы (OAuth-разрешения): выбрать **Яндекс ID** → `login:email`, `login:info`
6. Сохранить приложение. Запомнить **Client ID** и **Client Secret**.

## 2. Включить провайдер в Supabase

1. Supabase Dashboard → **Authentication** → **Providers**
2. Найти **Yandex**, включить
3. Вставить:
   - **Client ID** — из шага 1
   - **Client Secret** — из шага 1
4. Скопировать **Callback URL** из Supabase (выглядит как `https://<project>.supabase.co/auth/v1/callback`)
5. Вернуться в OAuth-приложение Яндекса и добавить этот URL как ещё один **Callback URI**

## 3. Переменные окружения

`.env.local` — дополнительных переменных для OAuth не требуется.  
Supabase хранит Client ID/Secret в своих настройках.

Убедиться что задано:
```
NEXT_PUBLIC_SITE_URL=https://<ваш-домен>
```
Это нужно для `redirectTo` в `signInWithYandex()`.

## 4. Проверка

1. Запустить `npm run dev`
2. Открыть `/auth/login` или `/auth/register`
3. Нажать **Войти через Яндекс** / **Зарегистрироваться через Яндекс**
4. Должен открыться диалог Яндекса → после подтверждения редирект на `/auth/callback` → `/org/<slug>`

## Что происходит в коде

```
signInWithYandex()               ← server action в auth.ts
  → supabase.auth.signInWithOAuth({ provider: "yandex" })
  → редирект на Яндекс
  → Яндекс → Supabase callback
  → /auth/callback (route.ts)
    → supabase.auth.exchangeCodeForSession(code)
    → ensureUserOrg(userId, fullName)   ← создаёт орг если первый вход
    → редирект на /org/<slug>
```
