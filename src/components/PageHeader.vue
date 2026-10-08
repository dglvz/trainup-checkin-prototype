<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  back: { type: [String, Object], default: null },
})
</script>

<template>
  <header class="safe-top flex items-center gap-2 px-4 pb-4">
    <RouterLink v-if="back" :to="back" class="btn-ghost -ml-3 px-3" aria-label="Volver">
      <AppIcon name="back" />
    </RouterLink>
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-xl font-extrabold text-white">{{ title }}</h1>
      <p v-if="subtitle" class="truncate text-sm text-gray-400">{{ subtitle }}</p>
    </div>
    <slot name="right" />
  </header>
</template>
