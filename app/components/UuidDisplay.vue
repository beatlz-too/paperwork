<script lang="ts" setup>
const props = defineProps<{ uuid: string }>()

const short = computed(() => {
  const first = props.uuid.split('-')[0]
  return first ? `${first}-…` : props.uuid
})

const copied = ref(false)

async function copy() {
  await navigator.clipboard.writeText(props.uuid)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <UTooltip :text="copied ? 'Copied!' : uuid">
    <UBadge
      color="neutral"
      variant="soft"
      class="font-mono text-xs cursor-pointer select-none"
      @click.stop="copy"
    >
      {{ short }}
    </UBadge>
  </UTooltip>
</template>
