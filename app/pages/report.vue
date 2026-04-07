<script lang="ts" setup>
import type { AggregatedPrompt, Prompt, Session } from '#shared/types'
import type { TableJsonTableName } from '#shared/types/tables.interface'
import type { TableJsonColumn } from '#shared/utils/getTablePayload'
import { createTableReportPrompt } from '#shared/utils/report'
import { buildApiCallRows, buildPromptRows, buildProjectData } from '~/utils/tableRows'
import { apiCallColumns, projectColumns, promptColumns, sessionColumns } from '~/utils/tableColumns'
import { renderMarkdown } from '~/utils/renderMarkdown'

const route = useRoute()

const tableName = computed(() => route.query.table as TableJsonTableName | undefined)
const projectName = computed(() => typeof route.query.projectName === 'string' ? route.query.projectName : '')
const sessionId = computed(() => typeof route.query.sessionId === 'string' ? route.query.sessionId : '')
const promptId = computed(() => typeof route.query.promptId === 'string' ? route.query.promptId : '')

const sourceTitle = computed(() => {
  switch (tableName.value) {
    case 'sessions':
      return projectName.value ? `Sessions in ${projectName.value}` : 'All sessions'
    case 'projects':
      return 'Grouped projects'
    case 'prompts':
      return sessionId.value ? `Prompts for ${sessionId.value}` : 'Session prompts'
    case 'apiCalls':
      return promptId.value ? `API calls for ${promptId.value}` : 'Prompt API calls'
    default:
      return 'Report'
  }
})

useSeoMeta({
  title: computed(() => `${sourceTitle.value} report – Paperwork`)
})

const { data: reportMarkdown, status, error } = await useAsyncData(
  'report-markdown',
  async () => {
    switch (tableName.value) {
      case 'sessions': {
        const sessions = projectName.value
          ? await $fetch<Session[]>(`/api/projects/${encodeURIComponent(projectName.value)}/sessions`)
          : await $fetch<Session[]>('/api/sessions')
        return createTableReportPrompt('sessions', sessions, sessionColumns as unknown as readonly TableJsonColumn[])
      }

      case 'projects': {
        const sessions = await $fetch<Session[]>('/api/sessions')
        const rows = buildProjectData(sessions)
        return createTableReportPrompt('projects', rows, projectColumns as unknown as readonly TableJsonColumn[])
      }

      case 'prompts': {
        if (!sessionId.value) throw createError({ statusCode: 400, message: 'sessionId required' })
        const prompts = await $fetch<AggregatedPrompt[]>(`/api/sessions/${sessionId.value}/prompts`)
        const rows = buildPromptRows(prompts)
        return createTableReportPrompt('prompts', rows, promptColumns as unknown as readonly TableJsonColumn[])
      }

      case 'apiCalls': {
        if (!sessionId.value || !promptId.value) {
          throw createError({ statusCode: 400, message: 'sessionId and promptId required' })
        }
        const apiCalls = await $fetch<Prompt[]>(`/api/sessions/${sessionId.value}/prompts/${promptId.value}`)
        const rows = buildApiCallRows(apiCalls)
        return createTableReportPrompt('apiCalls', rows, apiCallColumns as unknown as readonly TableJsonColumn[])
      }

      default:
        throw createError({ statusCode: 400, message: 'table required' })
    }
  },
  {
    watch: [tableName, projectName, sessionId, promptId]
  }
)

const reportHtml = computed(() => renderMarkdown(reportMarkdown.value ?? ''))

const sourceHref = computed(() => {
  switch (tableName.value) {
    case 'sessions':
      return projectName.value ? `/projects/${encodeURIComponent(projectName.value)}` : '/'
    case 'projects':
      return '/'
    case 'prompts':
      return sessionId.value ? `/sessions/${sessionId.value}` : '/'
    case 'apiCalls':
      return sessionId.value && promptId.value ? `/sessions/${sessionId.value}/prompts/${promptId.value}` : '/'
    default:
      return '/'
  }
})
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">
          Report
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">
          {{ sourceTitle }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          Generated from the current table context and copied as plain markdown when needed.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ReportCopyButton
          :report-markdown="reportMarkdown ?? ''"
          :disabled="status === 'pending' || !reportMarkdown"
        />
        <UButton
          :to="sourceHref"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
        >
          Back
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Could not generate report"
      :description="error.message"
      class="mb-6"
    />

    <UCard>
      <template #header>
        <div>
          <h2 class="text-base font-semibold">
            Markdown preview
          </h2>
          <p class="text-sm text-muted">
            This is the exact markdown that will be copied to your clipboard.
          </p>
        </div>
      </template>

      <USkeleton
        v-if="status === 'pending'"
        class="h-[24rem] w-full"
      />

      <article
        v-else
        class="report-markdown space-y-4"
        v-html="reportHtml"
      />
    </UCard>
  </UContainer>
</template>
