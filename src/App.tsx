import { useState, useEffect, useRef, useMemo } from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  DollarSign,
  Eye,
  ShoppingCart,
  MessageCircle,
  Target,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  SlidersHorizontal,
  ClipboardList,
  RotateCcw,
  Layers,
  Lightbulb,
  Trash2,
  Pencil,
  Download,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  DIMENSIONS,
  PILLAR_COLORS,
  PILLAR_LABELS,
  LEVEL_COLORS,
  LEVEL_LABELS,
  SAMPLE_DATA,
  MEDIA_CHANNELS,
  calculateBH360,
  formatDimensionValue,
  formatCurrency,
  getDimensionValue,
  getMediaMix,
  sumMediaMix,
  emptyMediaMix,
  normalizeDimension,
  getNormalized,
  type PeriodData,
  type MediaMix,
} from "@/lib/bh360"
import { loadPeriods, savePeriods, clearPeriods, hasStoredPeriods } from "@/lib/storage"
import { exportToExcel } from "@/lib/export"

import resetLogo from "@/assets/reset-blanco.png"
import wantedLogo from "@/assets/wanted-blanco.png"

// ─── Utility Components ───────────────────────────────────────

const ANIMATION_DURATION_MS = 1200
const RING_ANIMATION_DELAY_MS = 100

// Respeta la preferencia del sistema de movimiento reducido (WCAG 2.1).
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return reduced
}

function AnimatedScore({
  value,
  duration = ANIMATION_DURATION_MS,
}: {
  value: number
  duration?: number
}) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    // Sin animación si el usuario pide movimiento reducido.
    if (reducedMotion) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    // Closure intencional: animamos desde el `display` previo hacia el `value` nuevo.
    const from = display
    const to = value

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round((from + (to - from) * eased) * 10) / 10)
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick)
      }
    }

    ref.current = requestAnimationFrame(tick)
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reducedMotion])

  return <span>{display.toFixed(1)}</span>
}

function DimIcon({ id, className }: { id: string; className?: string }) {
  const props = { className: className ?? "h-5 w-5", strokeWidth: 1.5 }
  switch (id) {
    case "investment":
      return <DollarSign {...props} />
    case "reach":
      return <Eye {...props} />
    case "purchase":
      return <ShoppingCart {...props} />
    case "sentiment":
      return <MessageCircle {...props} />
    case "sales":
      return <Target {...props} />
    default:
      return <BarChart3 {...props} />
  }
}

function PillarBadge({ pillar }: { pillar: string }) {
  return (
    <Badge
      variant="outline"
      className="text-xs border-opacity-50"
      style={{ borderColor: PILLAR_COLORS[pillar], color: PILLAR_COLORS[pillar] }}
    >
      {PILLAR_LABELS[pillar]}
    </Badge>
  )
}

function ScoreRing({
  score,
  size = 180,
  strokeWidth = 12,
  color,
}: {
  score: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const target = circumference - (score / 100) * circumference
    if (reducedMotion) {
      setOffset(target)
      return
    }
    const timer = setTimeout(() => setOffset(target), RING_ANIMATION_DELAY_MS)
    return () => clearTimeout(timer)
  }, [score, circumference, reducedMotion])

  const fillColor = color ?? LEVEL_COLORS[getLevel(score)]

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={reducedMotion ? "" : "transition-all duration-1000 ease-out"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>
          <AnimatedScore value={score} />
        </span>
        <span className="text-xs text-zinc-500 mt-1">/ 100</span>
      </div>
    </div>
  )
}

function Delta({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  const diff = Math.round((current - previous) * 10) / 10
  if (diff === 0) return <span className="text-zinc-500 text-sm flex items-center gap-1"><Minus className="h-3 w-3" /> 0</span>
  const isPositive = diff > 0
  return (
    <span className={`text-sm flex items-center gap-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}
      {diff}
    </span>
  )
}

function Spark({ data, dimId }: { data: PeriodData[]; dimId: string }) {
  const points = data.map((d) => ({
    v: normalizeDimension(dimId, getDimensionValue(d, dimId)),
  }))
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#f59e0b"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function InfoModal({ dim }: { dim: typeof DIMENSIONS[number] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-1 rounded hover:bg-zinc-800 focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-colors">
          <Info className="h-4 w-4 text-zinc-500" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <DimIcon id={dim.id} />
            {dim.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-zinc-500">Definición</span>
            <p className="text-zinc-300 mt-1">{dim.description}</p>
          </div>
          <Separator className="bg-zinc-700" />
          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500">Pilar</span>
              <div className="mt-1"><PillarBadge pillar={dim.pillar} /></div>
            </div>
            <div>
              <span className="text-zinc-500">Fuente</span>
              <p className="text-zinc-300 mt-1">{dim.source}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getLevel(score: number): string {
  if (score <= 30) return "critical"
  if (score <= 50) return "weak"
  if (score <= 70) return "moderate"
  if (score <= 85) return "strong"
  return "exceptional"
}

// Barra horizontal apilada con la participación de cada medio en la inversión.
function MediaShareBar({ mix, height = 28 }: { mix: MediaMix; height?: number }) {
  const total = sumMediaMix(mix) || 1
  const row: Record<string, number | string> = { name: "mix" }
  MEDIA_CHANNELS.forEach((c) => {
    row[c.id] = mix[c.id]
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={[row]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide domain={[0, total]} />
        <YAxis type="category" dataKey="name" hide />
        {MEDIA_CHANNELS.map((c, i) => (
          <Bar
            key={c.id}
            dataKey={c.id}
            stackId="mix"
            fill={c.color}
            radius={
              i === 0
                ? [4, 0, 0, 4]
                : i === MEDIA_CHANNELS.length - 1
                ? [0, 4, 4, 0]
                : 0
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Report View ──────────────────────────────────────────────

function ReportView({
  data,
  selectedIndex,
}: {
  data: PeriodData[]
  selectedIndex: number
}) {
  const current = data[selectedIndex]
  const [compareIndex, setCompareIndex] = useState<number | null>(
    selectedIndex > 0 ? selectedIndex - 1 : null
  )

  // Reiniciar la comparación al cambiar el período principal.
  useEffect(() => {
    setCompareIndex(selectedIndex > 0 ? selectedIndex - 1 : null)
  }, [selectedIndex])

  const cmp =
    compareIndex !== null && compareIndex < data.length && compareIndex !== selectedIndex
      ? compareIndex
      : null
  const previous = cmp !== null ? data[cmp] : undefined
  const result = useMemo(() => calculateBH360(current), [current])
  const prevResult = useMemo(
    () => (previous ? calculateBH360(previous) : undefined),
    [previous]
  )

  const radarData = DIMENSIONS.map((dim) => ({
    dimension: dim.label.split(" ")[0],
    current: getNormalized(result, dim.id),
    previous: prevResult
      ? getNormalized(prevResult, dim.id)
      : undefined,
  }))

  const barData = DIMENSIONS.map((dim) => ({
    name: dim.label.split(" ")[0],
    value: Math.round(getNormalized(result, dim.id)),
    fill: PILLAR_COLORS[dim.pillar],
  }))

  // Diagnóstico automático
  const sorted = DIMENSIONS.map((dim) => ({
    ...dim,
    score: getNormalized(result, dim.id),
  })).sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  return (
    <div className="space-y-6">
      {/* Toolbar: comparación + export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Comparar con:</span>
          <Select
            value={cmp === null ? "none" : String(cmp)}
            onValueChange={(v) => setCompareIndex(v === "none" ? null : Number(v))}
          >
            <SelectTrigger className="w-[160px] h-8 bg-zinc-900 border-zinc-700 text-xs">
              <SelectValue placeholder="Ninguno" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="none" className="text-xs">
                Ninguno
              </SelectItem>
              {data
                .map((d, i) => ({ d, i }))
                .filter((x) => x.i !== selectedIndex)
                .map((x) => (
                  <SelectItem key={x.i} value={String(x.i)} className="text-xs">
                    {x.d.period}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToExcel(data)}
          className="border-zinc-700 text-xs"
        >
          <Download className="h-3 w-3 mr-1.5" /> Exportar Excel
        </Button>
      </div>

      {/* Hero Card */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ScoreRing score={result.score} />
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>
                  {current.brand}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {current.period} — {current.campaign}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: LEVEL_COLORS[result.level] + "20",
                    color: LEVEL_COLORS[result.level],
                    borderColor: LEVEL_COLORS[result.level],
                  }}
                  variant="outline"
                >
                  {LEVEL_LABELS[result.level]}
                </Badge>
                <Delta current={result.score} previous={prevResult?.score} />
                {previous && (
                  <span className="text-[10px] text-zinc-600">vs {previous.period}</span>
                )}
              </div>
              <div className="space-y-2 mt-4">
                {Object.entries(PILLAR_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-24">{label}</span>
                    <div className="flex-1">
                      <Progress
                        value={result.pillarScores[key]}
                        className="h-2 bg-zinc-800"
                        style={
                          {
                            "--progress-color": PILLAR_COLORS[key],
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                      {result.pillarScores[key].toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar + Dimension Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900/60 border-zinc-800 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Perfil Dimensional</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width={280} height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 9 }}
                />
                {prevResult && (
                  <Radar
                    name="Anterior"
                    dataKey="previous"
                    stroke="#71717a"
                    fill="transparent"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                )}
                <Radar
                  name="Actual"
                  dataKey="current"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIMENSIONS.map((dim) => {
            const normScore = getNormalized(result, dim.id)
            const rawValue = getDimensionValue(current, dim.id)
            const prevNorm = prevResult
              ? getNormalized(prevResult, dim.id)
              : undefined

            return (
              <Card key={dim.id} className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: PILLAR_COLORS[dim.pillar] + "20" }}
                      >
                        <DimIcon
                          id={dim.id}
                          className="h-4 w-4"
                        />
                      </div>
                      <span className="text-xs text-zinc-400">{dim.label}</span>
                    </div>
                    <InfoModal dim={dim} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-bold text-zinc-100 font-mono">
                        {normScore.toFixed(0)}
                      </span>
                      <span className="text-xs text-zinc-500 ml-1">/100</span>
                    </div>
                    <Spark data={data} dimId={dim.id} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      {formatDimensionValue(dim.id, rawValue)}
                    </span>
                    <Delta current={normScore} previous={prevNorm} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <PillarBadge pillar={dim.pillar} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Waterfall Chart */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Score por Dimensión</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barCategoryGap="20%">
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#f4f4f5" }}
                formatter={(v) => [`${Number(v).toFixed(0)} / 100`, "Score"]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mix de Medios */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
            <Layers className="h-4 w-4" /> Mix de Medios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const media = getMediaMix(current)
            const total = sumMediaMix(media) || 1
            return (
              <>
                <MediaShareBar mix={media} height={32} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {MEDIA_CHANNELS.map((c) => {
                    const v = media[c.id]
                    const share = (v / total) * 100
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-300 truncate">{c.label}</p>
                          <p className="text-xs font-mono text-zinc-500">
                            {formatCurrency(v)} · {share.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* Diagnostico */}
      <Card
        className="bg-zinc-900/60 border-l-4"
        style={{ borderLeftColor: LEVEL_COLORS[result.level], borderTopColor: "#27272a", borderRightColor: "#27272a", borderBottomColor: "#27272a" }}
      >
        <CardContent className="p-6 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-100">Diagnóstico</h3>
          <p className="text-sm text-zinc-300">{result.interpretation}</p>
          <p className="text-sm text-zinc-400">
            La dimensión más fuerte es <strong className="text-zinc-200">{strongest.label}</strong> ({strongest.score.toFixed(0)}/100).
            La dimensión más débil es <strong className="text-zinc-200">{weakest.label}</strong> ({weakest.score.toFixed(0)}/100).
          </p>
          {weakest.score < 40 && (
            <p className="text-sm text-amber-400">
              Se recomienda una intervención focalizada en {weakest.label} para mejorar el índice general.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Data Entry View ──────────────────────────────────────────

const ENTRY_STEPS = [
  { id: "campaign", label: "Campaña", dimId: null },
  ...DIMENSIONS.map((d) => ({ id: d.id, label: d.label, dimId: d.id })),
]

const DEFAULT_FORM: Partial<PeriodData> = {
  brand: "San Fernando",
  period: "",
  campaign: "",
  investment: 0,
  reach: 0,
  purchase: 0,
  sentiment: 0,
  sales: 0,
}

function DataEntryView({
  data,
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
  onRestoreSample,
  onClearAll,
}: {
  data: PeriodData[]
  onAddPeriod: (p: PeriodData) => void
  onUpdatePeriod: (index: number, p: PeriodData) => void
  onDeletePeriod: (index: number) => void
  onRestoreSample: () => void
  onClearAll: () => void
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Partial<PeriodData>>(() => ({
    ...DEFAULT_FORM,
    mediaMix: emptyMediaMix(),
  }))
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const updateMedia = (id: keyof MediaMix, value: number) =>
    setForm((prev) => ({
      ...prev,
      mediaMix: { ...(prev.mediaMix ?? emptyMediaMix()), [id]: Math.max(0, value) },
    }))

  // La inversión total se deriva de la suma del desglose por medio.
  const mediaMix = form.mediaMix ?? emptyMediaMix()
  const investmentTotal = sumMediaMix(mediaMix)
  const investmentDim = DIMENSIONS.find((d) => d.id === "investment")!

  // Validación de los datos del formulario.
  const errors: string[] = []
  if (!(form.period ?? "").trim()) errors.push("El período es obligatorio.")
  if (!(form.campaign ?? "").trim()) errors.push("La campaña es obligatoria.")
  if (investmentTotal <= 0) errors.push("La inversión total debe ser mayor a 0.")
  if (investmentTotal > investmentDim.ceiling)
    errors.push(
      `La inversión no puede superar ${formatCurrency(investmentDim.ceiling)} por campaña.`
    )
  for (const d of DIMENSIONS) {
    if (d.id === "investment") continue
    const v = Number(form[d.id as keyof PeriodData] ?? 0)
    if (v < d.floor || v > d.ceiling)
      errors.push(
        `${d.label} debe estar entre ${formatDimensionValue(d.id, d.floor)} y ${formatDimensionValue(d.id, d.ceiling)}.`
      )
  }
  const isValid = errors.length === 0

  const canNext = step === 0
    ? (form.period?.length ?? 0) > 0 && (form.campaign?.length ?? 0) > 0
    : true

  const preview = useMemo(
    () =>
      calculateBH360({
        period: form.period ?? "",
        brand: form.brand ?? "",
        campaign: form.campaign ?? "",
        investment: investmentTotal,
        reach: form.reach ?? 0,
        purchase: form.purchase ?? 0,
        sentiment: form.sentiment ?? 0,
        sales: form.sales ?? 0,
        mediaMix,
      }),
    [
      form.period,
      form.brand,
      form.campaign,
      form.reach,
      form.purchase,
      form.sentiment,
      form.sales,
      mediaMix,
      investmentTotal,
    ]
  )

  // Resultados por período memoizados para la tabla histórica.
  const periodResults = useMemo(() => data.map((p) => calculateBH360(p)), [data])

  const resetForm = () => {
    setStep(0)
    setEditingIndex(null)
    setForm({ ...DEFAULT_FORM, mediaMix: emptyMediaMix() })
  }

  const handleSave = () => {
    if (!isValid) return
    const period: PeriodData = {
      period: (form.period ?? "").trim(),
      brand: (form.brand ?? "").trim() || "Marca",
      campaign: (form.campaign ?? "").trim(),
      investment: investmentTotal,
      reach: Number(form.reach ?? 0),
      purchase: Number(form.purchase ?? 0),
      sentiment: Number(form.sentiment ?? 0),
      sales: Number(form.sales ?? 0),
      mediaMix,
    }
    if (editingIndex !== null) onUpdatePeriod(editingIndex, period)
    else onAddPeriod(period)
    resetForm()
  }

  const startEdit = (index: number) => {
    const p = data[index]
    setForm({ ...p, mediaMix: getMediaMix(p) })
    setEditingIndex(index)
    setStep(0)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Stepper */}
        <nav role="navigation" aria-label="Pasos de ingreso" className="flex items-center gap-1 overflow-x-auto pb-2">
          {ENTRY_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                i === step
                  ? "bg-amber-500/20 text-amber-400 font-medium"
                  : i < step
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-zinc-900 text-zinc-500"
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border border-current">
                {i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Step Content */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-6 space-y-4">
            {editingIndex !== null && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                <Pencil className="h-3 w-3" /> Editando: {data[editingIndex]?.period}
              </div>
            )}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Input
                    id="period"
                    placeholder="Ej: Q3 2026"
                    value={form.period ?? ""}
                    onChange={(e) => update("period", e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={form.brand ?? ""}
                    onChange={(e) => update("brand", e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaña</Label>
                  <Input
                    id="campaign"
                    placeholder="Ej: Navidad + Pavo"
                    value={form.campaign ?? ""}
                    onChange={(e) => update("campaign", e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </>
            )}
            {step > 0 && (() => {
              const dim = DIMENSIONS[step - 1]
              const fieldId = dim.id
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DimIcon id={dim.id} className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-lg font-semibold text-zinc-100">{dim.label}</h3>
                    </div>
                    <InfoModal dim={dim} />
                  </div>
                  {dim.id === "investment" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-500">
                        Ingresá la inversión por medio. Su suma define la inversión total
                        de la campaña.
                      </p>
                      {MEDIA_CHANNELS.map((c) => (
                        <div key={c.id} className="space-y-1">
                          <Label
                            htmlFor={`media-${c.id}`}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: c.color }}
                              aria-hidden="true"
                            />
                            {c.label} (S/)
                          </Label>
                          <Input
                            id={`media-${c.id}`}
                            type="number"
                            min={0}
                            placeholder="0"
                            value={mediaMix[c.id] || ""}
                            onChange={(e) => updateMedia(c.id, Number(e.target.value))}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                      ))}
                      <Separator className="bg-zinc-800" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Inversión total</span>
                        <span className="font-mono font-bold text-zinc-100">
                          {formatCurrency(investmentTotal)}
                        </span>
                      </div>
                      {investmentTotal > dim.ceiling && (
                        <p className="text-[11px] text-amber-400">
                          Supera el techo de {formatCurrency(dim.ceiling)} por campaña; la
                          dimensión se mantiene en 100/100.
                        </p>
                      )}
                      <MediaShareBar mix={mediaMix} />
                      <p className="text-xs text-zinc-500">Fuente: {dim.source}</p>
                    </div>
                  ) : (() => {
                    const dimVal = Number(form[fieldId as keyof PeriodData] ?? 0)
                    const outOfRange = dimVal < dim.floor || dimVal > dim.ceiling
                    return (
                      <div className="space-y-2">
                        <Label htmlFor={fieldId}>Valor ({dim.unit})</Label>
                        <Input
                          id={fieldId}
                          type="number"
                          min={dim.floor}
                          max={dim.ceiling}
                          placeholder={`Rango: ${dim.floor} - ${dim.ceiling}`}
                          value={(form[fieldId as keyof PeriodData] as number | undefined) ?? 0}
                          onChange={(e) => update(fieldId, Number(e.target.value))}
                          className={`bg-zinc-800 ${outOfRange ? "border-red-500" : "border-zinc-700"}`}
                        />
                        {outOfRange && (
                          <p className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" /> Debe estar entre{" "}
                            {formatDimensionValue(dim.id, dim.floor)} y{" "}
                            {formatDimensionValue(dim.id, dim.ceiling)}.
                          </p>
                        )}
                        <p className="text-xs text-zinc-500">Fuente: {dim.source}</p>
                      </div>
                    )
                  })()}
                </div>
              )
            })()}

            {step === ENTRY_STEPS.length - 1 && !isValid && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="border-zinc-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <div className="flex items-center gap-2">
                {editingIndex !== null && (
                  <Button variant="ghost" size="sm" onClick={resetForm} className="text-zinc-400">
                    Cancelar
                  </Button>
                )}
                {step < ENTRY_STEPS.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setStep(step + 1)}
                    disabled={!canNext}
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-900"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!isValid}
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-900 disabled:opacity-50"
                  >
                    {editingIndex !== null ? "Guardar cambios" : "Guardar Período"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historical Table */}
        {data.length > 0 && (
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm text-zinc-400">Histórico de Períodos</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportToExcel(data)}
                    className="text-zinc-400 hover:text-emerald-400 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" /> Excel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRestoreSample}
                    className="text-zinc-400 hover:text-zinc-200 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Datos de ejemplo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearConfirm(true)}
                    className="text-zinc-400 hover:text-red-400 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Limpiar todo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table role="table" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 px-2 text-zinc-500 font-medium">Período</th>
                      <th className="text-left py-2 px-2 text-zinc-500 font-medium">Campaña</th>
                      {DIMENSIONS.map((d) => (
                        <th key={d.id} className="text-right py-2 px-2 text-zinc-500 font-medium">
                          {d.label.split(" ")[0]}
                        </th>
                      ))}
                      <th className="text-right py-2 px-2 text-zinc-500 font-medium">BH360</th>
                      <th className="text-right py-2 px-2 text-zinc-500 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => {
                      const r = periodResults[i]
                      return (
                        <tr
                          key={i}
                          className={`border-b border-zinc-800/50 ${editingIndex === i ? "bg-amber-500/5" : ""}`}
                        >
                          <td className="py-2 px-2 text-zinc-300">{row.period}</td>
                          <td className="py-2 px-2 text-zinc-400 text-xs">{row.campaign}</td>
                          {DIMENSIONS.map((d) => (
                            <td key={d.id} className="text-right py-2 px-2 text-zinc-300 font-mono text-xs">
                              {formatDimensionValue(d.id, getDimensionValue(row, d.id))}
                            </td>
                          ))}
                          <td className="text-right py-2 px-2 font-bold font-mono" style={{ color: LEVEL_COLORS[r.level] }}>
                            {r.score.toFixed(1)}
                          </td>
                          <td className="text-right py-2 px-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(i)}
                                aria-label={`Editar ${row.period}`}
                                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 focus:ring-2 focus:ring-amber-400/50 focus:outline-none transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteIndex(i)}
                                aria-label={`Eliminar ${row.period}`}
                                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 focus:ring-2 focus:ring-red-400/50 focus:outline-none transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <Card className="bg-zinc-900/60 border-zinc-800 sticky top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Vista Previa en Vivo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreRing score={preview.score} size={140} strokeWidth={10} />
            <Badge
              variant="outline"
              style={{
                borderColor: LEVEL_COLORS[preview.level],
                color: LEVEL_COLORS[preview.level],
              }}
            >
              {LEVEL_LABELS[preview.level]}
            </Badge>
            <div className="w-full space-y-2 mt-2">
              {DIMENSIONS.map((dim) => {
                const normVal = getNormalized(preview, dim.id)
                return (
                  <div key={dim.id} className="flex items-center gap-2 text-xs">
                    <DimIcon id={dim.id} className="h-3 w-3 text-zinc-500" />
                    <span className="text-zinc-500 flex-1">{dim.label.split(" ")[0]}</span>
                    <span className="font-mono text-zinc-300">{normVal.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo: eliminar período */}
      <Dialog open={deleteIndex !== null} onOpenChange={(o) => !o && setDeleteIndex(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Eliminar período</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            ¿Seguro que querés eliminar{" "}
            <strong className="text-zinc-200">
              {deleteIndex !== null ? data[deleteIndex]?.period : ""}
            </strong>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteIndex(null)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (deleteIndex !== null) {
                  if (editingIndex === deleteIndex) resetForm()
                  onDeletePeriod(deleteIndex)
                }
                setDeleteIndex(null)
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: limpiar todo */}
      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Limpiar todos los datos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Se eliminarán todos los períodos cargados. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setClearConfirm(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm()
                onClearAll()
                setClearConfirm(false)
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Limpiar todo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Simulator View ───────────────────────────────────────────

type SimDraft = {
  reach: number
  purchase: number
  sentiment: number
  sales: number
  media: MediaMix
}

const SLIDER_STEP: Record<string, number> = {
  investment: 5_000,
  reach: 1,
  purchase: 1,
  sentiment: 1,
  sales: 100_000,
}

const INVESTMENT_CEILING =
  DIMENSIONS.find((d) => d.id === "investment")?.ceiling ?? 500_000

function makeDraft(p: PeriodData): SimDraft {
  return {
    reach: p.reach,
    purchase: p.purchase,
    sentiment: p.sentiment,
    sales: p.sales,
    media: { ...getMediaMix(p) },
  }
}

function scaleMix(mix: MediaMix, factor: number): MediaMix {
  const next = emptyMediaMix()
  MEDIA_CHANNELS.forEach((c) => {
    next[c.id] = Math.round(mix[c.id] * factor)
  })
  return next
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

function SimView({
  data,
  selectedIndex,
}: {
  data: PeriodData[]
  selectedIndex: number
}) {
  const current = data[selectedIndex]
  const actualResult = useMemo(() => calculateBH360(current), [current])

  const [sim, setSim] = useState<SimDraft>(() => makeDraft(current))

  // Reiniciar el escenario cuando cambia el período seleccionado.
  useEffect(() => {
    setSim(makeDraft(current))
  }, [current])

  const simInvestment = sumMediaMix(sim.media)
  const simResult = useMemo(
    () =>
      calculateBH360({
        ...current,
        investment: simInvestment,
        reach: sim.reach,
        purchase: sim.purchase,
        sentiment: sim.sentiment,
        sales: sim.sales,
        mediaMix: sim.media,
      }),
    [current, sim, simInvestment]
  )
  const scoreDelta = Math.round((simResult.score - actualResult.score) * 10) / 10

  const simRealValue = (dimId: string): number =>
    dimId === "investment"
      ? simInvestment
      : (sim[dimId as keyof Omit<SimDraft, "media">] as number)

  const setDim = (dimId: string, value: number) =>
    setSim((prev) => ({ ...prev, [dimId]: value }))

  const setMedia = (id: keyof MediaMix, value: number) =>
    setSim((prev) => ({
      ...prev,
      media: { ...prev.media, [id]: Math.max(0, Math.round(value)) },
    }))

  const resetSim = () => setSim(makeDraft(current))

  // Escenario optimista/pesimista: mueve cada dimensión hacia su techo/piso.
  const buildScenario = (towardCeiling: boolean): SimDraft => {
    const factor = 0.3
    const adjust = (dimId: string): number => {
      const dim = DIMENSIONS.find((d) => d.id === dimId)!
      const v = getDimensionValue(current, dimId)
      return Math.round(
        towardCeiling
          ? v + (dim.ceiling - v) * factor
          : v - (v - dim.floor) * factor
      )
    }
    return {
      reach: adjust("reach"),
      purchase: adjust("purchase"),
      sentiment: adjust("sentiment"),
      sales: adjust("sales"),
      media: scaleMix(getMediaMix(current), towardCeiling ? 1.3 : 0.7),
    }
  }

  const presets = [
    {
      label: "+50% Inversión",
      apply: () => setSim((p) => ({ ...p, media: scaleMix(p.media, 1.5) })),
    },
    {
      label: "Sentiment −20",
      apply: () =>
        setSim((p) => ({ ...p, sentiment: clamp(p.sentiment - 20, -100, 100) })),
    },
    { label: "Optimista", apply: () => setSim(buildScenario(true)) },
    { label: "Pesimista", apply: () => setSim(buildScenario(false)) },
  ]

  const simRadarData = DIMENSIONS.map((dim) => ({
    dimension: dim.label.split(" ")[0],
    actual: getNormalized(actualResult, dim.id),
    simulado: getNormalized(simResult, dim.id),
  }))

  const contribData = DIMENSIONS.map((dim) => ({
    name: dim.label.split(" ")[0],
    simulado: Math.round(simResult.contributions[dim.id] * 10) / 10,
    fill: PILLAR_COLORS[dim.pillar],
  }))

  // Palanca de mayor impacto: dimensión con mayor cambio en su aporte.
  const topLever = DIMENSIONS.map((dim) => ({
    dim,
    delta: simResult.contributions[dim.id] - actualResult.contributions[dim.id],
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]

  const levelChanged = simResult.level !== actualResult.level

  return (
    <div className="space-y-6">
      {/* Banner explicativo */}
      <Card className="bg-zinc-900/60 border-zinc-800 border-l-4 border-l-amber-400/60">
        <CardContent className="p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-zinc-400 leading-relaxed">
            El BH360 va de <strong className="text-zinc-200">0 a 100</strong>. Cada
            dimensión se ingresa en su <strong className="text-zinc-200">unidad real</strong>{" "}
            (S/, %, NSS), se convierte a una escala 0-100 según su rango meta
            (el techo equivale a 100) y aporta al índice según su{" "}
            <strong className="text-zinc-200">peso</strong>. Mové los controles para
            simular escenarios.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controles */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-zinc-400">Ajustar Dimensiones</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetSim} className="text-zinc-500 hover:text-zinc-300">
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {DIMENSIONS.map((dim) => {
                const realValue = simRealValue(dim.id)
                const norm = getNormalized(simResult, dim.id)
                const contrib = simResult.contributions[dim.id]
                const isInvestment = dim.id === "investment"
                return (
                  <div key={dim.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DimIcon id={dim.id} className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-300">{dim.label.split(" ")[0]}</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-100">
                        {formatDimensionValue(dim.id, realValue)}
                      </span>
                    </div>
                    {isInvestment ? (
                      <p className="text-[11px] text-zinc-500 italic">
                        Se ajusta en &quot;Inversión por Medio&quot; ↓
                      </p>
                    ) : (
                      <Slider
                        value={[realValue]}
                        min={dim.floor}
                        max={dim.ceiling}
                        step={SLIDER_STEP[dim.id]}
                        aria-label={`${dim.label} en ${dim.unit}`}
                        onValueChange={([v]) => setDim(dim.id, v)}
                        className="[&_[role=slider]]:bg-amber-400"
                      />
                    )}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        Normalizado:{" "}
                        <span className="font-mono text-zinc-400">{norm.toFixed(0)}/100</span>
                      </span>
                      <span>
                        Peso {(dim.weight * 100).toFixed(0)}% ·{" "}
                        <span className="text-amber-400/80">+{contrib.toFixed(1)} pts</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      Rango meta: {formatDimensionValue(dim.id, dim.floor)} →{" "}
                      {formatDimensionValue(dim.id, dim.ceiling)} (100 ={" "}
                      {formatDimensionValue(dim.id, dim.ceiling)})
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Inversión por medio */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                <Layers className="h-4 w-4" /> Inversión por Medio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEDIA_CHANNELS.map((c) => {
                const v = sim.media[c.id]
                const share = simInvestment > 0 ? (v / simInvestment) * 100 : 0
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.color }}
                          aria-hidden="true"
                        />
                        <span className="text-zinc-300">{c.label}</span>
                      </div>
                      <span className="font-mono text-zinc-200">
                        {formatCurrency(v)}{" "}
                        <span className="text-zinc-500">({share.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <Slider
                      value={[v]}
                      min={0}
                      max={INVESTMENT_CEILING}
                      step={5_000}
                      aria-label={`Inversión en ${c.label}`}
                      onValueChange={([val]) => setMedia(c.id, val)}
                      className="[&_[role=slider]]:bg-amber-400"
                    />
                  </div>
                )
              })}
              <Separator className="bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Inversión total</span>
                <span className="font-mono font-bold text-zinc-100">
                  {formatCurrency(simInvestment)}
                </span>
              </div>
              {simInvestment > INVESTMENT_CEILING && (
                <p className="text-[10px] text-amber-400">
                  La inversión supera el techo de {formatCurrency(INVESTMENT_CEILING)}; la
                  dimensión se mantiene en 100/100.
                </p>
              )}
              <MediaShareBar mix={sim.media} />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={p.apply}
                className="text-xs border-zinc-700"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-zinc-500 mb-2">Actual</p>
                  <ScoreRing score={actualResult.score} size={120} strokeWidth={8} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 mb-2">Simulado</p>
                  <ScoreRing
                    score={simResult.score}
                    size={120}
                    strokeWidth={8}
                    color={LEVEL_COLORS[simResult.level]}
                  />
                </div>
              </div>
              <Delta current={simResult.score} previous={actualResult.score} />
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Lectura del Escenario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-300">
              <p>
                El BH360 simulado es{" "}
                <strong style={{ color: LEVEL_COLORS[simResult.level] }}>
                  {simResult.score.toFixed(1)}
                </strong>{" "}
                ({LEVEL_LABELS[simResult.level]}),{" "}
                {scoreDelta === 0
                  ? "sin cambio respecto al"
                  : scoreDelta > 0
                  ? `+${scoreDelta} pts sobre el`
                  : `${scoreDelta} pts bajo el`}{" "}
                actual de {actualResult.score.toFixed(1)}.
              </p>
              {levelChanged && (
                <p className="text-zinc-400">
                  El nivel de salud {scoreDelta > 0 ? "sube" : "baja"} de{" "}
                  {LEVEL_LABELS[actualResult.level]} a {LEVEL_LABELS[simResult.level]}.
                </p>
              )}
              {Math.abs(topLever.delta) > 0.05 && (
                <p className="text-zinc-400">
                  La palanca de mayor impacto es{" "}
                  <strong className="text-zinc-200">{topLever.dim.label}</strong> (
                  {topLever.delta > 0 ? "+" : ""}
                  {topLever.delta.toFixed(1)} pts).
                </p>
              )}
            </CardContent>
          </Card>

          {/* Aporte por dimensión */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">
                Aporte al BH360 por Dimensión (simulado)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={contribData} layout="vertical" margin={{ left: 10, right: 24 }}>
                  <XAxis
                    type="number"
                    domain={[0, 25]}
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: 8 }}
                    labelStyle={{ color: "#a1a1aa" }}
                    itemStyle={{ color: "#f4f4f5" }}
                    formatter={(v) => [`${Number(v).toFixed(1)} pts`, "Aporte"]}
                  />
                  <Bar dataKey="simulado" radius={[0, 4, 4, 0]}>
                    {contribData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Actual vs Simulado</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width={320} height={280}>
                <RadarChart data={simRadarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 9 }} />
                  <Radar
                    name="Actual"
                    dataKey="actual"
                    stroke="#71717a"
                    fill="transparent"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Radar
                    name="Simulado"
                    dataKey="simulado"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Methodology View ─────────────────────────────────────────

function MethodView() {
  const sections = [
    { id: "what", label: "¿Qué es el BH360?" },
    { id: "problem", label: "¿Qué problema resuelve?" },
    { id: "framework", label: "Los 3 Pilares" },
    { id: "dims", label: "Las 5 Dimensiones" },
    { id: "how", label: "¿Cómo funciona?" },
    { id: "levels", label: "Niveles de Salud" },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <nav aria-label="Secciones de metodología" className="hidden lg:block">
        <div className="sticky top-20 space-y-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="lg:col-span-3 space-y-8">
        <section id="what" className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>¿Qué es el BH360?</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            El BH360 (Business Health 360) es un índice compuesto propietario de Reset / The Lab
            que integra cinco dimensiones clave de salud de negocio en un único número accionable
            de 0 a 100.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Permite a directores de marketing evaluar de un vistazo si el negocio está
            mejorando o empeorando, identificar qué dimensiones requieren atención, y simular
            escenarios para optimizar resultados.
          </p>
        </section>

        <Separator className="bg-zinc-800" />

        <section id="problem" className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>¿Qué problema resuelve?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-zinc-900/60 border-zinc-800 border-l-4 border-l-red-500/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-2">Sin BH360</h4>
                <ul className="text-xs text-zinc-400 space-y-1.5">
                  <li>Reportes fragmentados de múltiples proveedores</li>
                  <li>Cada proveedor mide lo suyo, nadie conecta las piezas</li>
                  <li>No hay un número único para evaluar la salud del negocio</li>
                  <li>Decisiones basadas en métricas aisladas</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/60 border-zinc-800 border-l-4 border-l-emerald-500/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-emerald-400 mb-2">Con BH360</h4>
                <ul className="text-xs text-zinc-400 space-y-1.5">
                  <li>Una sola vista integrada de salud de negocio</li>
                  <li>Cinco dimensiones conectadas en un índice de 0 a 100</li>
                  <li>Diagnóstico automático con fortalezas y debilidades</li>
                  <li>Simulador para evaluar escenarios antes de invertir</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-zinc-800" />

        <section id="framework" className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>Los 3 Pilares</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            El BH360 organiza sus dimensiones en tres pilares alineados con estándares
            internacionales de evaluación de marca:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              { name: "Input", desc: "Los recursos que el negocio dedica a construir presencia en el mercado.", color: PILLAR_COLORS.input },
              { name: "Equity", desc: "La percepción y disposición del consumidor hacia la marca.", color: PILLAR_COLORS.equity },
              { name: "Performance", desc: "El resultado final de negocio medido en ventas.", color: PILLAR_COLORS.performance },
            ].map((p) => (
              <Card key={p.name} className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-semibold text-zinc-100">{p.name}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="bg-zinc-800" />

        <section id="dims" className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>Las 5 Dimensiones</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Cada dimensión captura un aspecto fundamental de la salud del negocio,
            desde la inversión hasta el resultado en ventas.
          </p>
          <div className="space-y-4">
            {DIMENSIONS.map((dim) => (
              <Card key={dim.id} className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded mt-0.5"
                      style={{ backgroundColor: PILLAR_COLORS[dim.pillar] + "20" }}
                    >
                      <DimIcon id={dim.id} className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-zinc-100">{dim.label}</h3>
                        <PillarBadge pillar={dim.pillar} />
                      </div>
                      <p className="text-xs text-zinc-400 mb-2">{dim.description}</p>
                      <span className="text-xs text-zinc-500">Fuente: {dim.source}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="bg-zinc-800" />

        <section id="how" className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>¿Cómo funciona?</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Recopilar", desc: "Se ingresan los valores reales de cada dimensión por período: inversión, alcance, compra declarada, sentiment y ventas." },
              { step: "2", title: "Normalizar", desc: "Cada dimensión se transforma a una escala comparable de 0 a 100, utilizando rangos de referencia calibrados por categoría." },
              { step: "3", title: "Ponderar", desc: "Las dimensiones se combinan según su importancia relativa, respaldada por evidencia académica y estándares internacionales." },
              { step: "4", title: "Diagnosticar", desc: "El sistema genera automáticamente un diagnóstico que identifica fortalezas, debilidades y recomendaciones de acción." },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  {s.step}
                </span>
                <div>
                  <span className="text-sm font-semibold text-zinc-200">{s.title}</span>
                  <p className="text-xs text-zinc-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-zinc-800" />

        <section id="levels" className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "Outfit" }}>Niveles de Salud</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            El puntaje BH360 se traduce en un nivel cualitativo que facilita
            la comunicación ejecutiva y la toma de decisiones.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {Object.entries(LEVEL_LABELS).map(([key, label]) => (
              <Card key={key} className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-3 flex flex-col items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: LEVEL_COLORS[key] }}
                  />
                  <span className="text-sm font-semibold" style={{ color: LEVEL_COLORS[key] }}>
                    {label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────

function EmptyState({
  onGoToEntry,
  onRestoreSample,
}: {
  onGoToEntry: () => void
  onRestoreSample: () => void
}) {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="p-10 flex flex-col items-center text-center gap-4">
        <ClipboardList className="h-10 w-10 text-zinc-600" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">No hay períodos cargados</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Ingresá tu primer período o restaurá los datos de ejemplo para explorar la herramienta.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onGoToEntry} className="bg-amber-500 hover:bg-amber-600 text-zinc-900">
            <ClipboardList className="h-4 w-4 mr-1.5" /> Ingresar datos
          </Button>
          <Button variant="outline" onClick={onRestoreSample} className="border-zinc-700">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Datos de ejemplo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main App ─────────────────────────────────────────────────

const NAV_TABS = [
  { id: "report", label: "Reporte", icon: BarChart3 },
  { id: "entry", label: "Ingreso", icon: ClipboardList },
  { id: "sim", label: "Simulador", icon: SlidersHorizontal },
  // Tab de Metodologia oculta del frontend (componente MethodView se conserva, no se elimina)
  // { id: "meth", label: "Metodología", icon: FileText },
]

export default function App() {
  const [tab, setTab] = useState("report")
  const [data, setData] = useState<PeriodData[]>(loadPeriods)
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, data.length - 1))
  const [usingSample, setUsingSample] = useState(() => !hasStoredPeriods())

  // Persistir en localStorage ante cualquier cambio de datos.
  useEffect(() => {
    savePeriods(data)
  }, [data])

  // Mantener selectedIndex dentro de rango cuando cambia el largo de data.
  useEffect(() => {
    if (selectedIndex > data.length - 1) {
      setSelectedIndex(Math.max(0, data.length - 1))
    }
  }, [data.length, selectedIndex])

  const handleAddPeriod = (period: PeriodData) => {
    setUsingSample(false)
    setData((prev) => {
      const next = [...prev, period]
      setSelectedIndex(next.length - 1)
      return next
    })
  }

  const handleUpdatePeriod = (index: number, period: PeriodData) => {
    setUsingSample(false)
    setData((prev) => prev.map((p, i) => (i === index ? period : p)))
  }

  const handleDeletePeriod = (index: number) => {
    setData((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRestoreSample = () => {
    clearPeriods()
    setData(SAMPLE_DATA)
    setSelectedIndex(SAMPLE_DATA.length - 1)
    setUsingSample(true)
  }

  const handleClearAll = () => {
    setData([])
    setSelectedIndex(0)
    setUsingSample(false)
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-amber-400" style={{ fontFamily: "Outfit" }}>
                BH360
              </h1>
              <span className="text-xs text-zinc-500 hidden sm:inline">Business Health 360</span>
              {usingSample && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500/50 text-amber-400 bg-amber-500/10 ml-2"
                >
                  Data de prueba
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Select
                value={String(selectedIndex)}
                onValueChange={(v) => setSelectedIndex(Number(v))}
              >
                <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {data.map((d, i) => (
                    <SelectItem key={i} value={String(i)} className="text-sm">
                      {d.period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-7xl mx-auto px-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="bg-transparent border-b border-zinc-800 rounded-none h-auto p-0 gap-0 w-full justify-start">
                {NAV_TABS.map((t) => {
                  const Icon = t.icon
                  return (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      aria-current={tab === t.id ? "page" : undefined}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-amber-400 data-[state=active]:bg-transparent px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <Icon className="h-4 w-4 mr-1.5" />
                      {t.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
          {data.length === 0 && tab !== "entry" && tab !== "meth" && (
            <EmptyState onGoToEntry={() => setTab("entry")} onRestoreSample={handleRestoreSample} />
          )}
          {tab === "report" && data.length > 0 && (
            <ReportView data={data} selectedIndex={selectedIndex} />
          )}
          {tab === "entry" && (
            <DataEntryView
              data={data}
              onAddPeriod={handleAddPeriod}
              onUpdatePeriod={handleUpdatePeriod}
              onDeletePeriod={handleDeletePeriod}
              onRestoreSample={handleRestoreSample}
              onClearAll={handleClearAll}
            />
          )}
          {tab === "sim" && data.length > 0 && (
            <SimView data={data} selectedIndex={selectedIndex} />
          )}
          {tab === "meth" && <MethodView />}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-6">
            <div className="flex items-center gap-4">
              <img
                src={resetLogo}
                alt="Reset"
                className="h-8 object-contain opacity-70 hover:opacity-100 transition-opacity"
              />
              <img
                src={wantedLogo}
                alt="Wanted"
                className="h-8 object-contain opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
            <Separator orientation="vertical" className="h-6 bg-zinc-800" />
            <span className="text-xs text-zinc-600">
              BH360 by The Lab / Reset
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
