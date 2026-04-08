/** Полное имя для UI: имя, отчество при наличии, фамилия. */
export function formatPatientFullName(parts: {
  firstName: string;
  lastName: string;
  middleName?: string | null;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter((s) => s.length > 0)
    .join(' ');
}
