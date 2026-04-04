<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import type { AggregatedPrompt, Prompt, UsageChartResponse } from '#shared/types'

const route = useRoute()
const router = useRouter()
const sessionId = route.params.sessionId as string
const promptId = computed(() => route.params.promptId as string)

// Fetch aggregated prompts for the session (used for prev/next navigation)
const { data: allPrompts } = await useFetch<AggregatedPrompt[]>(
  `/api/sessions/${sessionId}/prompts`
)

const currentIndex = computed(() => allPrompts.value?.findIndex(p => p.promptId === promptId.value) ?? -1)
const current = computed(() => allPrompts.value?.[currentIndex.value] ?? null)
const prev = computed(() => currentIndex.value > 0 ? allPrompts.value![currentIndex.value - 1] : null)
const next = computed(() => currentIndex.value >= 0 && currentIndex.value < (allPrompts.value?.length ?? 0) - 1
  ? allPrompts.value![currentIndex.value + 1]
  : null
)

// Fetch raw API call rows for this prompt — reactive to promptId changes
const { data: apiCalls, status } = await useFetch<Prompt[]>(
  () => `/api/sessions/${sessionId}/prompts/${promptId.value}`
)
const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: computed(() => ({
    page: 'prompt' as const,
    sessionId,
    promptId: promptId.value
  }))
})

useSeoMeta({ title: computed(() => `Prompt ${promptId.value.slice(0, 8)}… – Paperwork`) })

const columns: TableColumn<Prompt>[] = [
  { accessorKey: 'createdAt', header: 'Time' },
  { accessorKey: 'promptTokens', header: 'Input' },
  { accessorKey: 'responseTokens', header: 'Output' },
  { accessorKey: 'cacheReadTokens', header: 'Cache Read' },
  { accessorKey: 'cacheCreationTokens', header: 'Cache Write' }
]

function formatTokens(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function formatTime(iso: string): string {
  return new Date(iso).toUTCString().replace(' GMT', ' UTC')
}

function navigate(p: AggregatedPrompt) {
  router.push(`/sessions/${sessionId}/prompts/${p.promptId}`)
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <UButton
          :to="`/sessions/${sessionId}`"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          aria-label="Back to session"
        />
        <div>
          <div class="flex items-center gap-2">
            <UuidDisplay :uuid="promptId" />
          </div>
          <p class="text-muted text-sm mt-0.5">
            {{ currentIndex >= 0 ? `Prompt ${currentIndex + 1} of ${allPrompts?.length}` : '' }}
          </p>
        </div>
      </div>

      <!-- Prev / Next -->
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          color="neutral"
          :disabled="!prev"
          aria-label="Previous prompt"
          @click="prev && navigate(prev)"
        />
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          color="neutral"
          :disabled="!next"
          aria-label="Next prompt"
          @click="next && navigate(next)"
        />
      </div>
    </div>

    <!-- Token summary cards -->
    <div
      v-if="current"
      class="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Input Tokens
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(current.promptTokens) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Output Tokens
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(current.responseTokens) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Cache Read
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(current.cacheReadTokens) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Cache Write
        </div>
        <div class="text-2xl font-semibold">
          {{ formatTokens(current.cacheCreationTokens) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          API Calls
        </div>
        <div class="text-2xl font-semibold">
          {{ current.apiCalls }}
        </div>
      </UCard>
      <UCard>
        <div class="text-xs text-muted uppercase tracking-wide mb-1">
          Time
        </div>
        <div class="text-xs font-medium">
          {{ formatTime(current.createdAt) }}
        </div>
      </UCard>
    </div>

    <UCard class="mb-6">
      <template #header>
        <div>
          <h2 class="text-base font-semibold">
            API Call Usage Over Time
          </h2>
          <p class="text-sm text-muted">
            Stacked bars by table row with backend-weighted token totals.
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

    <!-- Per-API-call breakdown -->
    <h2 class="text-lg font-semibold mb-3">
      API Call Breakdown
    </h2>
    <UTable
      :data="apiCalls ?? []"
      :columns="columns"
      :loading="status === 'pending'"
    >
      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatTime(row.original.createdAt) }}</span>
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
            name="i-lucide-inbox"
            class="text-4xl"
          />
          <p>No API calls found.</p>
        </div>
      </template>
    </UTable>
  </UContainer>
</template>
