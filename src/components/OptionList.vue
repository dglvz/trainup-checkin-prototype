<script setup>
// Lista de opciones tipo "radio card", con área táctil grande.
defineProps({
  options: { type: Array, required: true }, // [{ value, title, subtitle?, badge? }]
  name: { type: String, required: true },
  legend: { type: String, default: '' },
})
const model = defineModel({ type: [String, Number, null], default: null })
</script>

<template>
  <!-- min-w-0: un fieldset tiene min-width: min-content y no deja truncar los textos largos -->
  <fieldset class="min-w-0">
    <legend v-if="legend" class="label">{{ legend }}</legend>
    <div class="space-y-2">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition"
        :class="model === opt.value ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-800 bg-brand-bg hover:border-gray-600'"
      >
        <input v-model="model" type="radio" :name="name" :value="opt.value" class="sr-only" />
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
          :class="model === opt.value ? 'border-brand-accent' : 'border-gray-600'"
        >
          <span v-if="model === opt.value" class="h-2.5 w-2.5 rounded-full bg-brand-accent" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold text-white">{{ opt.title }}</span>
          <span v-if="opt.subtitle" class="block truncate text-sm text-gray-400">{{ opt.subtitle }}</span>
        </span>
        <span v-if="opt.badge" class="chip shrink-0 bg-gray-800 text-gray-300">{{ opt.badge }}</span>
      </label>
    </div>
  </fieldset>
</template>
