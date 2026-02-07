# Transcriptor Odonta

Фронтенд приложение для автоматической транскрипции и отчетности стоматологических консультаций.

## Технологический стек

- **React 19** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик и dev-сервер
- **Tailwind CSS** - стилизация
- **Radix UI** - компоненты UI
- **TanStack Query** - управление состоянием и кэширование
- **Wouter** - маршрутизация
- **Telegram Web App** - интеграция с Telegram

## Требования

- **Node.js** версии 18 или выше
- **npm** или **yarn** для управления зависимостями

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd TranscriptorOdonta
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка переменных окружения

#### Вариант 1: Один `.env` + `.env.local` (рекомендуется)

1. Оставьте ваш `.env` файл с продакшн настройками:
```env
VITE_API_BASE_URL=https://backend.ai.odonta.ru
VITE_API_TIMEOUT=30000
```

2. Создайте `.env.local` для разработки (игнорируется git):
```env
VITE_API_BASE_URL=https://dev-backend.ai.odonta.ru
VITE_API_TIMEOUT=30000
```

**Как работает:**
- `npm run dev` → использует `.env.local` (если есть) → dev-backend
- `npm run build` → использует `.env` → production-backend

#### Вариант 2: Отдельные файлы для каждого режима

Создайте `.env.development` и `.env.production` (см. подробности в `инструкция.md`)

### 4. Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:5005`

## Сборка для production

### Создание production сборки

```bash
npm run build
```

Собранные файлы будут находиться в папке `dist/`.

### Предпросмотр production сборки

```bash
npm run preview
```

## Развертывание на сервере

### Вариант 1: Статический хостинг

После выполнения `npm run build`, содержимое папки `dist/` можно загрузить на любой статический хостинг:

- **Nginx**: Скопируйте содержимое `dist/` в директорию веб-сервера
- **Apache**: Аналогично, скопируйте в `htdocs` или другую директорию
- **CDN**: Загрузите файлы на CDN (Cloudflare, AWS CloudFront и т.д.)

#### Пример конфигурации Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Вариант 2: Node.js сервер

Можно использовать простой Node.js сервер для раздачи статических файлов:

```bash
# Установите serve глобально
npm install -g serve

# Запустите сервер
serve -s dist -l 5005
```

### Вариант 3: Docker

Создайте `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

И `nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Сборка и запуск:

```bash
docker build -t transcriptor-odonta .
docker run -p 80:80 transcriptor-odonta
```

## Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `VITE_API_BASE_URL` | URL базового API бэкенда | Зависит от режима (см. ниже) |
| `VITE_API_TIMEOUT` | Таймаут для API запросов (мс) | `30000` |

**Важно**: 
- Все переменные окружения должны начинаться с префикса `VITE_` для работы с Vite
- Vite автоматически загружает файлы в зависимости от режима:
  - **Разработка** (`npm run dev`): `.env.development` → `.env.local` → `.env`
  - **Продакшен** (`npm run build`): `.env.production` → `.env.local` → `.env`

### Примеры файлов

**`.env.development`** (для разработки):
```env
VITE_API_BASE_URL=https://dev-backend.ai.odonta.ru
VITE_API_TIMEOUT=30000
```

**`.env.production`** (для продакшена):
```env
VITE_API_BASE_URL=https://transcriptor-backend-api.odonta.burtimaxbot.ru
VITE_API_TIMEOUT=30000
```

**`.env.local`** (локальные переопределения, игнорируется git):
```env
# Переопределяет значения для вашей локальной машины
VITE_API_BASE_URL=http://localhost:8000
```

## Структура проекта

```
TranscriptorOdonta/
├── client/                 # Исходный код приложения
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── lib/           # Утилиты и API клиент
│   │   ├── hooks/         # React хуки
│   │   └── main.tsx       # Точка входа
│   ├── public/            # Статические файлы
│   └── index.html         # HTML шаблон
├── dist/                  # Production сборка (генерируется)
├── .env.example           # Пример переменных окружения
├── package.json           # Зависимости и скрипты
├── vite.config.ts         # Конфигурация Vite
└── tsconfig.json          # Конфигурация TypeScript
```

## Доступные команды

- `npm run dev` - Запуск dev-сервера на порту 5005
- `npm run build` - Сборка production версии
- `npm run preview` - Предпросмотр production сборки
- `npm run check` - Проверка типов TypeScript

## Особенности

- Приложение интегрировано с Telegram Web App SDK
- Используется JWT аутентификация через Bearer токены
- Поддержка CORS для работы с внешним API
- Адаптивный дизайн для мобильных устройств

## Устранение неполадок

### Проблемы с портом

Если порт 5005 занят, измените его в `vite.config.ts` или используйте:

```bash
npm run dev -- --port 3000
```

### Проблемы с API

Убедитесь, что:
1. Переменная `VITE_API_BASE_URL` правильно настроена в `.env.development` (для dev) или `.env.production` (для build)
2. Бэкенд API доступен и возвращает корректные CORS заголовки
3. После изменения `.env` файлов перезапустите dev-сервер
4. Проверьте, что используете правильный файл для нужного режима:
   - `npm run dev` → использует `.env.development`
   - `npm run build` → использует `.env.production`

### Проблемы со сборкой

Если сборка не работает:
1. Удалите `node_modules` и `package-lock.json`
2. Выполните `npm install` заново
3. Проверьте версию Node.js: `node --version` (должна быть >= 18)

## Лицензия

MIT
