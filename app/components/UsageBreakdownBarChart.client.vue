<script lang="ts" setup>
import { Bar } from 'vue-chartjs'
import 'chart.js/auto'
import type { ChartData, ChartOptions } from 'chart.js'
import type { BreakdownChartResponse } from '#shared/types'

const props = defineProps<{
  chartData: BreakdownChartResponse
}>()

const data = computed(() => props.chartData as unknown as ChartData<'bar'>)

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      display: false
    },
      tooltip: {
        callbacks: {
          label(context) {
            const value = Number(context.parsed.y ?? 0)
            return `${context.label}: ${value.toLocaleString()} input-equivalent weighted tokens`
          }
        }
      }
  },
  scales: {
    x: {
      stacked: false
    },
    y: {
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
