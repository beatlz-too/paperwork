<script lang="ts" setup>
import { Bar } from 'vue-chartjs'
import 'chart.js/auto'
import type { ChartData, ChartOptions } from 'chart.js'
import type { UsageChartResponse } from '#shared/types'

const props = defineProps<{
  chartData: UsageChartResponse
}>()

const data = computed(() => props.chartData as ChartData<'bar'>)

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        boxWidth: 10
      }
    },
    tooltip: {
      callbacks: {
        label(context) {
          const value = Number(context.parsed.y ?? 0)
          return `${context.dataset.label}: ${value.toLocaleString()}`
        }
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      ticks: {
        maxRotation: 0,
        autoSkip: true
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
  <div class="h-[320px] w-full">
    <Bar
      :data="data"
      :options="options"
    />
  </div>
</template>
