import { useEffect, useRef } from 'react';
import { getTitleForPath } from '@/lib/page-titles';

/**
 * Устанавливает document.title по текущему маршруту и восстанавливает его,
 * если заголовок был подменён (расширение, кэш и т.п.):
 * - при смене маршрута;
 * - при возврате на вкладку (visibilitychange);
 * - при любом изменении тега <title> (MutationObserver).
 */
export function usePageTitle(pathname: string) {
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Установка заголовка при смене маршрута
  useEffect(() => {
    const title = getTitleForPath(pathname);
    document.title = title;
  }, [pathname]);

  // Восстановление заголовка при возврате на вкладку
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        document.title = getTitleForPath(pathRef.current);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Восстановление при подмене заголовка (расширения, инъекции)
  useEffect(() => {
    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const observer = new MutationObserver(() => {
      const expected = getTitleForPath(pathRef.current);
      if (document.title !== expected) {
        document.title = expected;
      }
    });

    observer.observe(titleEl, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);
}
