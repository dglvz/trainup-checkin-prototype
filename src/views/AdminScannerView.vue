<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import CameraProblem from '../components/CameraProblem.vue'
import ManualCheckin from '../components/ManualCheckin.vue'
import PageHeader from '../components/PageHeader.vue'
import ResultOverlay from '../components/ResultOverlay.vue'
import TodayPanel from '../components/TodayPanel.vue'
import { checkIn, getDemoUser, listTodayCheckins } from '../api/mockApi.js'
import { useFeedback } from '../composables/useFeedback.js'
import { createScanner, scannerSupport } from '../scanner/createScanner.js'

const props = defineProps({
  adminId: { type: String, required: true },
})

const OVERLAY_MS = 2500
const SAME_CODE_IGNORE_MS = 5000

const admin = ref(null)
const loadError = ref('')
const tab = ref('scan') // 'scan' | 'manual' | 'today'

const videoEl = ref(null)
const scanner = shallowRef(null)
const camera = ref('idle') // 'idle' | 'starting' | 'running' | 'error'
const cameraError = ref('')
const wantsCamera = ref(false) // el usuario ya tocó "Iniciar escáner"
const hasFlash = ref(false)
const flashOn = ref(false)
const canSwitch = ref(false)
const facing = ref('environment')

const pending = ref(false)
const overlay = ref(null)
const today = ref(null)
const loadingToday = ref(false)
const apiError = ref('')

const feedback = useFeedback()
const gymId = computed(() => admin.value?.gym?.id ?? null)

let overlayTimer = null
let lastCode = ''
let lastCodeAt = 0

onMounted(async () => {
  const user = await getDemoUser(Number(props.adminId))
  if (!user || user.role !== 'admin') {
    loadError.value = 'Ese usuario no es un admin de demo.'
    return
  }
  admin.value = user
  refreshToday()
  const support = scannerSupport()
  if (!support.ok) {
    camera.value = 'error'
    cameraError.value = support.code
  }
})

onBeforeUnmount(() => {
  clearTimeout(overlayTimer)
  scanner.value?.destroy()
  scanner.value = null
})

// ── Cámara ────────────────────────────────────────────────────────────────

async function startCamera() {
  feedback.unlock() // iOS: el audio solo se habilita tras un toque
  wantsCamera.value = true
  camera.value = 'starting'
  cameraError.value = ''
  await nextTick()
  try {
    if (!scanner.value) {
      scanner.value = createScanner(videoEl.value, { onDecode: handleDecode })
    }
    await scanner.value.start()
    camera.value = 'running'
    hasFlash.value = await scanner.value.hasFlash()
    flashOn.value = false
    canSwitch.value = (await scanner.value.listCameras()).length > 1
  } catch (err) {
    camera.value = 'error'
    cameraError.value = err?.code ?? 'unknown'
  }
}

function stopCamera() {
  scanner.value?.stop()
  if (camera.value === 'running' || camera.value === 'starting') camera.value = 'idle'
  hasFlash.value = false
  flashOn.value = false
}

async function toggleFlash() {
  try {
    flashOn.value = await scanner.value.toggleFlash()
  } catch {
    hasFlash.value = false
  }
}

async function switchCamera() {
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  try {
    await scanner.value.setCamera(facing.value)
    flashOn.value = false
    hasFlash.value = await scanner.value.hasFlash()
  } catch {
    /* la cámara elegida no está disponible: se queda la actual */
  }
}

// Apagar la cámara fuera de la pestaña "Escanear" ahorra batería.
watch(tab, (t) => {
  if (t === 'scan') {
    if (wantsCamera.value && camera.value === 'idle') startCamera()
  } else {
    stopCamera()
  }
  if (t === 'today') refreshToday()
})

// ── Check-in ─────────────────────────────────────────────────────────────

function handleDecode(text) {
  if (pending.value || overlay.value) return
  const now = Date.now()
  // El mismo código frente a la cámara se ignora durante 5 s.
  if (text === lastCode && now - lastCodeAt < SAME_CODE_IGNORE_MS) return
  lastCode = text
  lastCodeAt = now
  scanner.value?.pause()
  submit({ method: 'qr', code: text })
}

function handleManual(userId) {
  feedback.unlock()
  submit({ method: 'manual', userId })
}

async function submit(payload) {
  pending.value = true
  apiError.value = ''
  try {
    const response = await checkIn({ gymId: gymId.value, scannerId: admin.value.id, ...payload })
    feedback.signal(response.result)
    overlay.value = response
    clearTimeout(overlayTimer)
    overlayTimer = setTimeout(dismissOverlay, OVERLAY_MS)
    refreshToday()
  } catch {
    apiError.value = 'No se pudo registrar el ingreso. Intenta de nuevo.'
    scanner.value?.resume()
  } finally {
    pending.value = false
  }
}

function dismissOverlay() {
  clearTimeout(overlayTimer)
  overlay.value = null
  if (tab.value === 'scan') scanner.value?.resume()
}

async function refreshToday() {
  if (!gymId.value) return
  loadingToday.value = true
  try {
    today.value = await listTodayCheckins(gymId.value)
  } finally {
    loadingToday.value = false
  }
}

function selectTab(t) {
  feedback.unlock()
  tab.value = t
}

const TABS = [
  { id: 'scan', label: 'Escanear', icon: 'scan' },
  { id: 'manual', label: 'Manual', icon: 'search' },
  { id: 'today', label: 'Hoy', icon: 'list' },
]
</script>

<template>
  <div class="min-h-screen">
    <p v-if="loadError" class="card m-4 text-brand-error">
      {{ loadError }}
      <RouterLink :to="{ name: 'admin' }" class="mt-4 block underline">Volver</RouterLink>
    </p>

    <template v-else>
      <!-- ── Escáner a pantalla completa ─────────────────────────────── -->
      <section v-show="tab === 'scan'" class="fixed inset-0 overflow-hidden bg-black">
        <video
          ref="videoEl"
          class="absolute inset-0 h-full w-full object-cover"
          :class="camera === 'running' ? 'opacity-100' : 'opacity-0'"
          playsinline
          muted
          disablepictureinpicture
        />

        <!-- Recuadro guía con máscara oscura alrededor -->
        <div v-if="camera === 'running'" class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="guide relative aspect-square w-[min(72vw,60vh,320px)] rounded-3xl">
            <span class="corner left-0 top-0 rounded-tl-3xl border-l-4 border-t-4" />
            <span class="corner right-0 top-0 rounded-tr-3xl border-r-4 border-t-4" />
            <span class="corner bottom-0 left-0 rounded-bl-3xl border-b-4 border-l-4" />
            <span class="corner bottom-0 right-0 rounded-br-3xl border-b-4 border-r-4" />
          </div>
        </div>

        <!-- Barra superior -->
        <div class="safe-top absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8">
          <RouterLink :to="{ name: 'admin' }" class="btn-icon" aria-label="Salir del escáner">
            <AppIcon name="back" />
          </RouterLink>
          <div class="min-w-0 flex-1">
            <p class="truncate font-heading font-bold text-white">{{ admin?.gym.name ?? '…' }}</p>
            <p class="truncate text-xs text-gray-300">{{ admin?.name }}</p>
          </div>
          <template v-if="camera === 'running'">
            <button
              v-if="hasFlash"
              type="button"
              class="btn-icon"
              :class="flashOn && '!bg-brand-accent !text-black'"
              :aria-pressed="flashOn"
              aria-label="Linterna"
              @click="toggleFlash"
            >
              <AppIcon name="bolt" />
            </button>
            <button v-if="canSwitch" type="button" class="btn-icon" aria-label="Cambiar cámara" @click="switchCamera">
              <AppIcon name="switch" />
            </button>
          </template>
        </div>

        <!-- Estado de la cámara -->
        <!-- m-auto (no items-center) para que un panel alto haga scroll sin cortarse arriba -->
        <div v-if="camera !== 'running'" class="absolute inset-0 flex overflow-y-auto pb-28 pt-24">
          <div v-if="camera === 'error'" class="m-auto w-full max-w-md">
            <CameraProblem :code="cameraError" @retry="startCamera" @manual="selectTab('manual')" />
          </div>
          <div v-else class="m-auto w-full max-w-md px-4 text-center">
            <span class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
              <AppIcon name="scan" :size="40" />
            </span>
            <h1 class="mt-5 text-2xl font-extrabold text-white">Escáner de ingresos</h1>
            <p class="mt-2 text-gray-400">Se pedirá permiso para usar la cámara trasera.</p>
            <button type="button" class="btn-primary mt-6 w-full text-lg" :disabled="camera === 'starting'" @click="startCamera">
              {{ camera === 'starting' ? 'Abriendo cámara…' : 'Iniciar escáner' }}
            </button>
          </div>
        </div>

        <p
          v-if="camera === 'running'"
          class="pointer-events-none absolute inset-x-0 bottom-28 text-center text-sm font-semibold text-white drop-shadow"
        >
          {{ pending ? 'Verificando…' : 'Apunta al QR del cliente' }}
        </p>
      </section>

      <!-- ── Manual / Hoy ──────────────────────────────────────────────── -->
      <div v-if="tab !== 'scan'" class="mx-auto max-w-md pb-32">
        <PageHeader
          :title="tab === 'manual' ? 'Registro manual' : 'Ingresos de hoy'"
          :subtitle="admin ? `${admin.gym.name} · ${admin.name}` : ''"
          :back="{ name: 'admin' }"
        />
        <ManualCheckin v-if="tab === 'manual' && gymId" :gym-id="gymId" :busy="pending" @checkin="handleManual" />
        <TodayPanel v-if="tab === 'today'" :data="today" :loading="loadingToday" @refresh="refreshToday" />
      </div>

      <p v-if="apiError" class="fixed inset-x-4 bottom-24 z-40 rounded-xl bg-[#93000a] p-3 text-center text-sm text-[#ffdad6]">
        {{ apiError }}
      </p>

      <!-- ── Pestañas ─────────────────────────────────────────────────── -->
      <nav class="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-brand-bg/95 backdrop-blur">
        <div class="mx-auto grid max-w-md grid-cols-3">
          <button
            v-for="t in TABS"
            :key="t.id"
            type="button"
            class="relative flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-semibold transition"
            :class="tab === t.id ? 'text-brand-accent' : 'text-gray-400'"
            :aria-current="tab === t.id ? 'page' : undefined"
            @click="selectTab(t.id)"
          >
            <AppIcon :name="t.icon" :size="22" />
            {{ t.label }}
            <span
              v-if="t.id === 'today' && today?.counts.unique_members"
              class="absolute right-[calc(50%-26px)] top-1.5 min-w-[18px] rounded-full bg-brand-accent px-1 text-[10px] font-bold leading-[18px] text-black"
            >
              {{ today.counts.unique_members }}
            </span>
          </button>
        </div>
      </nav>

      <ResultOverlay v-if="overlay" :key="overlay.checked_in_at" :response="overlay" :duration-ms="2500" @dismiss="dismissOverlay" />
    </template>
  </div>
</template>

<style scoped>
.guide {
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
}
.corner {
  @apply absolute h-10 w-10 border-brand-accent;
}
</style>
