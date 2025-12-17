import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'

const MONTH_TO_NUM = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
}

function toMonthIndex(year, monthNum) {
  return year * 12 + (monthNum - 1)
}

export function monthIndexToParts(monthIndex) {
  const year = Math.floor(monthIndex / 12)
  const monthNum = (monthIndex % 12) + 1
  return { year, monthNum }
}

export function formatMonthIndex(monthIndex) {
  const { year, monthNum } = monthIndexToParts(monthIndex)
  return `${year}-${String(monthNum).padStart(2, '0')}`
}

function safeNumber(v) {
  if (v === null || v === undefined) return null
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

export function useOverdoseData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [states, setStates] = useState([])
  const [indicators, setIndicators] = useState([])
  const [meta, setMeta] = useState(null)
  const [seriesMap, setSeriesMap] = useState(null)

  useEffect(() => {
    let cancelled = false

    const nextSeriesMap = new Map()
    const statesMap = new Map()
    const indicatorsSet = new Set()
    let minMonthIndex = null
    let maxMonthIndex = null

    setLoading(true)
    setError('')

    const csvUrl = `${import.meta.env.BASE_URL}overdoseRates.csv`
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      // Some hosting/browser setups can block workers which causes parsing to never complete.
      // Keeping this false makes loading more reliable for deployments.
      worker: false,
      skipEmptyLines: true,
      step: (results) => {
        const row = results.data || {}

        const stateCode = row.State
        const stateName = row['State Name']
        const indicator = row.Indicator
        const year = safeNumber(row.Year)
        const monthNum = MONTH_TO_NUM[row.Month]

        if (!stateCode || !indicator || !year || !monthNum) return

        statesMap.set(stateCode, stateName || stateCode)
        indicatorsSet.add(indicator)

        const monthIndex = toMonthIndex(year, monthNum)
        if (minMonthIndex === null || monthIndex < minMonthIndex) minMonthIndex = monthIndex
        if (maxMonthIndex === null || monthIndex > maxMonthIndex) maxMonthIndex = monthIndex

        const dataValue = safeNumber(row['Data Value'])
        const predictedValue = safeNumber(row['Predicted Value'])
        const value = dataValue ?? predictedValue

        const key = `${stateCode}||${indicator}`
        let inner = nextSeriesMap.get(key)
        if (!inner) {
          inner = new Map()
          nextSeriesMap.set(key, inner)
        }
        inner.set(monthIndex, value)
      },
      complete: () => {
        if (cancelled) return

        const nextStates = Array.from(statesMap.entries())
          .map(([code, name]) => ({ code, name }))
          .sort((a, b) => a.name.localeCompare(b.name))

        // Put US first for convenience.
        nextStates.sort((a, b) => (a.code === 'US' ? -1 : b.code === 'US' ? 1 : 0))

        const nextIndicators = Array.from(indicatorsSet).sort((a, b) => a.localeCompare(b))

        setStates(nextStates)
        setIndicators(nextIndicators)
        setMeta({ minMonthIndex, maxMonthIndex })
        setSeriesMap(nextSeriesMap)
        setLoading(false)
      },
      error: (err) => {
        if (cancelled) return
        setError(err?.message || `Failed to load overdoseRates.csv from ${csvUrl}`)
        setLoading(false)
      },
    })

    return () => {
      cancelled = true
    }
  }, [])

  const api = useMemo(() => {
    if (!seriesMap || !meta) return null

    function getSeries(stateCode, indicator) {
      const key = `${stateCode}||${indicator}`
      const inner = seriesMap.get(key)
      if (!inner) return []
      const data = []
      for (let i = meta.minMonthIndex; i <= meta.maxMonthIndex; i += 1) {
        data.push({
          monthIndex: i,
          value: inner.has(i) ? inner.get(i) : null,
        })
      }
      return data
    }

    return { getSeries }
  }, [meta, seriesMap])

  return { loading, error, states, indicators, meta, api }
}


