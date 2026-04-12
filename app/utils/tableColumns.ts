import type { TableColumn } from '@nuxt/ui'
import type { AggregatedPrompt, Prompt, ProjectSummary, Session } from '#shared/types'
import { sortableHeader } from './table'

export type PromptTableRow = AggregatedPrompt & { promptNumber: number }
export type ApiCallTableRow = Prompt & { callNumber: number }
export type FileContextTableRow = {
  filePath: string
  callNumber: number
  promptTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  responseTokens: number
  toolName: string
}

export const sessionColumns: TableColumn<Session>[] = [
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

export const projectColumns: TableColumn<ProjectSummary>[] = [
  { accessorKey: 'projectName', header: sortableHeader<ProjectSummary>('Project') },
  { accessorKey: 'sessionCount', header: sortableHeader<ProjectSummary>('Sessions') },
  { accessorKey: 'requestTokensTotal', header: sortableHeader<ProjectSummary>('Input Tokens') },
  { accessorKey: 'responseTokensTotal', header: sortableHeader<ProjectSummary>('Output Tokens') },
  { accessorKey: 'cacheReadTokensTotal', header: sortableHeader<ProjectSummary>('Cache Read') },
  { accessorKey: 'cacheCreationTokensTotal', header: sortableHeader<ProjectSummary>('Cache Write') },
  { accessorKey: 'createdAt', header: sortableHeader<ProjectSummary>('Created (UTC)') },
  { accessorKey: 'lastUsedAt', header: sortableHeader<ProjectSummary>('Last Used (UTC)') }
]

export const promptColumns: TableColumn<PromptTableRow>[] = [
  { accessorKey: 'promptNumber', header: sortableHeader<PromptTableRow>('Prompt #') },
  { accessorKey: 'promptId', header: sortableHeader<PromptTableRow>('Prompt ID') },
  { accessorKey: 'apiCalls', header: sortableHeader<PromptTableRow>('API Calls') },
  { accessorKey: 'toolNames', header: sortableHeader<PromptTableRow>('Tools') },
  { accessorKey: 'promptTokens', header: sortableHeader<PromptTableRow>('Input') },
  { accessorKey: 'responseTokens', header: sortableHeader<PromptTableRow>('Output') },
  { accessorKey: 'cacheReadTokens', header: sortableHeader<PromptTableRow>('Cache Read') },
  { accessorKey: 'cacheCreationTokens', header: sortableHeader<PromptTableRow>('Cache Write') }
]

export const apiCallColumns: TableColumn<ApiCallTableRow>[] = [
  { accessorKey: 'callNumber', header: sortableHeader<ApiCallTableRow>('Call #') },
  { accessorKey: 'createdAt', header: sortableHeader<ApiCallTableRow>('Time') },
  { accessorKey: 'toolName', header: sortableHeader<ApiCallTableRow>('Tool') },
  { accessorKey: 'promptTokens', header: sortableHeader<ApiCallTableRow>('Input') },
  { accessorKey: 'responseTokens', header: sortableHeader<ApiCallTableRow>('Output') },
  { accessorKey: 'cacheReadTokens', header: sortableHeader<ApiCallTableRow>('Cache Read') },
  { accessorKey: 'cacheCreationTokens', header: sortableHeader<ApiCallTableRow>('Cache Write') }
]

export const fileContextColumns: TableColumn<FileContextTableRow>[] = [
  { accessorKey: 'filePath', header: sortableHeader<FileContextTableRow>('File Path') },
  { accessorKey: 'toolName', header: sortableHeader<FileContextTableRow>('Tool') },
  { accessorKey: 'promptTokens', header: sortableHeader<FileContextTableRow>('Input') },
  { accessorKey: 'cacheReadTokens', header: sortableHeader<FileContextTableRow>('Cache Read') },
  { accessorKey: 'cacheCreationTokens', header: sortableHeader<FileContextTableRow>('Cache Write') }
]
