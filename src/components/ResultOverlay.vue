<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'
import { REASON_TEXT, daysLeftText, formatShortDate, formatTime } from '../lib/format.js'

const props = defineProps({
  response: { type: Object, required: true },
  durationMs: { type: Number, default: 2500 },
})
const emit = defineEmits(['dismiss'])

const ui = computed(() => {
  const r = props.response
  if (r.result === 'granted')
    return { bg: 'bg-brand-accent text-black', icon: 'check', title: 'Acceso permitido', ring: 'bg-black text-brand-accent' }
  if (r.result === 'duplicate')
    return { bg: 'bg-amber-400 text-black', icon: 'clock', title: 'Ingreso duplicado', ring: 'bg-black text-amber-400' }
  return { bg: 'bg-[#93000a] text-[#ffdad6]', icon: 'x', title: 'Acceso denegado', ring: 'bg-brand-error text-[#690005]' }
})

const detail = computed(() => {
  const r = props.response
  if (r.result === 'granted') return daysLeftText(r.days_left)
  if (r.result === 'duplicate') return `Ya registrado a las ${formatTime(r.first_checkin_at)}`
  if (r.reason === 'membership_expired' && r.membership_ends_at)
    return `Membresía vencida el ${formatShortDate(r.membership_ends_at)}. Debe renovarla en recepción.`
  return REASON_TEXT[r.reason] ?? 'Acceso denegado.'
})

const onKey = (e) => {
  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') emit('dismiss')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex cursor-pointer select-none flex-col items-center justify-center px-6 text-center"
    :class="ui.bg"
    role="alertdialog"
    aria-live="assertive"
    :aria-label="`${ui.title}. ${detail}`"
    @click="emit('dismiss')"
  >
    <div class="flex h-24 w-24 items-center justify-center rounded-full" :class="ui.ring">
      <AppIcon :name="ui.icon" :size="56" :stroke="3" />
    </div>
    <h2 class="mt-6 text-3xl font-extrabold uppercase tracking-tight">{{ ui.title }}</h2>

    <div v-if="response.member" class="mt-8 flex flex-col items-center">
      <div class="flex h-20 w-20 items-center justify-center rounded-full bg-black/15 font-heading text-3xl font-extrabold">
        {{ response.member.initials }}
      </div>
      <p class="mt-3 font-heading text-2xl font-bold leading-tight">{{ response.member.name }}</p>
      <p v-if="response.member.classification" class="mt-1 text-base font-semibold opacity-80">
        {{ response.member.classification }}
      </p>
    </div>

    <p class="mt-6 max-w-sm text-xl font-semibold leading-snug">{{ detail }}</p>

    <div class="safe-bottom absolute inset-x-0 bottom-0 px-6 pb-6">
      <p class="mb-3 text-sm font-semibold opacity-70">Toca para continuar</p>
      <div class="h-1.5 overflow-hidden rounded-full bg-black/20">
        <div class="countdown h-full rounded-full bg-current opacity-60" :style="{ animationDuration: `${durationMs}ms` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.countdown {
  animation-name: shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  transform-origin: left;
}
@keyframes shrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
