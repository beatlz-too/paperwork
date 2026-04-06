<script lang="ts" setup>
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { BreakdownChartResponse, Session, UsageAreaChartResponse, UsageChartResponse } from '#shared/types'
import { sortableHeader } from '~/utils/table'

const route = useRoute()
const router = useRouter()
const projectName = decodeURIComponent(route.params.projectName as string)

useSeoMeta({ title: computed(() => `${projectName} – Paperwork`) })

const { data: sessions, status } = await useFetch<Session[]>(
  `/api/projects/${encodeURIComponent(projectName)}/sessions`
)
const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: { page: 'main', projectName: encodeURIComponent(projectName) }
})
const { data: areaChartData, status: areaChartStatus } = await useFetch<UsageAreaChartResponse>('/api/charts', {
  query: { page: 'main', kind: 'area', projectName: encodeURIComponent(projectName) }
})
const { data: breakdownData, status: breakdownStatus } = await useFetch<BreakdownChartResponse>('/api/charts', {
  query: { page: 'main', kind: 'breakdown', projectName: encodeURIComponent(projectName) }
})

const totals = computed(() => {
  const list = sessions.value ?? []
  return {
    sessionCount: list.length,
    requestTokensTotal: list.reduce((s, r) => s + r.requestTokensTotal, 0),
    responseTokensTotal: list.reduce((s, r) => s + r.responseTokensTotal, 0),
    cacheReadTokensTotal: list.reduce((s, r) => s + r.cacheReadTokensTotal, 0),
    cacheCreationTokensTotal: list.reduce((s, r) => s + r.cacheCreationTokensTotal, 0),
    lastUsedAt: list.reduce((max, r) => r.lastUsedAt > max ? r.lastUsedAt : max, '')
  }
})

const columns: TableColumn<Session>[] = [
  { accessorKey: 'name', header: sortableHeader<Session>('Session Name') },
  { accessorKey: 'sessionId', header: sortableHeader<Session>('Session ID') },
  { accessorKey: 'requestTokensTotal', header: sortableHeader<Session>('Input Tokens') },
  { accessorKey: 'responseTokensTotal', header: sortableHeader<Session>('Output Tokens') },
  { accessorKey: 'cacheReadTokensTotal', header: sortableHeader<Session>('Cache Read') },
  { accessorKey: 'cacheCreationTokensTotal', header: sortableHeader<Session>('Cache Write') },
  { accessorKey: 'createdAt', header: sortableHeader<Session>('Created (UTC)') },
  { accessorKey: 'lastUsedAt', header: sortableHeader<Session>('Last Used (UTC)') }
]

const sorting = ref([{ id: 'lastUsedAt', desc: true }])

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toUTCString().replace(' GMT', ' UTC')
}

function formatTokens(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function onSelect(_e: Event, row: TableRow<Session>) {
  router.push(`/sessions/${row.original.sessionId}`)
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex items-start gap-3">
      <UButton
        to="/"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        class="mt-0.5"
        aria-label="Back to sessions"
      />
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold">
          {{ projectName }}
        </h1>
        <p class="text-sm text-muted mt-1">
          Project
        </p>
      </div>
    </div>

    <div
      v-if="sessions"
      class="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Sessions
        </div>
        <div class="text-2xl font-semibold">
          {{ totals.sessionCount.toLocaleString() }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Input Tokens
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(totals.requestTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Output Tokens
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(totals.responseTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Cache Read
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(totals.cacheReadTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Cache Write
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(totals.cacheCreationTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Last Used
        </div>
        <div class="text-sm font-medium">
          {{ formatDate(totals.lastUsedAt) }}
        </div>
      </UCard>
    </div>

    <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              Session Usage Over Time
            </h2>
            <p class="text-sm text-muted">
              Stacked bars by session with input-equivalent weighted token totals.
            </p>
          </div>
        </template>

        <USkeleton
          v-if="chartStatus === 'pending'"
          class="h-[320px] w-full"
        />
        <UsageStackedBarChart
          v-else-if="chartData"
          :chart-data="chartData"
        />
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              Token Type Breakdown
            </h2>
            <p class="text-sm text-muted">
              Total input-equivalent weighted expenditure per token type for this project.
            </p>
          </div>
        </template>

        <USkeleton
          v-if="breakdownStatus === 'pending'"
          class="h-[320px] w-full"
        />
        <UsageBreakdownBarChart
          v-else-if="breakdownData"
          :chart-data="breakdownData"
        />
      </UCard>

      <UCard class="lg:col-span-2">
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              Token Mix Over Time
            </h2>
            <p class="text-sm text-muted">
              Daily share of weighted token types for this project, normalized to 100%.
            </p>
          </div>
        </template>

        <USkeleton
          v-if="areaChartStatus === 'pending'"
          class="h-[360px] w-full"
        />
        <TokenMixAreaChart
          v-else-if="areaChartData"
          :chart-data="areaChartData"
        />
      </UCard>
    </div>

    <div class="mb-3 flex items-center justify-end">
      <TableJsonCopyButton
        table-name="sessions"
        :rows="sessions ?? []"
        :columns="columns"
      />
    </div>

    <UTable
      :data="sessions ?? []"
      :columns="columns"
      :loading="status === 'pending'"
      class="cursor-pointer"
      v-model:sorting="sorting"
      :on-select="onSelect"
    >
      <template #name-cell="{ row }">
        <span class="font-medium">{{ row.original.name || '(unnamed)' }}</span>
      </template>

      <template #sessionId-cell="{ row }">
        <UuidDisplay :uuid="row.original.sessionId" />
      </template>

      <template #requestTokensTotal-cell="{ row }">
        {{ formatTokens(row.original.requestTokensTotal) }}
      </template>

      <template #responseTokensTotal-cell="{ row }">
        {{ formatTokens(row.original.responseTokensTotal) }}
      </template>

      <template #cacheReadTokensTotal-cell="{ row }">
        {{ formatTokens(row.original.cacheReadTokensTotal) }}
      </template>

      <template #cacheCreationTokensTotal-cell="{ row }">
        {{ formatTokens(row.original.cacheCreationTokensTotal) }}
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
      </template>

      <template #lastUsedAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.lastUsedAt) }}</span>
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-12 text-muted">
          <UIcon
            name="i-lucide-inbox"
            class="text-4xl"
          />
          <p>No sessions found for this project.</p>
        </div>
      </template>
    </UTable>
  </UContainer>
</template>
