/**
 * Утилиты для работы с номерами телефонов
 */

/**
 * Нормализует номер телефона для отправки на бэкенд
 * Удаляет все нецифровые символы, заменяет 8 на 7 в начале
 * @param phone - номер телефона в любом формате
 * @returns номер в формате 79911110024 (только цифры, начинается с 7)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Удаляем все нецифровые символы
  let digits = phone.replace(/\D/g, '');
  
  // Если номер начинается с 8, заменяем на 7
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  
  // Если номер не начинается с 7, добавляем 7 в начало
  if (digits && !digits.startsWith('7')) {
    digits = '7' + digits;
  }
  
  // Ограничиваем до 11 цифр (7 + 10 цифр)
  return digits.slice(0, 11);
}

/**
 * Форматирует номер телефона для отображения
 * @param phone - номер телефона (может быть в любом формате)
 * @returns отформатированный номер для отображения (например: +7 (991) 111-00-24)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  // Нормализуем номер
  const normalized = normalizePhone(phone);
  
  if (!normalized || normalized.length < 11) {
    return phone; // Возвращаем как есть, если номер неполный
  }
  
  // Форматируем: +7 (991) 111-00-24
  const code = normalized.slice(1, 4);
  const part1 = normalized.slice(4, 7);
  const part2 = normalized.slice(7, 9);
  const part3 = normalized.slice(9, 11);
  
  return `+7 (${code}) ${part1}-${part2}-${part3}`;
}

/**
 * Обрабатывает ввод телефона в поле ввода
 * Разрешает ввод только цифр, автоматически заменяет 8 на 7
 * @param value - значение из поля ввода
 * @returns обработанное значение для отображения
 */
export function handlePhoneInput(value: string): string {
  if (!value) return '';
  
  // Удаляем все нецифровые символы
  let digits = value.replace(/\D/g, '');
  
  // Если начинается с 8, заменяем на 7
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  
  // Если есть цифры и не начинается с 7, добавляем 7
  if (digits && !digits.startsWith('7')) {
    digits = '7' + digits;
  }
  
  // Ограничиваем до 11 цифр
  digits = digits.slice(0, 11);
  
  // Форматируем для отображения: +7 (999) 123-45-67
  if (digits.length === 0) {
    return '';
  }
  
  if (digits.length <= 1) {
    return '+' + digits;
  }
  
  if (digits.length <= 4) {
    return `+7 (${digits.slice(1)}`;
  }
  
  if (digits.length <= 7) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  }
  
  if (digits.length <= 9) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Полный формат: +7 (999) 123-45-67
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
}

