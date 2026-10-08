// Beep (Web Audio) y vibración según el resultado del check-in.
// iOS solo deja sonar el AudioContext si se crea/reanuda tras un toque:
// llamar a `unlock()` desde un handler de click.

let ctx = null

function audio() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!Ctx) return null
  if (!ctx) ctx = new Ctx()
  return ctx
}

const PATTERNS = {
  // [frecuencia Hz, duración s, pausa s, forma]
  granted: { tones: [[1046, 0.09], [1568, 0.14]], wave: 'sine', vibrate: [70] },
  duplicate: { tones: [[660, 0.12], [660, 0.12]], gap: 0.08, wave: 'triangle', vibrate: [60, 80, 60] },
  denied: { tones: [[220, 0.45]], wave: 'square', vibrate: [300] },
}

export function useFeedback() {
  function unlock() {
    const a = audio()
    if (a && a.state !== 'running') a.resume().catch(() => {})
  }

  function beep(result) {
    const a = audio()
    const p = PATTERNS[result] ?? PATTERNS.denied
    if (!a) return
    if (a.state !== 'running') a.resume().catch(() => {})
    let t = a.currentTime + 0.01
    for (const [freq, dur] of p.tones) {
      const osc = a.createOscillator()
      const gain = a.createGain()
      osc.type = p.wave
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(p.wave === 'square' ? 0.12 : 0.3, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain).connect(a.destination)
      osc.start(t)
      osc.stop(t + dur + 0.02)
      t += dur + (p.gap ?? 0.02)
    }
  }

  function vibrate(result) {
    const p = PATTERNS[result] ?? PATTERNS.denied
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(p.vibrate)
      } catch {
        /* algunos navegadores lo bloquean sin interacción previa */
      }
    }
  }

  function signal(result) {
    beep(result)
    vibrate(result)
  }

  return { unlock, beep, vibrate, signal }
}
