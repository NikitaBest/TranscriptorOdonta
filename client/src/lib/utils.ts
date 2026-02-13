import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Подпись роли для консультации: сначала clinicRole (врач/координатор), при наличии — roleAlias через тире, иначе «Врач». */
export function getConsultationRoleLabel(
  roleAlias?: string | null,
  clinicRole?: string | null
): string {
  const clinicRoleDisplay =
    clinicRole === "doctor"
      ? "Врач"
      : clinicRole === "coordinator"
        ? "Координатор"
        : clinicRole?.trim() || ""
  const roleAliasDisplay = roleAlias?.trim() || ""
  if (clinicRoleDisplay && roleAliasDisplay && roleAliasDisplay !== clinicRoleDisplay) {
    return `${clinicRoleDisplay} — ${roleAliasDisplay}`
  }
  if (clinicRoleDisplay) return clinicRoleDisplay
  if (roleAliasDisplay) return roleAliasDisplay
  return "Врач"
}
