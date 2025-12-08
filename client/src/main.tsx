import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTelegramWebApp } from "./lib/telegram";

// Инициализация Telegram Web App при загрузке
if (typeof window !== 'undefined') {
  initTelegramWebApp();
}

createRoot(document.getElementById("root")!).render(<App />);
