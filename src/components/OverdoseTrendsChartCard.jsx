import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMonthIndex, monthIndexToParts, useOverdoseData } from '../hooks/useOverdoseData.js'

function formatMonthYear(monthIndex) {
  const { year, monthNum } = monthIndexToParts(monthIndex)
  const d = new Date(year, monthNum - 1, 1)
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d)
}

function formatValue(v) {
  if (v === null || v === undefined) return '—'
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v)
  } catch {
    return String(v)
  }
}

export default function OverdoseTrendsChartCard() {
  const { loading, error, states, indicators, meta, api } = useOverdoseData()
  const [stateCode, setStateCode] = useState('US')
  const [indicator, setIndicator] = useState('Number of Drug Overdose Deaths')

  const chartData = useMemo(() => {
    if (!api || !meta) return []
    const series = api.getSeries(stateCode, indicator)
    return series.map((p) => ({
      ...p,
      label: formatMonthIndex(p.monthIndex),
    }))
  }, [api, indicator, meta, stateCode])

  const selectedStateName = useMemo(() => {
    const found = states.find((s) => s.code === stateCode)
    return found?.name || stateCode
  }, [stateCode, states])

  const yLabel = useMemo(() => {
    // Basic heuristic: percent-like indicators should show 0-100, otherwise counts.
    if (indicator.toLowerCase().includes('percent')) return 'Percent'
    return 'Deaths (12-month ending)'
  }, [indicator])

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Overdose trends (per month)</h2>
          <p className="card__subtitle">
            Filter by drug/indicator and location. Source series are <strong>12 month-ending</strong> values.
          </p>
        </div>
        <span className="pill">{loading ? 'Loading…' : 'Ready'}</span>
      </div>

      <div className="controls">
        <label className="field">
          <div className="field__label">Location</div>
          <select
            className="select"
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
            disabled={loading || !!error}
          >
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <div className="field__label">Drug / indicator</div>
          <select
            className="select"
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
            disabled={loading || !!error}
          >
            {indicators.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {!error ? (
        <div className="chartWrap">
          <div className="chartMeta">
            <div className="chartMeta__title">{indicator}</div>
            <div className="chartMeta__subtitle">
              {selectedStateName} · {yLabel}
            </div>
          </div>

          <div className="chart">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 10, right: 18, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="monthIndex"
                  type="number"
                  domain={[meta?.minMonthIndex ?? 'auto', meta?.maxMonthIndex ?? 'auto']}
                  tickFormatter={formatMonthYear}
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.18)' }}
                  tickFormatter={formatValue}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(11, 16, 32, 0.92)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
                    color: 'rgba(255,255,255,0.92)',
                  }}
                  labelFormatter={(label, payload) => {
                    const idx = payload?.[0]?.payload?.monthIndex
                    return idx !== undefined ? formatMonthYear(idx) : String(label)
                  }}
                  formatter={(value) => [formatValue(value), yLabel]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="rgba(99, 102, 241, 0.95)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </section>
  )
}


