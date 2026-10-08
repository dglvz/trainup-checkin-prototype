// Formato de fechas y textos para la UI. Todo se muestra en America/Caracas.
import { APP_TIMEZONE } from '../domain/time.js'

const LOCALE = 'es-VE'

const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
})
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
})
const longDateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** "7:42" (24 h, sin cero inicial). */
export function formatTime(iso) {
  if (!iso) return ''
  const p = Object.fromEntries(timeFmt.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]))
  return `${Number(p.hour)}:${p.minute.padStart(2, '0')}`
}
/** "05/10" (dd/mm). Se arma a mano porque algunos locales ignoran '2-digit'. */
export function formatShortDate(iso) {
  if (!iso) return ''
  const p = Object.fromEntries(shortDateFmt.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]))
  return `${p.day.padStart(2, '0')}/${p.month.padStart(2, '0')}`
}
export const formatLongDate = (date = new Date()) => longDateFmt.format(date)

export function daysLeftText(days) {
  if (days == null) return ''
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  if (days > 1) return `Vence en ${days} días`
  return `Venció hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`
}

/** "Activa · vence en 12 días" / "Vencida el 05/10" */
export function membershipLabel(m) {
  if (!m || m.status === 'none') return 'Sin membresía'
  if (m.is_active) {
    if (m.days_left === 0) return 'Activa · vence hoy'
    if (m.days_left === 1) return 'Activa · vence mañana'
    return `Activa · vence en ${m.days_left} días`
  }
  if (m.status !== 'active') return 'Membresía inactiva'
  return `Vencida el ${formatShortDate(m.ends_at)}`
}

export const REASON_TEXT = {
  unknown_token: 'Código no reconocido. No es un pase de TrainUP válido.',
  not_member: 'Este pase no pertenece a este gimnasio.',
  not_client: 'Este usuario no es cliente: es personal del gimnasio.',
  user_inactive: 'Cuenta desactivada por el gimnasio. Debe pasar por recepción.',
  membership_expired: 'La membresía está vencida. Debe renovarla en recepción.',
}

export const RESULT_TEXT = {
  granted: 'Permitido',
  duplicate: 'Duplicado',
  denied: 'Rechazado',
}

export const REASON_SHORT = {
  unknown_token: 'Código desconocido',
  not_member: 'Otro gimnasio',
  not_client: 'No es cliente',
  user_inactive: 'Usuario desactivado',
  membership_expired: 'Membresía vencida',
}
