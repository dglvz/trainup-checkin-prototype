<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DemoFooter from '../components/DemoFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import QrImage from '../components/QrImage.vue'
import { getSettings, listTestCases, resetDemo, updateSettings } from '../api/mockApi.js'
import { REASON_SHORT, membershipLabel } from '../lib/format.js'

const debounce = ref(60)
const saved = ref(false)
const resetDone = ref(false)
const cases = ref([])
const enlarged = ref(null)

// Un QR cualquiera (no es un pase TrainUP) para probar `unknown_token`.
const FOREIGN_QR = {
  id: 'foreign',
  name: 'QR ajeno',
  payload: 'https://example.com/promo-octubre',
  demo_case: 'QR de otra cosa (una URL) → código no reconocido',
  expected: 'unknown_token',
}

onMounted(async () => {
  const [settings, list] = await Promise.all([getSettings(), listTestCases()])
  debounce.value = settings.debounceMinutes
  cases.value = list
})

const grouped = computed(() => {
  const groups = new Map()
  for (const c of cases.value) {
    if (!groups.has(c.gym.id)) groups.set(c.gym.id, { gym: c.gym, items: [] })
    groups.get(c.gym.id).items.push(c)
  }
  return [...groups.values()]
})

async function save() {
  const s = await updateSettings({ debounceMinutes: debounce.value })
  debounce.value = s.debounceMinutes
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}

async function reset() {
  if (!window.confirm('¿Borrar todos los ingresos y ajustes guardados en este navegador?')) return
  await resetDemo()
  debounce.value = (await getSettings()).debounceMinutes
  resetDone.value = true
  setTimeout(() => (resetDone.value = false), 2500)
}

const expectedLabel = (c) => (c.expected === 'granted' ? 'Permitido' : REASON_SHORT[c.expected])
const expectedClass = (c) => (c.expected === 'granted' ? 'bg-brand-accent text-black' : 'bg-[#93000a] text-[#ffdad6]')
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl">
    <PageHeader title="Ajustes" subtitle="Configuración de la demo" :back="{ name: 'home' }" />

    <main class="space-y-4 px-4">
      <form class="card" @submit.prevent="save">
        <label for="debounce" class="label">Ventana de antirrebote (minutos)</label>
        <p class="mb-3 text-sm text-gray-400">
          Si el mismo cliente vuelve a escanear dentro de esta ventana, se muestra «Ya registrado» y no cuenta otra
          asistencia.
        </p>
        <div class="flex gap-2">
          <input id="debounce" v-model.number="debounce" type="number" min="0" max="1440" step="1" inputmode="numeric" class="input" />
          <button type="submit" class="btn-primary shrink-0">{{ saved ? 'Guardado' : 'Guardar' }}</button>
        </div>
      </form>

      <div class="card">
        <h2 class="text-lg font-bold text-white">Reiniciar demo</h2>
        <p class="mt-1 text-sm text-gray-400">Borra los ingresos registrados y los ajustes guardados en este navegador.</p>
        <button type="button" class="btn-secondary mt-4 w-full border-brand-error/50 text-brand-error" @click="reset">
          <AppIcon name="refresh" :size="20" /> {{ resetDone ? 'Demo reiniciada' : 'Reiniciar demo' }}
        </button>
      </div>

      <section class="card px-4 sm:px-6">
        <h2 class="text-lg font-bold text-white">Casos de prueba</h2>
        <p class="mt-1 text-sm text-gray-400">
          Abre el escáner de <strong class="text-gray-200">Iron Gym</strong> en otro celular y escanea estos códigos. Toca un QR
          para agrandarlo. El resultado esperado es al escanear desde Iron Gym.
        </p>

        <div v-for="group in grouped" :key="group.gym.id" class="mt-6">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{{ group.gym.name }}</h3>
          <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <li v-for="c in group.items" :key="c.id" class="flex min-w-0 gap-3 rounded-2xl border border-gray-800 bg-brand-bg p-3">
              <button type="button" class="shrink-0" :aria-label="`Agrandar QR de ${c.name}`" @click="enlarged = c">
                <QrImage :payload="c.payload" :size="104" :label="`QR de ${c.name}`" />
              </button>
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold text-white">{{ c.name }}</p>
                <p class="text-xs text-gray-400">
                  {{ c.role === 'admin' ? 'Admin' : 'Cliente' }} ·
                  {{ c.role === 'admin' ? 'sin membresía' : membershipLabel(c.membership) }}
                </p>
                <p class="mt-1 text-xs leading-snug text-gray-300">{{ c.demo_case }}</p>
                <span class="chip mt-2" :class="expectedClass(c)">{{ expectedLabel(c) }}</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="mt-6">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Otros</h3>
          <div class="flex min-w-0 gap-3 rounded-2xl border border-gray-800 bg-brand-bg p-3">
            <button type="button" class="shrink-0" aria-label="Agrandar QR ajeno" @click="enlarged = FOREIGN_QR">
              <QrImage :payload="FOREIGN_QR.payload" :size="104" label="QR ajeno" />
            </button>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-white">{{ FOREIGN_QR.name }}</p>
              <p class="mt-1 text-xs leading-snug text-gray-300">{{ FOREIGN_QR.demo_case }}</p>
              <span class="chip mt-2" :class="expectedClass(FOREIGN_QR)">{{ expectedLabel(FOREIGN_QR) }}</span>
            </div>
          </div>
          <p class="mt-3 text-xs text-gray-500">
            Para probar «Ya registrado»: escanea dos veces a Valentina Rojas (espera más de 5 s entre lecturas).
          </p>
        </div>
      </section>
    </main>

    <DemoFooter />

    <div
      v-if="enlarged"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      @click="enlarged = null"
    >
      <p class="mb-4 font-heading text-xl font-bold text-white">{{ enlarged.name }}</p>
      <QrImage :payload="enlarged.payload" :size="300" :label="`QR de ${enlarged.name}`" />
      <p class="mt-3 max-w-xs break-all text-center font-mono text-[11px] text-gray-500">{{ enlarged.payload }}</p>
      <button type="button" class="btn-secondary mt-6">Cerrar</button>
    </div>
  </div>
</template>
