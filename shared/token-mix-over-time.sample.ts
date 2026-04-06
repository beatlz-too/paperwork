import type { UsageAreaChartResponse } from '#shared/types'

type SampleRow = {
  day: string
  prompt: number
  response: number
  cacheRead: number
  cacheCreation: number
}

const START_DATE = new Date(Date.UTC(2026, 2, 8))

const SAMPLE_ROWS: SampleRow[] = [
  { day: '2026-03-08', prompt: 34, response: 46, cacheRead: 10, cacheCreation: 10 },
  { day: '2026-03-09', prompt: 35, response: 45, cacheRead: 9, cacheCreation: 11 },
  { day: '2026-03-10', prompt: 36, response: 44, cacheRead: 9, cacheCreation: 11 },
  { day: '2026-03-11', prompt: 35, response: 45, cacheRead: 10, cacheCreation: 10 },
  { day: '2026-03-12', prompt: 33, response: 47, cacheRead: 10, cacheCreation: 10 },
  { day: '2026-03-13', prompt: 31, response: 49, cacheRead: 10, cacheCreation: 10 },
  { day: '2026-03-14', prompt: 30, response: 50, cacheRead: 10, cacheCreation: 10 },
  { day: '2026-03-15', prompt: 29, response: 51, cacheRead: 10, cacheCreation: 10 },
  { day: '2026-03-16', prompt: 28, response: 52, cacheRead: 11, cacheCreation: 9 },
  { day: '2026-03-17', prompt: 29, response: 51, cacheRead: 11, cacheCreation: 9 },
  { day: '2026-03-18', prompt: 30, response: 50, cacheRead: 12, cacheCreation: 8 },
  { day: '2026-03-19', prompt: 31, response: 49, cacheRead: 13, cacheCreation: 7 },
  { day: '2026-03-20', prompt: 32, response: 48, cacheRead: 14, cacheCreation: 6 },
  { day: '2026-03-21', prompt: 33, response: 47, cacheRead: 13, cacheCreation: 7 },
  { day: '2026-03-22', prompt: 34, response: 46, cacheRead: 12, cacheCreation: 8 },
  { day: '2026-03-23', prompt: 36, response: 45, cacheRead: 11, cacheCreation: 8 },
  { day: '2026-03-24', prompt: 37, response: 44, cacheRead: 10, cacheCreation: 9 },
  { day: '2026-03-25', prompt: 38, response: 43, cacheRead: 9, cacheCreation: 10 },
  { day: '2026-03-26', prompt: 39, response: 42, cacheRead: 8, cacheCreation: 11 },
  { day: '2026-03-27', prompt: 40, response: 41, cacheRead: 8, cacheCreation: 11 },
  { day: '2026-03-28', prompt: 41, response: 40, cacheRead: 8, cacheCreation: 11 },
  { day: '2026-03-29', prompt: 42, response: 39, cacheRead: 9, cacheCreation: 10 },
  { day: '2026-03-30', prompt: 41, response: 40, cacheRead: 9, cacheCreation: 10 },
  { day: '2026-03-31', prompt: 40, response: 41, cacheRead: 10, cacheCreation: 9 },
  { day: '2026-04-01', prompt: 39, response: 42, cacheRead: 10, cacheCreation: 9 },
  { day: '2026-04-02', prompt: 38, response: 43, cacheRead: 11, cacheCreation: 8 },
  { day: '2026-04-03', prompt: 37, response: 44, cacheRead: 12, cacheCreation: 7 },
  { day: '2026-04-04', prompt: 36, response: 45, cacheRead: 12, cacheCreation: 7 },
  { day: '2026-04-05', prompt: 35, response: 46, cacheRead: 11, cacheCreation: 8 },
  { day: '2026-04-06', prompt: 34, response: 47, cacheRead: 10, cacheCreation: 9 }
]

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days
  ))
}

function normalizeRow(row: SampleRow) {
  const total = row.prompt + row.response + row.cacheRead + row.cacheCreation

  return {
    day: row.day,
    prompt: total === 0 ? 0 : (row.prompt / total) * 100,
    response: total === 0 ? 0 : (row.response / total) * 100,
    cacheRead: total === 0 ? 0 : (row.cacheRead / total) * 100,
    cacheCreation: total === 0 ? 0 : (row.cacheCreation / total) * 100
  }
}

const labels = SAMPLE_ROWS.map(row => row.day)

export const tokenMixSampleChartData: UsageAreaChartResponse = {
  page: 'main',
  labels,
  datasets: [
    {
      label: 'Input',
      data: SAMPLE_ROWS.map(row => normalizeRow(row).prompt),
      borderColor: '#6BD425',
      backgroundColor: 'rgba(107, 212, 37, 0.28)',
      fill: true,
      tension: 0.28,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      stack: 'tokens',
      borderSkipped: false
    },
    {
      label: 'Output',
      data: SAMPLE_ROWS.map(row => normalizeRow(row).response),
      borderColor: '#2274A5',
      backgroundColor: 'rgba(34, 116, 165, 0.28)',
      fill: true,
      tension: 0.28,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      stack: 'tokens',
      borderSkipped: false
    },
    {
      label: 'Cache Read',
      data: SAMPLE_ROWS.map(row => normalizeRow(row).cacheRead),
      borderColor: '#FC60A8',
      backgroundColor: 'rgba(252, 96, 168, 0.28)',
      fill: true,
      tension: 0.28,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      stack: 'tokens',
      borderSkipped: false
    },
    {
      label: 'Cache Write',
      data: SAMPLE_ROWS.map(row => normalizeRow(row).cacheCreation),
      borderColor: '#F0A202',
      backgroundColor: 'rgba(240, 162, 2, 0.28)',
      fill: true,
      tension: 0.28,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      stack: 'tokens',
      borderSkipped: false
    }
  ],
  weights: {
    prompt: 1,
    response: 5,
    cacheRead: 0.1,
    cacheCreation: 1.25
  }
}

export const tokenMixSampleNotes = SAMPLE_ROWS.map((row, index) => {
  const date = addDays(START_DATE, index)

  return {
    day: toIsoDay(date),
    share: normalizeRow(row)
  }
})
