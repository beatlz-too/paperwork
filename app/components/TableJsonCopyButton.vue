<script lang="ts" setup>
import { getTablePayload, type TableJsonColumn } from '#shared/utils/getTablePayload'
import type { TableJsonTableName } from '#shared/types/tables.interface'

const props = defineProps<{
  tableName: TableJsonTableName
  rows: object[]
  columns: readonly unknown[]
}>()

const toast = useToast()

async function copyTableJson() {
  const payload = getTablePayload(
    props.tableName,
    props.rows,
    props.columns as readonly TableJsonColumn[]
  )

  try {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    toast.add({
      title: `Copied ${props.tableName} JSON to clipboard`
    })
  }
  catch {
    toast.add({
      title: 'Could not copy table JSON',
      color: 'error'
    })
  }
}
</script>

<template>
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
</template>
