<template>
  <div
    :class="{ 'is-not-magic': props.magic }"
    class="wacky-container"
    :style="containerStyle"
  >
    <div
      class="wacky"
      :style="props.style"
    >
      <slot />
    </div>
    <div
      v-for="(color, key) in activeColors"
      :key="getBouncyKey(key.toString())"
      :ref="getBouncyKey(key.toString())"
      class="wacky"
      :style="getWackyStyle(color, key)"
    >
      {{ innerText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSlots, ref, computed, type CSSProperties } from 'vue'
import { ColorPalette } from '#shared/types/colors.enum'

const props = withDefaults(
  defineProps<{
    colors?: string[]
    drift?: number
    freq?: number
    style?: CSSProperties
    magic?: boolean
  }>(),
  {
    colors: () => Object.values(ColorPalette),
    drift: () => 6,
    freq: () => 400,
    magic: () => true
  }
)

const theme = computed(() => useColorMode().value)
const activeColors = computed(() => theme.value === 'light' ? [...props.colors].reverse() : props.colors)
const containerStyle = computed(() => ({
  minHeight: props.style?.fontSize
}))

const slots = useSlots()
const innerText = ref('')
const animationValues = ref<number[][]>(Object.values(ColorPalette).map(() => [0, 0]))

const vnode = slots.default?.()[0]

innerText.value = typeof vnode?.children === 'string' ? vnode.children : ''

const getBouncyKey = (key = '') => `${innerText.value.split(' ').join('_')}-${key}`

const getWackyStyle = (color: string, key: number) => ({
  ...props.style,
  color,
  margin: `${animationValues.value[key]![1]}px ${animationValues.value[key]![0]}px`
})

const getRandomInt = () => {
  const minCeiled = Math.ceil(-1 * props.drift)
  const maxFloored = Math.floor(props.drift)
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
}

const updateWordsValues = () => {
  for (const i in props.colors) {
    const left = getRandomInt()
    const top = getRandomInt()

    animationValues.value[i] = [left, top]

    setTimeout(() => {
      animationValues.value[i] = [0, 0]
    }, props.freq)
  }
}

onMounted(() => {
  setInterval(() => updateWordsValues(), 2 * props.freq)
})
</script>

<style scoped>
.wacky-container {
  display: block;
  position: relative;
  min-height: 5em;
}

.wacky-container.is-not-magic {
  cursor: pointer;
}

.wacky {
  display: block;
  position: absolute;
  font-family: 'Jersey 25', sans-serif;
  font-size: 5em;
  color: #f3f3f3;
  transition: margin 1s ease-out;
  line-height: 0.75em;
}
</style>
