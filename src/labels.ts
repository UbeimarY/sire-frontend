import { Role } from "./gen/sire/v1/auth_pb";
import { AmbulanceStatus, IncidentStatus, TriageLevel } from "./gen/sire/v1/common_pb";

export const triageInfo: Record<TriageLevel, { label: string; short: string; color: string; hint: string }> = {
  [TriageLevel.UNSPECIFIED]: { label: "Sin clasificar", short: "—", color: "#8a8f98", hint: "" },
  [TriageLevel.I]: { label: "Triage I · Resucitación", short: "I", color: "#d7263d", hint: "Riesgo vital inmediato" },
  [TriageLevel.II]: { label: "Triage II · Emergencia", short: "II", color: "#f46036", hint: "Atención en minutos" },
  [TriageLevel.III]: { label: "Triage III · Urgencia", short: "III", color: "#e9b44c", hint: "Estable, requiere atención" },
  [TriageLevel.IV]: { label: "Triage IV · Menor", short: "IV", color: "#3fa34d", hint: "Urgencia menor" },
  [TriageLevel.V]: { label: "Triage V · No urgente", short: "V", color: "#2e86ab", hint: "Consulta prioritaria" },
};

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  [IncidentStatus.UNSPECIFIED]: "—",
  [IncidentStatus.PENDING]: "En espera",
  [IncidentStatus.ASSIGNED]: "Asignado",
  [IncidentStatus.EN_ROUTE]: "En camino",
  [IncidentStatus.ON_SCENE]: "En el sitio",
  [IncidentStatus.TRANSPORTING]: "Trasladando",
  [IncidentStatus.AT_HOSPITAL]: "En hospital",
  [IncidentStatus.CLOSED]: "Cerrado",
};

export const ambulanceStatusLabel: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.UNSPECIFIED]: "—",
  [AmbulanceStatus.AVAILABLE]: "Disponible",
  [AmbulanceStatus.EN_ROUTE]: "En camino",
  [AmbulanceStatus.ON_SCENE]: "En el sitio",
  [AmbulanceStatus.TRANSPORTING]: "Trasladando",
  [AmbulanceStatus.AT_HOSPITAL]: "En hospital",
  [AmbulanceStatus.OFFLINE]: "Desconectada",
};

export const ambulanceColor: Record<AmbulanceStatus, string> = {
  [AmbulanceStatus.UNSPECIFIED]: "#8a8f98",
  [AmbulanceStatus.AVAILABLE]: "#3fa34d",
  [AmbulanceStatus.EN_ROUTE]: "#f46036",
  [AmbulanceStatus.ON_SCENE]: "#d7263d",
  [AmbulanceStatus.TRANSPORTING]: "#7b2cbf",
  [AmbulanceStatus.AT_HOSPITAL]: "#2e86ab",
  [AmbulanceStatus.OFFLINE]: "#8a8f98",
};

export const roleLabel: Record<Role, string> = {
  [Role.UNSPECIFIED]: "—",
  [Role.OPERATOR]: "Operador de despacho",
  [Role.HOSPITAL]: "Urgencias hospitalarias",
  [Role.ADMIN]: "Administrador",
};

export function formatEta(seconds: number): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export function formatTime(ms: bigint | number): string {
  return new Date(Number(ms)).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
