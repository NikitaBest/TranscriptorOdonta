/** Полное имя для UI: фамилия, имя, отчество при наличии (официальный порядок). */
export function formatPatientFullName(parts: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}): string {
  return [parts.lastName, parts.firstName, parts.middleName]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter((s) => s.length > 0)
    .join(' ');
}
