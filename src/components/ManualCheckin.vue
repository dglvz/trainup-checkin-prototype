<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { searchMembers } from '../api/mockApi.js'
import { membershipLabel } from '../lib/format.js'

const props = defineProps({
  gymId: { type: Number, required: true },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['checkin'])

const query = ref('')
const results = ref([])
const searching = ref(false)
let timer = null
let seq = 0

watch(query, (q) => {
  clearTimeout(timer)
  if (q.trim().length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    const mine = ++seq
    const found = await searchMembers(props.gymId, q)
    if (mine === seq) {
      results.value = found
      searching.value = false
    }
  }, 250)
})

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section class="px-4">
    <label for="manual-search" class="label">Buscar cliente por nombre o email</label>
    <div class="relative">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
        <AppIcon name="search" :size="20" />
      </span>
      <input
        id="manual-search"
        v-model="query"
        type="search"
        inputmode="search"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Ej.: Valentina o andres.perez@"
        class="input pl-12"
      />
    </div>
    <p class="mt-2 text-xs text-gray-500">Respaldo para cuando el QR no se puede leer. Aplica las mismas reglas.</p>

    <ul v-if="results.length" class="mt-4 space-y-2">
      <li
        v-for="m in results"
        :key="m.id"
        class="flex items-center gap-3 rounded-2xl border border-gray-800 bg-brand-surface p-4"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-800 font-heading font-bold text-white">
          {{ m.initials }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold text-white">{{ m.name }}</span>
          <span class="block truncate text-xs text-gray-400">{{ m.email }}</span>
          <span class="block text-xs" :class="m.membership.is_active ? 'text-gray-300' : 'text-brand-error'">
            {{ m.membership_status === 'active' ? membershipLabel(m.membership) : 'Usuario desactivado' }}
          </span>
        </span>
        <button type="button" class="btn-primary shrink-0 px-4 text-sm" :disabled="busy" @click="emit('checkin', m.id)">
          Registrar
        </button>
      </li>
    </ul>
    <p v-else-if="query.trim().length >= 2 && !searching" class="mt-6 text-center text-sm text-gray-400">
      Sin resultados en este gimnasio.
    </p>
  </section>
</template>
