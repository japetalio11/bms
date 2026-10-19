import React, { useState, useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts"
import {
  Activity,
  HeartPulse,
  Weight,
  Ruler,
  AlertTriangle,
  TrendingUp,
  Info,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface MaternalVitalsTrajectoryChartProps {
  visitationList: any[]
  pregnancy?: any
}

export const MaternalVitalsTrajectoryChart: React.FC<
  MaternalVitalsTrajectoryChartProps
> = ({ visitationList = [], pregnancy }) => {
  const [metricTab, setMetricTab] = useState<"bp" | "weight" | "fundic">("bp")

  const sortedVisits = useMemo(() => {
    return [...visitationList].sort((a, b) => {
      const dateA = new Date(a.visit_date || 0).getTime()
      const dateB = new Date(b.visit_date || 0).getTime()
      if (dateA !== dateB) return dateA - dateB
      return (Number(a.visit_number) || 0) - (Number(b.visit_number) || 0)
    })
  }, [visitationList])

  const chartData = useMemo(() => {
    return sortedVisits.map((v, idx) => {
      const aog = Number(v.age_of_gestation_weeks) || 0
      const sys = v.bp_systolic != null ? Number(v.bp_systolic) : null
      const dia = v.bp_diastolic != null ? Number(v.bp_diastolic) : null
      const wt = v.weight_kg != null ? Number(v.weight_kg) : null
      const fh = v.fundic_height_cm != null ? Number(v.fundic_height_cm) : null
      const fht = v.fetal_heart_tone_bpm != null ? Number(v.fetal_heart_tone_bpm) : null

      return {
        visit_id: v.visit_id || String(idx),
        visitNumber: v.visit_number || idx + 1,
        dateStr: v.visit_date ? formatDate(v.visit_date) : `Visit #${idx + 1}`,
        label: aog > 0 ? `V#${v.visit_number || idx + 1} (${aog}w)` : `V#${v.visit_number || idx + 1}`,
        aog,
        systolic: sys,
        diastolic: dia,
        weight: wt,
        fundicHeight: fh,
        fetalHeartTone: fht,
        expectedFundic: aog >= 20 ? aog : null,
      }
    })
  }, [sortedVisits])

  const bpInsights = useMemo(() => {
    if (chartData.length === 0) return null

    const baseline = chartData.find((d) => d.aog > 0 && d.aog <= 14) || chartData[0]
    const latest = chartData[chartData.length - 1]

    let velocitySpike = false
    let deltaSys = 0
    let deltaDia = 0

    if (baseline && latest && baseline.visit_id !== latest.visit_id) {
      if (latest.systolic != null && baseline.systolic != null) {
        deltaSys = latest.systolic - baseline.systolic
      }
      if (latest.diastolic != null && baseline.diastolic != null) {
        deltaDia = latest.diastolic - baseline.diastolic
      }
      if (deltaSys >= 30 || deltaDia >= 15) {
        velocitySpike = true
      }
    }

    const latestSys = latest.systolic || 0
    const latestDia = latest.diastolic || 0
    const map =
      latestSys > 0 && latestDia > 0
        ? Math.round((2 * latestDia + latestSys) / 3)
        : null

    const isHypertensive = latestSys >= 140 || latestDia >= 90

    return {
      baseline,
      latest,
      deltaSys,
      deltaDia,
      velocitySpike,
      map,
      isHypertensive,
    }
  }, [chartData])

  const weightInsights = useMemo(() => {
    const validWeights = chartData.filter((d) => d.weight != null && d.weight > 0)
    if (validWeights.length < 2) return null

    const first = validWeights[0]
    const latest = validWeights[validWeights.length - 1]
    const totalGain = Math.round((latest.weight! - first.weight!) * 10) / 10

    let rapidGainWarning = false
    const penultimate = validWeights[validWeights.length - 2]
    if (penultimate && latest.aog > 0 && penultimate.aog > 0) {
      const weeksDiff = latest.aog - penultimate.aog
      const wtDiff = latest.weight! - penultimate.weight!
      if (weeksDiff > 0 && wtDiff / weeksDiff > 1.0 && latest.aog >= 28) {
        rapidGainWarning = true
      }
    }

    return {
      firstWeight: first.weight,
      latestWeight: latest.weight,
      totalGain,
      rapidGainWarning,
    }
  }, [chartData])

  const fundicInsights = useMemo(() => {
    const validFundic = chartData.filter(
      (d) => d.fundicHeight != null && d.fundicHeight > 0 && d.aog >= 20
    )
    if (validFundic.length === 0) return null

    const latest = validFundic[validFundic.length - 1]
    const diff = Math.round((latest.fundicHeight! - latest.aog) * 10) / 10
    const isAbnormal = Math.abs(diff) >= 3

    return {
      latestFundic: latest.fundicHeight,
      aog: latest.aog,
      diff,
      isAbnormal,
      lagging: diff <= -3,
      exceeding: diff >= 3,
    }
  }, [chartData])

  if (chartData.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
        <Activity className="h-6 w-6 text-muted-foreground/60 mb-2" />
        <h4 className="text-xs font-semibold text-foreground">
          Longitudinal Trajectory Requires Multiple Visits
        </h4>
        <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">
          Log at least 2 prenatal visits to automatically project hemodynamic blood pressure curves, gestational weight gain rate, and McDonald's fundal growth lines.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              Longitudinal Clinical Trajectories
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Tracking physiological velocity trends across {chartData.length} recorded prenatal visits.
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center overflow-x-auto [scrollbar-width:none] gap-1 rounded-lg border border-border bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setMetricTab("bp")}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              metricTab === "bp"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartPulse className="h-3 w-3" />
            <span>Blood Pressure</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricTab("weight")}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              metricTab === "weight"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Weight className="h-3 w-3" />
            <span>Weight Gain</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricTab("fundic")}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              metricTab === "fundic"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ruler className="h-3 w-3" />
            <span>Fundic Height</span>
          </button>
        </div>
      </div>

      {metricTab === "bp" && bpInsights && (
        <div className="flex flex-col gap-2">
          {bpInsights.velocitySpike && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                Acute Hemodynamic Surge: Systolic jumped +{bpInsights.deltaSys} mmHg / Diastolic jumped +{bpInsights.deltaDia} mmHg above Trimester 1 baseline. Preeclampsia protocol recommended.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Latest BP</span>
              <p className="text-sm font-semibold text-foreground">
                {bpInsights.latest?.systolic}/{bpInsights.latest?.diastolic} mmHg
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Mean Arterial Pressure</span>
              <p className="text-sm font-semibold text-foreground">
                {bpInsights.map ? `${bpInsights.map} mmHg` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">T1 Baseline BP</span>
              <p className="text-sm font-semibold text-foreground">
                {bpInsights.baseline?.systolic}/{bpInsights.baseline?.diastolic} mmHg
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Velocity Status</span>
              <p className="text-xs font-semibold">
                {bpInsights.velocitySpike ? (
                  <span className="text-red-600 dark:text-red-400">Significant Spike</span>
                ) : bpInsights.isHypertensive ? (
                  <span className="text-amber-600 dark:text-amber-400">Elevated Pressure</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">Stable Hemodynamics</span>
                )}
              </p>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[40, 180]}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-lg border border-border bg-background p-2 shadow-md text-xs">
                        <p className="font-semibold text-foreground mb-1">{label}</p>
                        {payload.map((entry: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px]">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium text-foreground">{entry.value} mmHg</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <ReferenceLine
                  y={140}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "Sys Threshold 140", fill: "#ef4444", fontSize: 9, position: "top" }}
                />
                <ReferenceLine
                  y={90}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: "Dia Threshold 90", fill: "#f59e0b", fontSize: 9, position: "top" }}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic BP"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolic BP"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconSize={8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {metricTab === "weight" && (
        <div className="flex flex-col gap-2">
          {weightInsights?.rapidGainWarning && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                Rapid Maternal Weight Gain (&gt;1.0 kg/week in 3rd trimester): Rule out occult fluid retention and preeclampsia-associated edema.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Initial Weight</span>
              <p className="text-sm font-semibold text-foreground">
                {weightInsights?.firstWeight ? `${weightInsights.firstWeight} kg` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Current Weight</span>
              <p className="text-sm font-semibold text-foreground">
                {weightInsights?.latestWeight ? `${weightInsights.latestWeight} kg` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Cumulative Gain</span>
              <p className="text-sm font-semibold text-foreground">
                {weightInsights?.totalGain != null ? `+${weightInsights.totalGain} kg` : "N/A"}
              </p>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-lg border border-border bg-background p-2 shadow-md text-xs">
                        <p className="font-semibold text-foreground mb-1">{label}</p>
                        {payload.map((entry: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px]">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium text-foreground">{entry.value} kg</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Maternal Weight"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconSize={8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {metricTab === "fundic" && (
        <div className="flex flex-col gap-2">
          {fundicInsights?.isAbnormal && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                {fundicInsights.lagging
                  ? `Fundic Height lags gestational age by ${Math.abs(fundicInsights.diff)} cm: Suspect Intrauterine Growth Restriction (IUGR) or oligohydramnios.`
                  : `Fundic Height exceeds gestational age by +${fundicInsights.diff} cm: Suspect macrosomia, polyhydramnios, or multiple gestation.`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Latest Fundic Height</span>
              <p className="text-sm font-semibold text-foreground">
                {fundicInsights?.latestFundic ? `${fundicInsights.latestFundic} cm` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">Gestational Age</span>
              <p className="text-sm font-semibold text-foreground">
                {fundicInsights?.aog ? `${fundicInsights.aog} Weeks` : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2">
              <span className="text-[10px] text-muted-foreground">McDonald's Concordance</span>
              <p className="text-xs font-semibold">
                {fundicInsights?.isAbnormal ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Discordant ({fundicInsights.diff > 0 ? `+${fundicInsights.diff}` : fundicInsights.diff} cm)
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">Concordant Growth</span>
                )}
              </p>
            </div>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={[10, 45]}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-lg border border-border bg-background p-2 shadow-md text-xs">
                        <p className="font-semibold text-foreground mb-1">{label}</p>
                        {payload.map((entry: any, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px]">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                            <span className="font-medium text-foreground">{entry.value} cm</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="fundicHeight"
                  name="Recorded Fundic Height"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#8b5cf6" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="expectedFundic"
                  name="Expected McDonald's Curve (1 cm/wk)"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconSize={8}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
