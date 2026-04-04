<script lang="ts" setup>
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { Session, UsageChartResponse } from '#shared/types'

useSeoMeta({ title: 'Sessions – Paperwork' })

const { data: sessions, status } = await useFetch<Session[]>('/api/sessions')
const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: {
    page: 'main'
  }
})

const columns: TableColumn<Session>[] = [
  { accessorKey: 'name', header: 'Session Name' },
  { accessorKey: 'sessionId', header: 'Session ID' },
  { accessorKey: 'requestTokensTotal', header: 'Input Tokens' },
  { accessorKey: 'responseTokensTotal', header: 'Output Tokens' },
  { accessorKey: 'cacheReadTokensTotal', header: 'Cache Read' },
  { accessorKey: 'cacheCreationTokensTotal', header: 'Cache Write' },
  { accessorKey: 'createdAt', header: 'Created (UTC)' },
  { accessorKey: 'lastUsedAt', header: 'Last Used (UTC)' }
]

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

    <UCard class="mb-6">
      <template #header>
        <div>
          <h2 class="text-base font-semibold">
            Usage Over Time
          </h2>
          <p class="text-sm text-muted">
            Stacked bars by session with weighted token totals computed on the server.
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

    <UTable
      :data="sessions ?? []"
      :columns="columns"
      :loading="status === 'pending'"
      class="cursor-pointer"
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
          <p>No sessions yet. Start Claude Code with OTel enabled.</p>
        </div>
      </template>
    </UTable>
  </UContainer>
</template>
