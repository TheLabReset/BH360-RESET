// Persistencia de períodos en localStorage con migración y manejo de errores.
import { type PeriodData, SAMPLE_DATA, getMediaMix } from "./bh360"

const STORAGE_KEY = "bh360_periods_v1"

// Normaliza un período cargado: garantiza que tenga mediaMix coherente.
function migratePeriod(p: PeriodData): PeriodData {
  return { ...p, mediaMix: getMediaMix(p) }
}

export function hasStoredPeriods(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function loadPeriods(): PeriodData[] {
  if (typeof window === "undefined") return SAMPLE_DATA
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return SAMPLE_DATA
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return SAMPLE_DATA
    return parsed.map(migratePeriod)
  } catch {
    // JSON corrupto o storage inaccesible: volver a los datos de ejemplo.
    return SAMPLE_DATA
  }
}

export function savePeriods(data: PeriodData[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage lleno o no disponible: ignorar silenciosamente.
  }
}

export function clearPeriods(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // noop
  }
}
