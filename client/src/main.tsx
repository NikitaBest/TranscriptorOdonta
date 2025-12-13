import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTelegramWebApp } from "./lib/telegram";

// Инициализация Telegram Web App при загрузке
if (typeof window !== 'undefined') {
  initTelegramWebApp();
  
  // Обработка события beforeinstallprompt для PWA
  // Компонент InstallPWAButton также слушает это событие,
  // но здесь мы сохраняем его для глобального доступа
  window.addEventListener('beforeinstallprompt', (e) => {
    // Предотвращаем автоматический показ промпта
    e.preventDefault();
    // Сохраняем событие для использования позже
    (window as any).deferredPrompt = e;
    console.log('[PWA] Событие beforeinstallprompt сохранено');
  });
  
  // Обработка успешной установки PWA
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Приложение успешно установлено');
    // Очищаем deferredPrompt после установки
    (window as any).deferredPrompt = null;
  });
}

createRoot(document.getElementById("root")!).render(<App />);
