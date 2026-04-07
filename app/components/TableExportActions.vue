<script lang="ts" setup>
import type { TableJsonColumn } from '#shared/utils/getTablePayload'
import { createTableReportPrompt } from '#shared/utils/report'
import { getTablePayload } from '#shared/utils/getTablePayload'
import type { TableJsonTableName } from '#shared/types/tables.interface'

const props = defineProps<{
  tableName: TableJsonTableName
  rows: object[]
  columns: readonly unknown[]
  reportHref?: string
}>()

const toast = useToast()

const tableColumns = computed(() => props.columns as readonly TableJsonColumn[])

function getJsonPayload() {
  return getTablePayload(props.tableName, props.rows, tableColumns.value)
}

function getReportPrompt() {
  return createTableReportPrompt(props.tableName, props.rows, tableColumns.value)
}

async function copyTableJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(getJsonPayload(), null, 2))
    toast.add({ title: `Copied ${props.tableName} JSON to clipboard` })
  }
  catch {
    toast.add({ title: 'Could not copy table JSON', color: 'error' })
  }
}

async function copyReportPrompt() {
  try {
    await navigator.clipboard.writeText(getReportPrompt())
    toast.add({ title: `Copied ${props.tableName} report to clipboard` })
  }
  catch {
    toast.add({ title: 'Could not copy report prompt', color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <UButton
      icon="i-lucide-copy"
      variant="soft"
      color="neutral"
      :disabled="!rows.length"
      class="cursor-pointer"
      @click="copyTableJson"
    >
      Copy JSON
    </UButton>

    <UButton
      icon="i-lucide-file-text"
      variant="soft"
      color="neutral"
      :disabled="!rows.length"
      class="cursor-pointer"
      @click="copyReportPrompt"
    >
      Copy Report
    </UButton>

    <UButton
      v-if="reportHref"
      :to="reportHref"
      icon="i-lucide-external-link"
      variant="outline"
      color="neutral"
      class="cursor-pointer"
    >
      Generate report
    </UButton>
  </div>
</template>
