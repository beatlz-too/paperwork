<script lang="ts" setup>
import type { ChartDataset, ChartData, ChartOptions } from 'chart.js'
import { Bar } from 'vue-chartjs'
import 'chart.js/auto'
import type { UsageChartResponse } from '#shared/types'

const props = defineProps<{
  chartData: UsageChartResponse
}>()

const data = computed(() => props.chartData as ChartData<'bar'>)
const router = useRouter()
const hasClickableSegments = computed(() => props.chartData.datasets.some(dataset => Boolean(dataset.route)))

type ClickableBarDataset = ChartDataset<'bar'> & { route?: string }

function formatAxisLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'nearest',
    intersect: true
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'nearest',
      intersect: true,
      callbacks: {
        label(context) {
          const value = Number(context.parsed.y ?? 0)
          return `${context.dataset.label}: ${value.toLocaleString()} input-equivalent weighted tokens`
        }
      }
    }
  },
  onClick(_event, elements, chart) {
    const element = elements[0]
    if (!element) return

    const dataset = chart.data.datasets[element.datasetIndex] as ClickableBarDataset | undefined
    const route = dataset?.route
    if (!route) return

    router.push(route)
  },
  scales: {
    x: {
      stacked: true,
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
      ticks: {
        callback(value) {
          return Number(value).toLocaleString()
        }
      }
    }
  },
  datasets: {
    bar: {
      borderRadius: 4,
      borderSkipped: false
    }
  }
}))
</script>

<template>
  <div :class="['h-[320px] w-full', hasClickableSegments ? 'cursor-pointer' : '']">
    <Bar
      :data="data"
      :options="options"
    />
  </div>
</template>
