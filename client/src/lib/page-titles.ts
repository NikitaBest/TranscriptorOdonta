/**
 * Эталонные заголовки вкладок по маршрутам.
 * Используются для установки document.title и для восстановления при подмене (расширения, кэш).
 */
const ROUTE_TITLES: { pattern: RegExp | string; title: string }[] = [
  { pattern: '/settings', title: 'Настройки' },
  { pattern: '/dashboard', title: 'Пациенты' },
  { pattern: '/history', title: 'История' },
  { pattern: '/record', title: 'Запись' },
  { pattern: /^\/patient\/new\/?$/, title: 'Новый пациент' },
  { pattern: /^\/patient\/[^/]+\/edit\/?$/, title: 'Редактирование пациента' },
  { pattern: /^\/patient\/[^/]+\/?$/, title: 'Карта пациента' },
  { pattern: /^\/consultation\/[^/]+\/ai-report\/?$/, title: 'AI-оценка консультации' },
  { pattern: /^\/consultation\/[^/]+\/?$/, title: 'Отчет консультации' },
  { pattern: /^\/share\/consultation\/.+/, title: 'Консультация' },
  { pattern: '/auth', title: 'Вход' },
  { pattern: '/register', title: 'Регистрация' },
  { pattern: '/forgot-password', title: 'Восстановление пароля' },
  { pattern: '/reset-password', title: 'Новый пароль' },
  { pattern: '/confirm-email', title: 'Подтверждение email' },
  { pattern: '/', title: 'Odonta AI' },
];

const DEFAULT_TITLE = 'Odonta AI';

/**
 * Возвращает эталонный заголовок вкладки для текущего pathname.
 */
export function getTitleForPath(pathname: string): string {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  for (const { pattern, title } of ROUTE_TITLES) {
    if (typeof pattern === 'string') {
      if (path === pattern || path.startsWith(pattern + '/')) return title;
    } else {
      if (pattern.test(path)) return title;
    }
  }
  return DEFAULT_TITLE;
}

/**
 * Проверяет, что переданная строка является одним из наших эталонных заголовков.
 * Используется для восстановления при подмене.
 */
export function isCanonicalTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const canonical = new Set(ROUTE_TITLES.map((r) => r.title));
  canonical.add(DEFAULT_TITLE);
  return canonical.has(title.trim());
}
