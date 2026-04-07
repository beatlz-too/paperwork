<script lang="ts" setup>
import type { BreakdownChartResponse, ProjectSummary, Session, UsageAreaChartResponse, UsageChartDimension, UsageChartResponse } from '#shared/types'
import { buildProjectData } from '~/utils/tableRows'
import { buildReportUrl } from '~/utils/reportUrl'
import { projectColumns, sessionColumns } from '~/utils/tableColumns'
import type { TableRow } from '@nuxt/ui'

useSeoMeta({ title: 'Sessions – Paperwork' })

const dimension = ref<UsageChartDimension>('session')

const { data: sessions, status } = await useFetch<Session[]>('/api/sessions')

const projectData = computed<ProjectSummary[]>(() => buildProjectData(sessions.value ?? []))

const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: { page: 'main', dimension }
})
const { data: areaChartData, status: areaChartStatus } = await useFetch<UsageAreaChartResponse>('/api/charts', {
  query: { page: 'main', kind: 'area' }
})
const { data: breakdownData, status: breakdownStatus } = await useFetch<BreakdownChartResponse>('/api/charts', {
  query: { page: 'main', kind: 'breakdown' }
})

const sessionSorting = ref([{ id: 'lastUsedAt', desc: true }])
const projectSorting = ref([{ id: 'lastUsedAt', desc: true }])
const groupByProjects = computed({
  get: () => dimension.value === 'project',
  set: (value: boolean) => {
    dimension.value = value ? 'project' : 'session'
  }
})

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

    <div class="mb-4 flex items-center gap-3 text-sm">
      <span class="text-muted font-medium">
        Group by:
      </span>
      <div class="flex items-center gap-2">
        <span :class="groupByProjects ? 'text-muted' : 'font-medium text-default'">
          sessions
        </span>
        <USwitch v-model="groupByProjects" />
        <span :class="groupByProjects ? 'font-medium text-default' : 'text-muted'">
          projects
        </span>
      </div>
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

    <div v-if="dimension === 'session'">
      <div class="mb-3 flex items-center justify-end">
        <TableExportActions
          table-name="sessions"
          :rows="sessions ?? []"
          :columns="sessionColumns"
          :report-href="buildReportUrl('sessions', {})"
        />
      </div>

      <UTable
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
    </div>

    <div v-else>
      <div class="mb-3 flex items-center justify-end">
        <TableExportActions
          table-name="projects"
          :rows="projectData"
          :columns="projectColumns"
          :report-href="buildReportUrl('projects', {})"
        />
      </div>

      <UTable
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
    </div>
  </UContainer>
</template>
