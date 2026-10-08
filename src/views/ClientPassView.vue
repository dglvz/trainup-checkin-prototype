<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import DemoFooter from '../components/DemoFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import QrImage from '../components/QrImage.vue'
import { getClientQr } from '../api/mockApi.js'
import { useWakeLock } from '../composables/useWakeLock.js'
import { membershipLabel } from '../lib/format.js'
import { downloadQrPng } from '../lib/qr.js'

const props = defineProps({
  userId: { type: String, required: true },
})

const data = ref(null)
const error = ref('')
const downloading = ref(false)
const wakeLock = useWakeLock()

onMounted(async () => {
  try {
    data.value = await getClientQr(Number(props.userId))
  } catch {
    error.value = 'No encontramos a ese cliente de demo.'
  }
})

const statusClass = computed(() => {
  const m = data.value?.membership
  if (!m?.is_active) return 'bg-[#93000a] text-[#ffdad6]'
  if (m.days_left <= 3) return 'bg-amber-400 text-black'
  return 'bg-brand-accent text-black'
})

async function download() {
  downloading.value = true
  try {
    const slug = data.value.user.name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    await downloadQrPng(data.value.payload, `trainup-qr-${slug}.png`)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md">
    <PageHeader title="Mi pase" :back="{ name: 'client' }" />

    <main class="px-4">
      <p v-if="error" class="card text-brand-error">{{ error }}</p>

      <div v-else-if="!data" class="card animate-pulse">
        <div class="h-6 w-2/3 rounded bg-gray-800" />
        <div class="mx-auto mt-6 aspect-square w-full max-w-[296px] rounded-2xl bg-gray-800" />
      </div>

      <div v-else class="card px-4 text-center sm:px-6">
        <p class="font-heading text-2xl font-extrabold text-white">{{ data.user.name }}</p>
        <p class="mt-1 text-sm text-gray-400">{{ data.user.gym.name }} · {{ data.user.classification }}</p>
        <p class="mt-3">
          <span class="chip text-sm" :class="statusClass">{{ membershipLabel(data.membership) }}</span>
        </p>
        <p v-if="data.user.membership_status !== 'active'" class="mt-2 text-sm font-semibold text-brand-error">
          Tu cuenta está desactivada. Consulta en recepción.
        </p>

        <div class="mt-6">
          <QrImage :payload="data.payload" :size="280" :label="`Código QR de ${data.user.name}`" />
        </div>

        <p class="mt-4 text-sm text-gray-400">Muestra este código en la entrada. Sube el brillo si cuesta leerlo.</p>
        <p v-if="wakeLock.supported" class="mt-1 text-xs" :class="wakeLock.active.value ? 'text-brand-accent' : 'text-gray-500'">
          {{ wakeLock.active.value ? 'La pantalla se mantendrá encendida.' : 'No se pudo mantener la pantalla encendida.' }}
        </p>

        <button type="button" class="btn-secondary mt-6 w-full" :disabled="downloading" @click="download">
          <AppIcon name="download" :size="20" /> Descargar PNG
        </button>
      </div>
    </main>

    <DemoFooter />
  </div>
</template>
