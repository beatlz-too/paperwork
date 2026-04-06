<script lang="ts" setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Delicious+Handrawn&family=Lekton:ital,wght@0,400;0,700;1,400&display=swap' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Paperwork – Claude Code Sessions',
  description: 'Track Claude Code session token usage'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="text-lg tracking-tight logo"
        >
          <wacky-text
            :drift="3"
            :style="{
              fontSize: '1.75rem'
            }"
          >
            Paperwork
          </wacky-text>
        </NuxtLink>
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <UButton
            to="/about"
            variant="ghost"
            color="neutral"
            :ui="{ base: 'cursor-pointer' }"
          >
            About
          </UButton>
          <UColorModeButton :ui="{ base: 'cursor-pointer' }" />
        </div>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>

<style scoped>
.logo {
  font-family: 'Delicious Handrawn', cursive;
  font-size: 1.75rem;
}
</style>
