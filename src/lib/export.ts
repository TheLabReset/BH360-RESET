// Exportación de períodos BH360 a un archivo Excel (.xlsx) con SheetJS.
import * as XLSX from "xlsx"
import {
  DIMENSIONS,
  MEDIA_CHANNELS,
  LEVEL_LABELS,
  calculateBH360,
  getMediaMix,
  getNormalized,
  type PeriodData,
} from "./bh360"

// Hoja "Períodos": datos crudos + BH360 + nivel + normalizados por dimensión.
function buildPeriodsSheet(data: PeriodData[]) {
  const rows = data.map((p) => {
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
  return XLSX.utils.json_to_sheet(rows)
}

// Hoja "Mix de Medios": inversión por canal y período.
function buildMediaSheet(data: PeriodData[]) {
  const rows = data.map((p) => {
    const mix = getMediaMix(p)
    const row: Record<string, string | number> = { Período: p.period }
    for (const c of MEDIA_CHANNELS) {
      row[`${c.label} (S/)`] = mix[c.id]
    }
    row["Total (S/)"] = p.investment
    return row
  })
  return XLSX.utils.json_to_sheet(rows)
}

export function exportToExcel(data: PeriodData[], fileName = "BH360.xlsx"): void {
  if (!data.length) return
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildPeriodsSheet(data), "Períodos")
  XLSX.utils.book_append_sheet(wb, buildMediaSheet(data), "Mix de Medios")
  XLSX.writeFile(wb, fileName)
}
