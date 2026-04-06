<script lang="ts" setup>
import { Line } from 'vue-chartjs'
import 'chart.js/auto'
import type { ChartData, ChartOptions } from 'chart.js'
import type { UsageAreaChartResponse } from '#shared/types'

const props = defineProps<{
  chartData: UsageAreaChartResponse
}>()

const data = computed(() => props.chartData as unknown as ChartData<'line'>)

function formatAxisLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'start',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        boxHeight: 8
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title(items) {
          const label = props.chartData.labels[items[0]?.dataIndex ?? -1]
          return label ? formatAxisLabel(label) : ''
        },
        label(context) {
          const value = Number(context.parsed.y ?? 0)
          return `${context.dataset.label}: ${value.toFixed(1)}%`
        }
      }
    }
  },
  scales: {
    x: {
      stacked: false,
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        callback(value) {
          const label = props.chartData.labels[Number(value)]
          return label ? formatAxisLabel(label) : ''
        }
      }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      min: 0,
      max: 100,
      ticks: {
        callback(value) {
          return `${Number(value).toFixed(0)}%`
        }
      }
    }
  },
  elements: {
    line: {
      borderJoinStyle: 'round'
    },
    point: {
      radius: 0,
      hoverRadius: 4
    }
  }
}))
</script>

<template>
  <div class="h-[360px] w-full">
    <Line
      :data="data"
      :options="options"
    />
  </div>
</template>
