// ─── Interfaces ───────────────────────────────────────────────

export interface DimensionConfig {
  id: string
  label: string
  pillar: "input" | "equity" | "performance"
  weight: number
  floor: number
  ceiling: number
  unit: string
  source: string
  description: string
  justification: string
}

export interface MediaMix {
  tvAbierta: number
  digital: number
  ooh: number
  radio: number
  periodico: number
}

export interface PeriodData {
  period: string
  brand: string
  campaign: string
  investment: number
  reach: number
  purchase: number
  sentiment: number
  sales: number
  // Desglose de inversión por medio. Su suma debe igualar a `investment`.
  // Opcional para mantener compatibilidad con períodos antiguos sin desglose.
  mediaMix?: MediaMix
}

export interface NormalizedScores {
  investment: number
  reach: number
  purchase: number
  sentiment: number
  sales: number
}

export interface BH360Result {
  score: number
  normalized: NormalizedScores
  contributions: Record<string, number>
  pillarScores: Record<string, number>
  interpretation: string
  level: string
}

// ─── Constantes ───────────────────────────────────────────────

export const DIMENSIONS: DimensionConfig[] = [
  {
    id: "investment",
    label: "Inversión de Campaña",
    pillar: "input",
    weight: 0.15,
    floor: 0,
    ceiling: 500_000,
    unit: "S/",
    source: "Agencia de medios",
    description:
      "Inversión total en medios pagados durante la campaña. Se desagrega por medio (TV Abierta, Digital, OOH, Radio, Periódico) y su suma alimenta esta dimensión.",
    justification:
      "Binet & Davis (IPA, 2025): el presupuesto explica el 89% de las variaciones en beneficio. Es el input más controlable por la marca.",
  },
  {
    id: "reach",
    label: "Alcance Deduplicado",
    pillar: "input",
    weight: 0.20,
    floor: 0,
    ceiling: 95,
    unit: "%",
    source: "Agencia + plataformas",
    description:
      "Porcentaje del universo target alcanzado al menos una vez durante el período, deduplicado cross-media.",
    justification:
      "Sharp (2010): mental availability es el driver principal de crecimiento. El reach es su proxy más directo y medible.",
  },
  {
    id: "purchase",
    label: "Compra Declarada (Último Mes)",
    pillar: "equity",
    weight: 0.25,
    floor: 0,
    ceiling: 85,
    unit: "%",
    source: "Ipsos / Panel digital The Lab",
    description:
      "Porcentaje de encuestados que declaran haber comprado la marca en el último mes. Medido vía panel online o tracking.",
    justification:
      "Brand Finance BrandBeta (2022): familiaridad (65%) + consideración (35%) explican 80%+ de varianza en market share. Compra declarada es la métrica de equity más predictiva.",
  },
  {
    id: "sentiment",
    label: "Net Sentiment Score",
    pillar: "equity",
    weight: 0.15,
    floor: -100,
    ceiling: 100,
    unit: "NSS",
    source: "Agencia creativa / Social listening",
    description:
      "Net Sentiment Score: diferencia entre el porcentaje de menciones positivas y negativas. Rango natural de -100 (muy negativo) a +100 (muy positivo).",
    justification:
      "Field (IPA, 2026): 93% de campañas con grandes mejoras en trust reportan efectos de negocio. Peso moderado (15%) porque es volátil y sensible a crisis.",
  },
  {
    id: "sales",
    label: "Ventas del Período",
    pillar: "performance",
    weight: 0.25,
    floor: 0,
    ceiling: 12_000_000,
    unit: "S/",
    source: "Cliente (ERP)",
    description:
      "Ventas netas en soles del período. Dato provisto por el cliente desde su ERP o reporte financiero.",
    justification:
      "Es el resultado final de negocio. Peso igual al de Compra Declarada (25%) para balancear equity con performance real.",
  },
]

export const PILLAR_COLORS: Record<string, string> = {
  input: "#3b82f6",
  equity: "#8b5cf6",
  performance: "#10b981",
}

export const PILLAR_LABELS: Record<string, string> = {
  input: "Input",
  equity: "Equity",
  performance: "Performance",
}

export const LEVEL_COLORS: Record<string, string> = {
  critical: "#ef4444",
  weak: "#f97316",
  moderate: "#eab308",
  strong: "#22c55e",
  exceptional: "#06b6d4",
}

export const LEVEL_LABELS: Record<string, string> = {
  critical: "Crítica",
  weak: "Débil",
  moderate: "Moderada",
  strong: "Fuerte",
  exceptional: "Excepcional",
}

// ─── Mix de medios ────────────────────────────────────────────

export interface MediaChannelConfig {
  id: keyof MediaMix
  label: string
  color: string
}

export const MEDIA_CHANNELS: MediaChannelConfig[] = [
  { id: "tvAbierta", label: "TV Abierta", color: "#3b82f6" },
  { id: "digital", label: "Digital", color: "#8b5cf6" },
  { id: "ooh", label: "OOH", color: "#10b981" },
  { id: "radio", label: "Radio", color: "#f59e0b" },
  { id: "periodico", label: "Periódico", color: "#ec4899" },
]

// Distribución por defecto del presupuesto (suma 1.0). Calibrada para
// FMCG en Perú: TV Abierta dominante, Digital en crecimiento.
export const DEFAULT_MEDIA_SHARES: Record<keyof MediaMix, number> = {
  tvAbierta: 0.45,
  digital: 0.3,
  ooh: 0.12,
  radio: 0.09,
  periodico: 0.04,
}

export function emptyMediaMix(): MediaMix {
  return { tvAbierta: 0, digital: 0, ooh: 0, radio: 0, periodico: 0 }
}

export function sumMediaMix(mix: MediaMix): number {
  return MEDIA_CHANNELS.reduce((acc, c) => acc + (mix[c.id] || 0), 0)
}

// Reparte un total entre medios según la distribución por defecto.
// El último canal absorbe el redondeo para que la suma sea exacta.
export function splitInvestment(total: number): MediaMix {
  const mix = emptyMediaMix()
  let allocated = 0
  MEDIA_CHANNELS.forEach((c, i) => {
    if (i === MEDIA_CHANNELS.length - 1) {
      mix[c.id] = Math.max(0, Math.round(total - allocated))
    } else {
      const value = Math.round(total * DEFAULT_MEDIA_SHARES[c.id])
      mix[c.id] = value
      allocated += value
    }
  })
  return mix
}

// Devuelve el mediaMix de un período, o uno derivado del total si no existe.
export function getMediaMix(data: PeriodData): MediaMix {
  return data.mediaMix ?? splitInvestment(data.investment)
}

export const SAMPLE_DATA: PeriodData[] = [
  {
    period: "Q3 2025",
    brand: "San Fernando",
    campaign: "Jueves de Pavita + Always On",
    investment: 180_000,
    reach: 68,
    purchase: 55,
    sentiment: 45,
    sales: 8_200_000,
    mediaMix: {
      tvAbierta: 81_000,
      digital: 54_000,
      ooh: 21_600,
      radio: 16_200,
      periodico: 7_200,
    },
  },
  {
    period: "Q4 2025",
    brand: "San Fernando",
    campaign: "Navidad + Pavo",
    investment: 380_000,
    reach: 78,
    purchase: 65,
    sentiment: 58,
    sales: 10_200_000,
    mediaMix: {
      tvAbierta: 171_000,
      digital: 114_000,
      ooh: 45_600,
      radio: 34_200,
      periodico: 15_200,
    },
  },
  {
    period: "Q1 2026",
    brand: "San Fernando",
    campaign: "Verano + Embutidos",
    investment: 250_000,
    reach: 77,
    purchase: 61,
    sentiment: 52,
    sales: 9_000_000,
    mediaMix: {
      tvAbierta: 112_500,
      digital: 75_000,
      ooh: 30_000,
      radio: 22_500,
      periodico: 10_000,
    },
  },
  {
    period: "Q2 2026",
    brand: "San Fernando",
    campaign: "Día de la Madre + Always On",
    investment: 450_000,
    reach: 89,
    purchase: 79,
    sentiment: 75,
    sales: 11_500_000,
    mediaMix: {
      tvAbierta: 202_500,
      digital: 135_000,
      ooh: 54_000,
      radio: 40_500,
      periodico: 18_000,
    },
  },
]

// ─── Funciones de normalización ───────────────────────────────

export function normalize(value: number, floor: number, ceiling: number): number {
  const range = ceiling - floor
  // Evita división por cero si piso === techo (config inválida o futura).
  if (range <= 0) return value >= ceiling ? 100 : 0
  return Math.min(100, Math.max(0, ((value - floor) / range) * 100))
}

export function normalizeNSS(nss: number): number {
  return ((nss + 100) / 200) * 100
}

// Lookup de configuración por id para evitar números mágicos duplicados.
const DIM_BY_ID: Record<string, DimensionConfig> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.id, d])
)

// Normaliza un valor crudo a 0-100 usando los goalposts de su dimensión.
// El Sentiment usa la transformación especial de NSS (-100..+100).
export function normalizeDimension(dimId: string, value: number): number {
  const dim = DIM_BY_ID[dimId]
  if (!dim) return 0
  if (dimId === "sentiment") return normalizeNSS(value)
  return normalize(value, dim.floor, dim.ceiling)
}

// ─── Función principal de cálculo ─────────────────────────────

export function calculateBH360(data: PeriodData): BH360Result {
  const normalized: NormalizedScores = {
    // La inversión se deriva del mediaMix cuando existe (fuente única de verdad).
    investment: normalizeDimension("investment", getDimensionValue(data, "investment")),
    reach: normalizeDimension("reach", data.reach),
    purchase: normalizeDimension("purchase", data.purchase),
    sentiment: normalizeDimension("sentiment", data.sentiment),
    sales: normalizeDimension("sales", data.sales),
  }

  const contributions: Record<string, number> = {}
  let score = 0

  for (const dim of DIMENSIONS) {
    const normValue = normalized[dim.id as keyof NormalizedScores]
    const contrib = normValue * dim.weight
    contributions[dim.id] = contrib
    score += contrib
  }

  // Pillar scores: promedio ponderado de las dimensiones dentro de cada pilar.
  const pillarScores: Record<string, number> = {}
  for (const pillar of Object.keys(PILLAR_LABELS)) {
    const dims = DIMENSIONS.filter((d) => d.pillar === pillar)
    const totalWeight = dims.reduce((acc, d) => acc + d.weight, 0)
    pillarScores[pillar] =
      totalWeight === 0
        ? 0
        : dims.reduce(
            (acc, d) =>
              acc + normalized[d.id as keyof NormalizedScores] * d.weight,
            0
          ) / totalWeight
  }

  let level: string
  let interpretation: string

  if (score <= 30) {
    level = "critical"
    interpretation =
      "Salud de negocio crítica. Se requiere intervención inmediata en múltiples dimensiones."
  } else if (score <= 50) {
    level = "weak"
    interpretation =
      "Salud de negocio débil. Hay oportunidades significativas de mejora en las dimensiones con menor puntaje."
  } else if (score <= 70) {
    level = "moderate"
    interpretation =
      "Salud de negocio moderada. La marca tiene bases sólidas pero puede optimizar dimensiones específicas."
  } else if (score <= 85) {
    level = "strong"
    interpretation =
      "Salud de negocio fuerte. La marca muestra buen desempeño en la mayoría de dimensiones."
  } else {
    level = "exceptional"
    interpretation =
      "Salud de negocio excepcional. Desempeño sobresaliente en todas las dimensiones."
  }

  return {
    score: Math.round(score * 10) / 10,
    normalized,
    contributions,
    pillarScores,
    interpretation,
    level,
  }
}

// ─── Utilidades de formato ────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `S/ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return `S/ ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return `S/ ${value.toFixed(0)}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDimensionValue(dimId: string, value: number): string {
  switch (dimId) {
    case "investment":
    case "sales":
      return formatCurrency(value)
    case "reach":
    case "purchase":
      return formatPercent(value)
    case "sentiment":
      return value >= 0 ? `+${value}` : `${value}`
    default:
      return String(value)
  }
}

export function getDimensionValue(data: PeriodData, dimId: string): number {
  // La inversión siempre se deriva del desglose por medio (fuente única).
  if (dimId === "investment") {
    return sumMediaMix(getMediaMix(data))
  }
  const value = data[dimId as keyof PeriodData]
  return typeof value === "number" ? value : 0
}

// Accesores tipados para leer del resultado sin `as` frágiles dispersos.
export function getNormalized(result: BH360Result, dimId: string): number {
  return result.normalized[dimId as keyof NormalizedScores] ?? 0
}

export function getContribution(result: BH360Result, dimId: string): number {
  return result.contributions[dimId] ?? 0
}
