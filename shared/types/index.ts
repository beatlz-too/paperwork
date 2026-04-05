export interface Session {
  id: string
  sessionId: string
  name: string
  projectName: string | null
  requestTokensTotal: number
  responseTokensTotal: number
  cacheReadTokensTotal: number
  cacheCreationTokensTotal: number
  createdAt: string
  lastUsedAt: string
}

export interface ProjectSummary {
  projectName: string
  sessionCount: number
  requestTokensTotal: number
  responseTokensTotal: number
  cacheReadTokensTotal: number
  cacheCreationTokensTotal: number
  createdAt: string
  lastUsedAt: string
}

export interface Prompt {
  id: string
  sessionId: string
  prompt: string
  toolName: string
  promptTokens: number
  requestTokens: number
  responseTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  createdAt: string
}

export interface AggregatedPrompt {
  promptId: string
  apiCalls: number
  toolNames: string[]
  promptTokens: number
  responseTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  createdAt: string
}

export type UsageChartPage = 'main' | 'session' | 'prompt'
export type UsageChartKind = 'stacked' | 'breakdown'
export type UsageChartDimension = 'session' | 'project'

export interface UsageChartWeights {
  prompt: number
  response: number
  cacheRead: number
  cacheCreation: number
}

export interface UsageChartDataset {
  label: string
  data: number[]
  borderColor: string
  backgroundColor: string
  stack: string
  borderWidth: number
  borderRadius: number
  borderSkipped: false
}

export interface UsageChartResponse {
  page: UsageChartPage
  labels: string[]
  datasets: UsageChartDataset[]
  weights: UsageChartWeights
}

export interface BreakdownChartDataset {
  label: string
  data: number[]
  borderColor: string[]
  backgroundColor: string[]
  borderWidth: number
  borderRadius: number
  borderSkipped: false
}

export interface BreakdownChartResponse {
  page: UsageChartPage
  labels: string[]
  datasets: BreakdownChartDataset[]
  weights: UsageChartWeights
}
