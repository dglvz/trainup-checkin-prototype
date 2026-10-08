// Adaptador del escáner. Es el ÚNICO archivo que importa `qr-scanner`; para
// cambiarlo por el polyfill `barcode-detector` basta con reimplementar esta
// interfaz sin tocar las vistas:
//
//   createScanner(videoEl, { onDecode, onError }) → {
//     start, stop, pause, resume, hasFlash, toggleFlash, isFlashOn,
//     listCameras, setCamera, destroy
//   }
//
// `onDecode(text)` recibe el texto del QR. `start()` rechaza con un
// `ScannerError` cuyo `code` es uno de: insecure_context, unsupported,
// permission_denied, no_camera, camera_busy, unknown.

import QrScanner from 'qr-scanner'

export class ScannerError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.name = 'ScannerError'
    this.code = code
    this.cause = cause
  }
}

/** Comprobación previa, sin abrir la cámara. */
export function scannerSupport() {
  if (typeof window === 'undefined') return { ok: false, code: 'unsupported' }
  if (!window.isSecureContext) return { ok: false, code: 'insecure_context' }
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, code: 'unsupported' }
  return { ok: true, code: null }
}

export function createScanner(videoEl, { onDecode, onError } = {}) {
  let paused = false
  let flashOn = false

  const scanner = new QrScanner(
    videoEl,
    (result) => {
      if (paused) return
      onDecode?.(result.data)
    },
    {
      preferredCamera: 'environment',
      returnDetailedScanResult: true,
      maxScansPerSecond: 15,
      // Región cuadrada centrada (80 % del lado menor), algo más grande que el
      // recuadro guía de la vista para que el QR no quede fuera por poco.
      calculateScanRegion: (video) => {
        const size = Math.round(0.8 * Math.min(video.videoWidth, video.videoHeight))
        return {
          x: Math.round((video.videoWidth - size) / 2),
          y: Math.round((video.videoHeight - size) / 2),
          width: size,
          height: size,
          downScaledWidth: 480,
          downScaledHeight: 480,
        }
      },
      onDecodeError: (err) => {
        // qr-scanner informa "No QR code found" en cada cuadro sin código.
        if (err === QrScanner.NO_QR_CODE_FOUND || err?.message === QrScanner.NO_QR_CODE_FOUND) return
        onError?.(err)
      },
    },
  )

  return {
    async start() {
      const support = scannerSupport()
      if (!support.ok) throw new ScannerError(support.code, support.code)
      paused = false
      try {
        await scanner.start()
      } catch (err) {
        // qr-scanner convierte cualquier fallo de getUserMedia en
        // "Camera not found.", así que averiguamos el motivo real.
        throw new ScannerError(await diagnoseCameraError(), String(err?.message ?? err), err)
      }
    },

    stop() {
      paused = false
      flashOn = false
      scanner.stop()
    },

    // Pausa "suave": deja la cámara encendida e ignora lecturas, para que la
    // reanudación tras el overlay sea instantánea (sin volver a pedir el stream).
    pause() {
      paused = true
    },

    resume() {
      paused = false
    },

    isPaused: () => paused,

    async hasFlash() {
      try {
        return await scanner.hasFlash()
      } catch {
        return false
      }
    },

    async toggleFlash() {
      await scanner.toggleFlash()
      flashOn = scanner.isFlashOn()
      return flashOn
    },

    isFlashOn: () => flashOn,

    /** [{ id, label }] — las etiquetas solo están disponibles con permiso concedido. */
    async listCameras() {
      try {
        return await QrScanner.listCameras(true)
      } catch {
        return []
      }
    },

    /** `id` puede ser un deviceId o 'environment' / 'user'. */
    async setCamera(id) {
      flashOn = false
      await scanner.setCamera(id)
    },

    destroy() {
      scanner.destroy()
    },
  }
}

async function diagnoseCameraError() {
  const support = scannerSupport()
  if (!support.ok) return support.code
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    stream.getTracks().forEach((t) => t.stop())
    return 'unknown'
  } catch (e) {
    switch (e?.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
      case 'SecurityError':
        return 'permission_denied'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
      case 'OverconstrainedError':
        return 'no_camera'
      case 'NotReadableError':
      case 'TrackStartError':
      case 'AbortError':
        return 'camera_busy'
      default:
        return 'unknown'
    }
  }
}
