<script lang="ts" setup>
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { BreakdownChartResponse, ProjectSummary, Session, UsageAreaChartResponse, UsageChartDimension, UsageChartResponse } from '#shared/types'
import { sortableHeader } from '~/utils/table'

useSeoMeta({ title: 'Sessions – Paperwork' })

const dimension = ref<UsageChartDimension>('session')

const { data: sessions, status } = await useFetch<Session[]>('/api/sessions')

const projectData = computed<ProjectSummary[]>(() => {
  if (!sessions.value) return []

  const grouped = new Map<string, ProjectSummary>()

  for (const session of sessions.value) {
    const key = session.projectName?.trim() || 'other'
    const existing = grouped.get(key)

    if (existing) {
      existing.sessionCount++
      existing.requestTokensTotal += session.requestTokensTotal
      existing.responseTokensTotal += session.responseTokensTotal
      existing.cacheReadTokensTotal += session.cacheReadTokensTotal
      existing.cacheCreationTokensTotal += session.cacheCreationTokensTotal
      if (session.lastUsedAt > existing.lastUsedAt) existing.lastUsedAt = session.lastUsedAt
      if (session.createdAt < existing.createdAt) existing.createdAt = session.createdAt
    }
    else {
      grouped.set(key, {
        projectName: key,
        sessionCount: 1,
        requestTokensTotal: session.requestTokensTotal,
        responseTokensTotal: session.responseTokensTotal,
        cacheReadTokensTotal: session.cacheReadTokensTotal,
        cacheCreationTokensTotal: session.cacheCreationTokensTotal,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt
      })
    }
  }

  return [...grouped.values()].sort((a, b) =>
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  )
})

const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: { page: 'main', dimension }
})
const { data: areaChartData, status: areaChartStatus } = await useFetch<UsageAreaChartResponse>('/api/charts', {
  query: { page: 'main', kind: 'area' }
})
const { data: breakdownData, status: breakdownStatus } = await useFetch<BreakdownChartResponse>('/api/charts', {
  query: { page: 'main', kind: 'breakdown' }
})

const sessionColumns: TableColumn<Session>[] = [
  { accessorKey: 'projectName', header: sortableHeader<Session>('Project') },
  { accessorKey: 'name', header: sortableHeader<Session>('Session Name') },
  { accessorKey: 'sessionId', header: sortableHeader<Session>('Session ID') },
  { accessorKey: 'requestTokensTotal', header: sortableHeader<Session>('Input Tokens') },
  { accessorKey: 'responseTokensTotal', header: sortableHeader<Session>('Output Tokens') },
  { accessorKey: 'cacheReadTokensTotal', header: sortableHeader<Session>('Cache Read') },
  { accessorKey: 'cacheCreationTokensTotal', header: sortableHeader<Session>('Cache Write') },
  { accessorKey: 'createdAt', header: sortableHeader<Session>('Created (UTC)') },
  { accessorKey: 'lastUsedAt', header: sortableHeader<Session>('Last Used (UTC)') }
]

const projectColumns: TableColumn<ProjectSummary>[] = [
  { accessorKey: 'projectName', header: sortableHeader<ProjectSummary>('Project') },
  { accessorKey: 'sessionCount', header: sortableHeader<ProjectSummary>('Sessions') },
  { accessorKey: 'requestTokensTotal', header: sortableHeader<ProjectSummary>('Input Tokens') },
  { accessorKey: 'responseTokensTotal', header: sortableHeader<ProjectSummary>('Output Tokens') },
  { accessorKey: 'cacheReadTokensTotal', header: sortableHeader<ProjectSummary>('Cache Read') },
  { accessorKey: 'cacheCreationTokensTotal', header: sortableHeader<ProjectSummary>('Cache Write') },
  { accessorKey: 'createdAt', header: sortableHeader<ProjectSummary>('Created (UTC)') },
  { accessorKey: 'lastUsedAt', header: sortableHeader<ProjectSummary>('Last Used (UTC)') }
]

const sessionSorting = ref([{ id: 'lastUsedAt', desc: true }])
const projectSorting = ref([{ id: 'lastUsedAt', desc: true }])

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toUTCString().replace(' GMT', ' UTC')
}

function formatTokens(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

const router = useRouter()

function onSelect(_e: Event, row: TableRow<Session>) {
  router.push(`/sessions/${row.original.sessionId}`)
}

function onProjectSelect(_e: Event, row: TableRow<ProjectSummary>) {
  router.push(`/projects/${encodeURIComponent(row.original.projectName)}`)
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">
        Claude Code Sessions
      </h1>
      <p class="text-muted mt-1">
        Token usage breakdown per session
      </p>
    </div>

    <div class="mb-4 flex items-center gap-2">
      <UButtonGroup size="sm">
        <UButton
          :variant="dimension === 'session' ? 'solid' : 'outline'"
          :ui="{ base: 'cursor-pointer' }"
          @click="dimension = 'session'"
        >
          Sessions
        </UButton>
        <UButton
          :variant="dimension === 'project' ? 'solid' : 'outline'"
          :ui="{ base: 'cursor-pointer' }"
          @click="dimension = 'project'"
          class="ml-2"
        >
          Projects
        </UButton>
      </UButtonGroup>
    </div>

    <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              Usage Over Time
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
              Total input-equivalent weighted expenditure per token type across all sessions.
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
              Daily share of weighted token types across all sessions, normalized to 100%.
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

    <UTable
      v-if="dimension === 'session'"
      :data="sessions ?? []"
      :columns="sessionColumns"
      :loading="status === 'pending'"
      class="cursor-pointer"
      v-model:sorting="sessionSorting"
      :on-select="onSelect"
    >
      <template #projectName-cell="{ row }">
        <span class="text-sm">{{ row.original.projectName || '—' }}</span>
      </template>

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
          <p>No sessions yet. Start Claude Code with OTel enabled.</p>
        </div>
      </template>
    </UTable>

    <UTable
      v-else
      :data="projectData"
      :columns="projectColumns"
      :loading="status === 'pending'"
      class="cursor-pointer"
      v-model:sorting="projectSorting"
      :on-select="onProjectSelect"
    >
      <template #projectName-cell="{ row }">
        <span class="text-sm">{{ row.original.projectName }}</span>
      </template>

      <template #sessionCount-cell="{ row }">
        {{ row.original.sessionCount.toLocaleString() }}
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
          <p>No projects yet. Sessions will appear here once grouped.</p>
        </div>
      </template>
    </UTable>
  </UContainer>
</template>
