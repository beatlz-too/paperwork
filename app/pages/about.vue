<script lang="ts" setup>
import { tokenMixSampleChartData } from '#shared/token-mix-over-time.sample'

useSeoMeta({
  title: 'About – Paperwork',
  description: 'How Paperwork calculates token usage and reads its charts'
})

const tokenWeights = [
  { label: 'Input', value: '1x', description: 'Raw prompt tokens.' },
  { label: 'Output', value: '5x', description: 'Response tokens are weighted higher because they carry more inference cost.' },
  { label: 'Cache Read', value: '0.1x', description: 'Cache hits are discounted heavily.' },
  { label: 'Cache Write', value: '1.25x', description: 'Cache creation is treated as a partial input cost.' }
]

const chartCards = [
  {
    title: 'Usage Over Time',
    summary: 'A stacked bar chart that shows weighted usage across the entities in the current page scope.',
    details: [
      'On the main page, you can switch the chart between sessions and projects.',
      'On a project page, the same chart is filtered to sessions in that project.',
      'On a session page, it becomes prompt-level history for that one session.'
    ]
  },
  {
    title: 'Token Type Breakdown',
    summary: 'A single stacked bar that totals the current page scope by token type.',
    details: [
      'Useful for answering "where did the total cost go?"',
      'The bars are already weighted, so the chart reflects cost rather than raw counts.'
    ]
  },
  {
    title: 'Token Mix Over Time',
    summary: 'A stacked area chart normalized to 0-100 so you can compare composition day by day.',
    details: [
      'Each day is converted into weighted token shares before stacking.',
      'The layers never cross because the chart is plotted as cumulative percentages.',
      'This sample uses 30 days of mock data that follows the same shape as the live chart.'
    ]
  }
]

const scopeCards = [
  {
    title: 'Main page',
    description: 'Aggregates all sessions in the workspace. The usage chart can be grouped by session or by project.'
  },
  {
    title: 'Project page',
    description: 'Filters the charts down to sessions that belong to the selected project.'
  },
  {
    title: 'Session page',
    description: 'Scopes every chart to the selected session and its prompts.'
  }
]
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-8 max-w-3xl">
      <p class="text-sm uppercase tracking-[0.2em] text-muted mb-3">
        About
      </p>
      <h1 class="text-4xl font-bold tracking-tight">
        How Paperwork reads token usage
      </h1>
      <p class="mt-4 text-base text-muted leading-7">
        Paperwork turns the raw session and prompt telemetry into three views that answer different questions:
        how much was used, where it was spent, and how that mix changed over time. The charts are already
        weighted on the server side, so the frontend only renders the calculated datasets.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2 mb-6">
      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              Token weights
            </h2>
            <p class="text-sm text-muted">
              We convert token types into a shared input-equivalent unit before plotting them.
            </p>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="item in tokenWeights"
            :key="item.label"
            class="rounded-lg border border-default bg-elevated p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-medium">
                {{ item.label }}
              </span>
              <UBadge
                color="neutral"
                variant="soft"
              >
                {{ item.value }}
              </UBadge>
            </div>
            <p class="mt-2 text-sm text-muted leading-6">
              {{ item.description }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              How the scopes work
            </h2>
            <p class="text-sm text-muted">
              The active page decides which records are included before the chart is built.
            </p>
          </div>
        </template>

        <div class="grid gap-3">
          <div
            v-for="scope in scopeCards"
            :key="scope.title"
            class="rounded-lg border border-default bg-elevated p-4"
          >
            <div class="font-medium">
              {{ scope.title }}
            </div>
            <p class="mt-1 text-sm text-muted leading-6">
              {{ scope.description }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid gap-6">
      <UCard
        v-for="card in chartCards"
        :key="card.title"
      >
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              {{ card.title }}
            </h2>
            <p class="text-sm text-muted">
              {{ card.summary }}
            </p>
          </div>
        </template>

        <div class="grid gap-4 lg:grid-cols-[1.1fr_1.4fr] items-start">
          <div class="space-y-3">
            <p class="text-sm leading-7 text-muted">
              <template v-if="card.title === 'Token Mix Over Time'">
                This chart shows the normalized daily share of weighted tokens. It is the same stacked-area shape as the live chart, but fed from a local sample so the page stays frontend-only.
              </template>
              <template v-else>
                {{ card.summary }}
              </template>
            </p>
            <ul class="space-y-2 text-sm leading-6 text-muted">
              <li
                v-for="detail in card.details"
                :key="detail"
                class="flex gap-2"
              >
                <span class="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{{ detail }}</span>
              </li>
            </ul>
          </div>

          <div
            v-if="card.title === 'Token Mix Over Time'"
            class="rounded-xl border border-default bg-default p-4"
          >
            <TokenMixAreaChart :chart-data="tokenMixSampleChartData" />
          </div>
        </div>
      </UCard>
    </div>

    <div class="mt-6">
      <UButton
        to="/"
        color="neutral"
        variant="ghost"
        class="cursor-pointer"
      >
        Back to sessions
      </UButton>
    </div>
  </UContainer>
</template>
