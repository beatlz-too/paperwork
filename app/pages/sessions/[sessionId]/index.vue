<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import type { AggregatedPrompt, BreakdownChartResponse, Session, UsageChartResponse } from '#shared/types'

const route = useRoute()
const router = useRouter()
const sessionId = route.params.sessionId as string

const { data: sessions, refresh: refreshSessions } = await useFetch<Session[]>('/api/sessions')
const session = computed(() => sessions.value?.find(s => s.sessionId === sessionId))

useSeoMeta({
  title: computed(() => `${session.value?.name || sessionId} – Paperwork`)
})

const { data: prompts, status } = await useFetch<AggregatedPrompt[]>(
  `/api/sessions/${sessionId}/prompts`
)
const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: { page: 'session', sessionId }
})
const { data: breakdownData, status: breakdownStatus } = await useFetch<BreakdownChartResponse>('/api/charts', {
  query: { page: 'session', kind: 'breakdown', sessionId }
})

const columns: TableColumn<AggregatedPrompt>[] = [
  { accessorKey: 'promptId', header: 'Prompt ID' },
  { accessorKey: 'apiCalls', header: 'API Calls' },
  { accessorKey: 'promptTokens', header: 'Input' },
  { accessorKey: 'responseTokens', header: 'Output' },
  { accessorKey: 'cacheReadTokens', header: 'Cache Read' },
  { accessorKey: 'cacheCreationTokens', header: 'Cache Write' }
]

function formatTokens(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function onSelect(_e: Event, row: { original: AggregatedPrompt }) {
  router.push(`/sessions/${sessionId}/prompts/${row.original.promptId}`)
}

// Inline session name editing
const editingName = ref(false)
const editedName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

function startEditing() {
  editedName.value = session.value?.name ?? ''
  editingName.value = true
  nextTick(() => nameInput.value?.focus())
}

async function saveName() {
  if (!editingName.value) return
  editingName.value = false
  const name = editedName.value.trim()
  if (name === (session.value?.name ?? '')) return
  await $fetch(`/api/sessions/${sessionId}/name`, { method: 'PATCH', body: { name } })
  await refreshSessions()
}

function onNameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') saveName()
  if (e.key === 'Escape') editingName.value = false
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
        <input
          v-if="editingName"
          ref="nameInput"
          v-model="editedName"
          class="text-2xl font-bold bg-transparent border-b border-current outline-none w-full"
          @blur="saveName"
          @keydown="onNameKeydown"
        >
        <h1
          v-else
          class="text-2xl font-bold cursor-pointer hover:opacity-70 transition-opacity"
          :title="'Click to rename'"
          @click="startEditing"
        >
          {{ session?.name || '(unnamed session)' }}
        </h1>
        <div class="mt-1 flex items-center gap-2">
          <UuidDisplay :uuid="sessionId" />
          <span
            v-if="session?.projectName"
            class="text-sm text-muted"
          >· {{ session.projectName }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="session"
      class="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Input Tokens
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(session.requestTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Output Tokens
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(session.responseTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Cache Read
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(session.cacheReadTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Cache Write
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(session.cacheCreationTokensTotal) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Prompts
        </div>
        <div class="text-2xl font-semibold">
          {{ prompts?.length ?? '—' }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Last Used
        </div>
        <div class="text-sm font-medium">
          {{ session.lastUsedAt ? new Date(session.lastUsedAt).toUTCString().replace(' GMT', ' UTC') : '—' }}
        </div>
      </UCard>
    </div>

    <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div>
            <h2 class="text-base font-semibold">
              Prompt Usage Over Time
            </h2>
            <p class="text-sm text-muted">
              Stacked bars by prompt with weighted token totals.
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
              Total weighted expenditure per token type for this session.
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
    </div>

    <UTable
      :data="prompts ?? []"
      :columns="columns"
      :loading="status === 'pending'"
      class="cursor-pointer"
      :on-select="onSelect"
    >
      <template #promptId-cell="{ row }">
        <UuidDisplay :uuid="row.original.promptId" />
      </template>

      <template #promptTokens-cell="{ row }">
        {{ formatTokens(row.original.promptTokens) }}
      </template>
      <template #responseTokens-cell="{ row }">
        {{ formatTokens(row.original.responseTokens) }}
      </template>
      <template #cacheReadTokens-cell="{ row }">
        {{ formatTokens(row.original.cacheReadTokens) }}
      </template>
      <template #cacheCreationTokens-cell="{ row }">
        {{ formatTokens(row.original.cacheCreationTokens) }}
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-12 text-muted">
          <UIcon
            name="i-lucide-message-square"
            class="text-4xl"
          />
          <p>No prompts recorded for this session.</p>
        </div>
      </template>
    </UTable>
  </UContainer>
</template>
