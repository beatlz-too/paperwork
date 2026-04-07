<script lang="ts" setup>
const props = defineProps<{
  reportMarkdown: string
  disabled?: boolean
}>()

const toast = useToast()

async function copyReport() {
  try {
    await navigator.clipboard.writeText(props.reportMarkdown)
    toast.add({ title: 'Copied report to clipboard' })
  }
  catch {
    toast.add({ title: 'Could not copy report', color: 'error' })
  }
}
</script>

<template>
  <UButton
    icon="i-lucide-copy"
    variant="soft"
    color="neutral"
    :disabled="disabled"
    class="cursor-pointer"
    @click="copyReport"
  >
    Copy Report
  </UButton>
</template>
