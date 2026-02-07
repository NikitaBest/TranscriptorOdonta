/**
 * Утилиты для работы с датами
 */

/**
 * Валидирует дату в формате DD.MM.YYYY или DD/MM/YYYY
 * @param dateString - строка с датой
 * @returns true если дата валидна, false если нет
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString || dateString.trim() === '') {
    return false;
  }

  // Поддерживаем форматы: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const dateRegex = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
  const match = dateString.match(dateRegex);
  
  if (!match) {
    return false;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Проверяем диапазоны
  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  // Проверяем валидность даты
  const date = new Date(year, month - 1, day);
  
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  // Проверяем, что дата не в будущем
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) {
    return false;
  }

  return true;
}

/**
 * Нормализует дату для отправки на бэкенд
 * Преобразует DD.MM.YYYY, DD/MM/YYYY или DD-MM-YYYY в YYYY-MM-DD
 * @param dateString - дата в любом формате
 * @returns дата в формате YYYY-MM-DD или пустая строка если невалидна
 */
export function normalizeDate(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  // Если уже в формате YYYY-MM-DD, возвращаем как есть
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(dateString)) {
    // Проверяем валидность
    const date = new Date(dateString + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return dateString;
    }
  }

  // Парсим форматы DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
  const dateRegex = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
  const match = dateString.match(dateRegex);
  
  if (!match) {
    return '';
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Проверяем валидность
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  // Форматируем в YYYY-MM-DD
  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  
  return `${year}-${formattedMonth}-${formattedDay}`;
}

/**
 * Форматирует дату для отображения
 * Преобразует YYYY-MM-DD в DD.MM.YYYY
 * @param dateString - дата в формате YYYY-MM-DD или ISO
 * @returns дата в формате DD.MM.YYYY или исходная строка если невалидна
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  try {
    // Берем только дату без времени
    const dateOnly = dateString.split('T')[0];
    const parts = dateOnly.split('-');
    
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      
      // Проверяем валидность
      const date = new Date(`${year}-${month}-${day}T00:00:00`);
      if (!isNaN(date.getTime())) {
        return `${day}.${month}.${year}`;
      }
    }
  } catch (e) {
    // Игнорируем ошибки
  }

  return dateString;
}

/**
 * Обрабатывает ввод даты в поле ввода
 * Автоматически форматирует в DD.MM.YYYY
 * @param value - значение из поля ввода
 * @returns обработанное значение для отображения
 */
export function handleDateInput(value: string): string {
  if (!value) return '';

  // Удаляем все символы кроме цифр, точек, слэшей и дефисов
  let cleaned = value.replace(/[^\d./-]/g, '');

  // Ограничиваем длину (DD.MM.YYYY = 10 символов)
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(0, 10);
  }

  // Если пользователь вводит только цифры, автоматически добавляем разделители
  const digitsOnly = cleaned.replace(/[./-]/g, '');
  
  if (digitsOnly.length <= 2) {
    return digitsOnly;
  } else if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2)}`;
  } else if (digitsOnly.length <= 8) {
    return `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4)}`;
  } else {
    // Ограничиваем до 8 цифр (DD.MM.YYYY)
    const limited = digitsOnly.slice(0, 8);
    return `${limited.slice(0, 2)}.${limited.slice(2, 4)}.${limited.slice(4)}`;
  }
}

