<script setup>
import AppIcon from './AppIcon.vue'
import { REASON_SHORT, RESULT_TEXT, formatLongDate, formatTime } from '../lib/format.js'

defineProps({
  data: { type: Object, default: null }, // { items, counts }
  loading: { type: Boolean, default: false },
})
defineEmits(['refresh'])

const BADGE = {
  granted: 'bg-brand-accent text-black',
  duplicate: 'bg-amber-400 text-black',
  denied: 'bg-[#93000a] text-[#ffdad6]',
}
</script>

<template>
  <section class="px-4">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-gray-400 first-letter:uppercase">{{ formatLongDate() }}</p>
      <button type="button" class="btn-ghost px-3 text-sm" :disabled="loading" @click="$emit('refresh')">
        <AppIcon name="refresh" :size="18" :class="loading && 'animate-spin'" /> Actualizar
      </button>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2">
      <div class="rounded-2xl border border-gray-800 bg-brand-surface p-4">
        <p class="text-3xl font-extrabold text-brand-accent">{{ data?.counts.unique_members ?? 0 }}</p>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Asistencias</p>
      </div>
      <div class="rounded-2xl border border-gray-800 bg-brand-surface p-4">
        <p class="text-3xl font-extrabold text-white">{{ data?.counts.granted ?? 0 }}</p>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Permitidos</p>
      </div>
      <div class="rounded-2xl border border-gray-800 bg-brand-surface p-4">
        <p class="text-3xl font-extrabold text-amber-400">{{ data?.counts.duplicate ?? 0 }}</p>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Duplicados</p>
      </div>
      <div class="rounded-2xl border border-gray-800 bg-brand-surface p-4">
        <p class="text-3xl font-extrabold text-brand-error">{{ data?.counts.denied ?? 0 }}</p>
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Rechazados</p>
      </div>
    </div>

    <ul v-if="data?.items.length" class="mt-4 divide-y divide-gray-800 rounded-2xl border border-gray-800 bg-brand-surface">
      <li v-for="row in data.items" :key="row.id" class="flex items-center gap-3 px-4 py-3">
        <span class="w-12 shrink-0 font-mono text-sm tabular-nums text-gray-300">{{ formatTime(row.checked_in_at) }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold text-white">
            {{ row.member?.name ?? 'Usuario de otro gimnasio' }}
          </span>
          <span class="block truncate text-xs text-gray-400">
            {{ row.method === 'manual' ? 'Manual' : 'QR' }}<template v-if="row.reason"> · {{ REASON_SHORT[row.reason] }}</template>
          </span>
        </span>
        <span class="chip shrink-0" :class="BADGE[row.result]">{{ RESULT_TEXT[row.result] }}</span>
      </li>
    </ul>
    <p v-else-if="!loading" class="mt-6 rounded-2xl border border-dashed border-gray-800 p-6 text-center text-sm text-gray-400">
      Todavía no hay ingresos hoy.
    </p>
  </section>
</template>
