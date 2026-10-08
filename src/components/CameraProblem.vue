<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  code: { type: String, required: true },
})
const emit = defineEmits(['retry', 'manual'])

const COPY = {
  insecure_context: {
    title: 'La cámara necesita HTTPS',
    body: 'Los navegadores solo permiten usar la cámara en páginas seguras (https:// o localhost). Abre el enlace https:// de GitHub Pages o usa un túnel HTTPS.',
    retry: false,
  },
  unsupported: {
    title: 'Este navegador no permite usar la cámara',
    body: 'Abre la demo en Safari (iPhone) o Chrome (Android) actualizados. Mientras tanto puedes usar el registro manual.',
    retry: false,
  },
  permission_denied: {
    title: 'Permiso de cámara denegado',
    body: 'Habilita la cámara para este sitio y vuelve a intentarlo:',
    retry: true,
    steps: true,
  },
  no_camera: {
    title: 'No se encontró ninguna cámara',
    body: 'Este dispositivo no tiene una cámara disponible. Usa el registro manual por nombre o email.',
    retry: true,
  },
  camera_busy: {
    title: 'La cámara está en uso',
    body: 'Otra app o pestaña está usando la cámara. Ciérrala y vuelve a intentarlo.',
    retry: true,
  },
}

const copy = computed(
  () =>
    COPY[props.code] ?? {
      title: 'No se pudo iniciar la cámara',
      body: 'Vuelve a intentarlo o usa el registro manual.',
      retry: true,
    },
)
</script>

<template>
  <div class="card mx-4">
    <div class="flex items-start gap-3">
      <span class="mt-0.5 text-brand-error"><AppIcon name="alert" /></span>
      <div class="min-w-0">
        <h2 class="text-lg font-bold text-white">{{ copy.title }}</h2>
        <p class="mt-1 text-sm leading-relaxed text-gray-300">{{ copy.body }}</p>
      </div>
    </div>

    <div v-if="copy.steps" class="mt-5 space-y-4 text-sm leading-relaxed text-gray-300">
      <div>
        <h3 class="font-bold text-white">iPhone (Safari)</h3>
        <ol class="mt-1 list-decimal space-y-1 pl-5">
          <li>Toca <strong>aA</strong> en la barra de direcciones → <strong>Configuración del sitio web</strong>.</li>
          <li>En <strong>Cámara</strong>, elige <strong>Preguntar</strong> o <strong>Permitir</strong>.</li>
          <li>
            Si no aparece: <strong>Ajustes</strong> del iPhone → <strong>Apps</strong> → <strong>Safari</strong> →
            <strong>Cámara</strong> → <strong>Preguntar</strong>.
          </li>
          <li>Recarga la página y toca «Reintentar».</li>
        </ol>
      </div>
      <div>
        <h3 class="font-bold text-white">Android (Chrome)</h3>
        <ol class="mt-1 list-decimal space-y-1 pl-5">
          <li>Toca el ícono a la izquierda de la URL → <strong>Permisos</strong> (o «Configuración del sitio»).</li>
          <li>Activa <strong>Cámara</strong>.</li>
          <li>
            Si Chrome no tiene permiso del sistema: <strong>Ajustes</strong> → <strong>Apps</strong> →
            <strong>Chrome</strong> → <strong>Permisos</strong> → <strong>Cámara</strong>.
          </li>
          <li>Vuelve aquí y toca «Reintentar».</li>
        </ol>
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-2">
      <button v-if="copy.retry" type="button" class="btn-primary w-full" @click="emit('retry')">
        <AppIcon name="refresh" :size="20" /> Reintentar
      </button>
      <button type="button" class="btn-secondary w-full" @click="emit('manual')">
        <AppIcon name="search" :size="20" /> Usar registro manual
      </button>
    </div>
  </div>
</template>
