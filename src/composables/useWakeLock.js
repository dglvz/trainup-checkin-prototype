import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Mantiene la pantalla encendida con Screen Wake Lock, si el navegador lo soporta. */
export function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const active = ref(false)
  let sentinel = null

  async function request() {
    if (!supported || document.visibilityState !== 'visible') return
    try {
      sentinel = await navigator.wakeLock.request('screen')
      active.value = true
      sentinel.addEventListener('release', () => {
        active.value = false
      })
    } catch {
      active.value = false
    }
  }

  // El navegador libera el lock al ocultar la pestaña: se vuelve a pedir.
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && !active.value) request()
  }

  onMounted(() => {
    request()
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    sentinel?.release().catch(() => {})
    sentinel = null
  })

  return { supported, active }
}
