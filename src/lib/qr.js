import QRCode from 'qrcode'

// Nivel Q (25 %): tolera reflejos y rayas en la pantalla del celular.
// margin 4 = zona de silencio estándar de 4 módulos.
const BASE = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#000000', light: '#ffffff' } }

export const qrSvg = (payload) => QRCode.toString(payload, { ...BASE, type: 'svg' })

export const qrDataUrl = (payload, width = 1024) => QRCode.toDataURL(payload, { ...BASE, width })

/** Descarga el QR como PNG. */
export async function downloadQrPng(payload, filename) {
  const blob = await (await fetch(await qrDataUrl(payload))).blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
