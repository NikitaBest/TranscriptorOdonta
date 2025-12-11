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

Скопируйте файл `.env.example` в `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env` файл и укажите необходимые значения:

```env
# URL базового API бэкенда
VITE_API_BASE_URL=https://transcriptor-backend-api.odonta.burtimaxbot.ru

# Таймаут для API запросов в миллисекундах
VITE_API_TIMEOUT=30000
```

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
| `VITE_API_BASE_URL` | URL базового API бэкенда | `https://transcriptor-backend-api.odonta.burtimaxbot.ru` |
| `VITE_API_TIMEOUT` | Таймаут для API запросов (мс) | `30000` |

**Важно**: Все переменные окружения должны начинаться с префикса `VITE_` для работы с Vite.

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
1. Переменная `VITE_API_BASE_URL` правильно настроена в `.env`
2. Бэкенд API доступен и возвращает корректные CORS заголовки
3. После изменения `.env` перезапустите dev-сервер

### Проблемы со сборкой

Если сборка не работает:
1. Удалите `node_modules` и `package-lock.json`
2. Выполните `npm install` заново
3. Проверьте версию Node.js: `node --version` (должна быть >= 18)

## Лицензия

MIT
