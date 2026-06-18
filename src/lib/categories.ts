export const REPORT_CATEGORIES = [
  { value: "vehicule_suspect", label: "Véhicule suspect", icon: "🚗" },
  { value: "rodeur", label: "Rôdeur / comportement suspect", icon: "👤" },
  { value: "incivilite", label: "Incivilité / nuisance", icon: "📣" },
  { value: "degradation", label: "Dégradation / vandalisme", icon: "🔨" },
  { value: "accident", label: "Accident", icon: "⚠️" },
  { value: "animal", label: "Animal errant / dangereux", icon: "🐕" },
  { value: "eclairage", label: "Éclairage public HS", icon: "💡" },
  { value: "depot_sauvage", label: "Dépôt sauvage", icon: "🗑️" },
  { value: "autre", label: "Autre", icon: "❓" },
] as const;

export type ReportCategoryValue = (typeof REPORT_CATEGORIES)[number]["value"];

export const SEVERITY_OPTIONS = [
  { value: "info", label: "Information", color: "var(--color-muted-foreground)" },
  { value: "vigilance", label: "Vigilance", color: "var(--color-warning)" },
  { value: "urgent", label: "Urgent", color: "var(--color-sos)" },
] as const;

export function categoryLabel(v: string) {
  return REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
export function categoryIcon(v: string) {
  return REPORT_CATEGORIES.find((c) => c.value === v)?.icon ?? "📍";
}
