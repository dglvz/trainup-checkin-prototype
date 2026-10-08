<script setup>
import { ref, watchEffect } from 'vue'
import { qrSvg } from '../lib/qr.js'

const props = defineProps({
  payload: { type: String, required: true },
  size: { type: Number, default: 280 },
  label: { type: String, default: 'Código QR' },
})

const svg = ref('')

watchEffect(async () => {
  svg.value = await qrSvg(props.payload)
})
</script>

<template>
  <!-- Recuadro blanco con margen: se lee bien aunque el fondo de la app sea oscuro. -->
  <div
    class="mx-auto aspect-square max-w-full rounded-2xl bg-white p-2 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
    :style="{ width: `${size + 16}px` }"
    role="img"
    :aria-label="label"
    v-html="svg"
  />
</template>
