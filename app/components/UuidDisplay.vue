<script lang="ts" setup>
const props = defineProps<{ uuid: string }>()
const toast = useToast()

const short = computed(() => {
  const first = props.uuid.split('-')[0]
  return first ? `${first}-…` : props.uuid
})

async function copy() {
  await navigator.clipboard.writeText(props.uuid)
  toast.add({
    title: `Id ${props.uuid} copied to clipboard`
  })
}
</script>

<template>
  <UTooltip text="Copy">
    <UBadge
      color="neutral"
      variant="soft"
      class="font-mono text-xs cursor-pointer select-none inline-flex items-center gap-1.5"
      @click.stop="copy"
    >
      <UIcon
        name="i-lucide-copy"
        class="text-[0.7rem]"
      />
      {{ short }}
    </UBadge>
  </UTooltip>
</template>
