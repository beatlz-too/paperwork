export interface Session {
  id: string
  sessionId: string
  name: string
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
  promptTokens: number
  responseTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  createdAt: string
}

export type UsageChartPage = 'main' | 'session' | 'prompt'

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
