// Exportación de períodos BH360 a un archivo Excel (.xlsx) con SheetJS.
// xlsx se carga de forma diferida (import dinámico) para no inflar el bundle inicial.
import {
  DIMENSIONS,
  MEDIA_CHANNELS,
  LEVEL_LABELS,
  calculateBH360,
  getMediaMix,
  getNormalized,
  type PeriodData,
} from "./bh360"

// Filas de la hoja "Períodos": crudos + normalizados + BH360 + nivel.
function periodRows(data: PeriodData[]): Record<string, string | number>[] {
  return data.map((p) => {
    const r = calculateBH360(p)
    const row: Record<string, string | number> = {
      Período: p.period,
      Marca: p.brand,
      Campaña: p.campaign,
    }
    for (const d of DIMENSIONS) {
      row[`${d.label} (${d.unit})`] =
        d.id === "investment" ? p.investment : (p[d.id as keyof PeriodData] as number)
    }
    for (const d of DIMENSIONS) {
      row[`${d.label.split(" ")[0]} (0-100)`] = Math.round(getNormalized(r, d.id) * 10) / 10
    }
    row["BH360"] = r.score
    row["Nivel"] = LEVEL_LABELS[r.level]
    return row
  })
}

// Filas de la hoja "Mix de Medios": inversión por canal y período.
function mediaRows(data: PeriodData[]): Record<string, string | number>[] {
  return data.map((p) => {
    const mix = getMediaMix(p)
    const row: Record<string, string | number> = { Período: p.period }
    for (const c of MEDIA_CHANNELS) {
      row[`${c.label} (S/)`] = mix[c.id]
    }
    row["Total (S/)"] = p.investment
    return row
  })
}

export async function exportToExcel(data: PeriodData[], fileName = "BH360.xlsx"): Promise<void> {
  if (!data.length) return
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(periodRows(data)), "Períodos")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mediaRows(data)), "Mix de Medios")
  XLSX.writeFile(wb, fileName)
}
