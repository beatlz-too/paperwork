<script lang="ts" setup>
import type { AggregatedPrompt, BreakdownChartResponse, Session, UsageAreaChartResponse, UsageChartResponse } from '#shared/types'
import type { TableRow } from '@nuxt/ui'
import { buildReportUrl } from '~/utils/reportUrl'
import { buildPromptRows } from '~/utils/tableRows'
import { promptColumns, type PromptTableRow } from '~/utils/tableColumns'

const route = useRoute()
const router = useRouter()
const sessionId = route.params.sessionId as string

const { data: sessions, refresh: refreshSessions } = await useFetch<Session[]>('/api/sessions')
const { data: projectNames, refresh: refreshProjectNames } = await useFetch<string[]>('/api/fetchProjects')
const session = computed(() => sessions.value?.find(s => s.sessionId === sessionId))

useSeoMeta({
  title: computed(() => `${session.value?.name || sessionId} – Paperwork`)
})

const { data: prompts, status } = await useFetch<AggregatedPrompt[]>(
  `/api/sessions/${sessionId}/prompts`
)
const promptRows = computed(() => buildPromptRows(prompts.value ?? []))

const { data: chartData, status: chartStatus } = await useFetch<UsageChartResponse>('/api/charts', {
  query: { page: 'session', sessionId }
})
const { data: areaChartData, status: areaChartStatus } = await useFetch<UsageAreaChartResponse>('/api/charts', {
  query: { page: 'session', kind: 'area', sessionId }
})
const { data: breakdownData, status: breakdownStatus } = await useFetch<BreakdownChartResponse>('/api/charts', {
  query: { page: 'session', kind: 'breakdown', sessionId }
})

const sorting = ref([{ id: 'promptNumber', desc: false }])

function formatTokens(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function onSelect(_e: Event, row: TableRow<PromptTableRow>) {
  router.push(`/sessions/${sessionId}/prompts/${row.original.promptId}`)
}

const editingProject = ref(false)
const editedProject = ref('')

function startProjectEditing() {
  editedProject.value = session.value?.projectName ?? ''
  editingProject.value = true
}

function cancelProjectEditing() {
  editedProject.value = session.value?.projectName ?? ''
  editingProject.value = false
}

async function saveProject() {
  if (!editingProject.value) return

  const nextProjectName = editedProject.value.trim()
  const currentProjectName = session.value?.projectName ?? ''

  editingProject.value = false

  if (nextProjectName === currentProjectName) return

  await $fetch(`/api/sessions/${sessionId}/project`, {
    method: 'PATCH',
    body: { projectName: nextProjectName }
  })
  await Promise.all([refreshSessions(), refreshProjectNames()])
}

function onProjectMenuOpenChange(isOpen: boolean) {
  if (!isOpen) {
    void saveProject()
  }
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
          <button
            v-if="!editingProject"
            type="button"
            class="inline-flex cursor-pointer items-center gap-1 text-sm text-muted transition-colors hover:text-default"
            @click="startProjectEditing"
          >
            <span>{{ session?.projectName || 'Add project' }}</span>
            <UIcon
              name="i-lucide-pencil"
              class="text-xs"
            />
          </button>
          <UInputMenu
            v-else
            v-model="editedProject"
            :items="projectNames ?? []"
            autocomplete
            open-on-focus
            autofocus
            placeholder="Select or type a project"
            class="w-72"
            @update:open="onProjectMenuOpenChange"
            @keydown.enter.prevent="saveProject"
            @keydown.esc.prevent="cancelProjectEditing"
          />
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
              Stacked bars by prompt with input-equivalent weighted token totals.
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
              Total input-equivalent weighted expenditure per token type for this session.
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
              Daily share of weighted token types for this session, normalized to 100%.
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
      <TableExportActions
        table-name="prompts"
        :rows="promptRows"
        :columns="promptColumns"
        :report-href="buildReportUrl('prompts', { sessionId })"
      />
    </div>

    <UTable
      v-model:sorting="sorting"
      :data="promptRows"
      :columns="promptColumns"
      :loading="status === 'pending'"
      class="cursor-pointer"
      :on-select="onSelect"
    >
      <template #promptNumber-cell="{ row }">
        {{ row.original.promptNumber }}
      </template>

      <template #promptId-cell="{ row }">
        <UuidDisplay :uuid="row.original.promptId" />
      </template>

      <template #toolNames-cell="{ row }">
        {{ row.original.toolNames.length ? row.original.toolNames.join(' · ') : '—' }}
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
