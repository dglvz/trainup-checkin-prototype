// Lógica de check-in pura: sin DOM, sin localStorage, sin red.
// Recibe el estado (usuarios, asistencias, ahora) y devuelve la respuesta y,
// si corresponde, el registro a guardar. Es lo que se porta a un
// `CheckInService` en PHP (ver README → "Cómo portarlo a TrainUP").

import { APP_TIMEZONE, calendarDaysBetween, endOfZonedDay, zonedDayKey } from './time.js'

export const QR_VERSION_PREFIX = 'TU1.'
export const TOKEN_PATTERN = /^[A-Za-z0-9]{40}$/
export const DEFAULT_DEBOUNCE_MINUTES = 60

export const RESULTS = Object.freeze({
  GRANTED: 'granted',
  DENIED: 'denied',
  DUPLICATE: 'duplicate',
})

export const REASONS = Object.freeze({
  UNKNOWN_TOKEN: 'unknown_token',
  NOT_MEMBER: 'not_member',
  NOT_CLIENT: 'not_client',
  USER_INACTIVE: 'user_inactive',
  MEMBERSHIP_EXPIRED: 'membership_expired',
})

// ── Formato del QR ────────────────────────────────────────────────────────

/** Contenido del QR: exactamente `TU1.{checkin_token}`. Nunca una URL ni el id. */
export function buildQrPayload(token) {
  if (!TOKEN_PATTERN.test(token ?? '')) throw new Error('checkin_token inválido')
  return QR_VERSION_PREFIX + token
}

/** Devuelve el token si `text` tiene el formato `TU1.{40 alfanuméricos}`; si no, null. */
export function parseQrPayload(text) {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (!trimmed.startsWith(QR_VERSION_PREFIX)) return null
  const token = trimmed.slice(QR_VERSION_PREFIX.length)
  return TOKEN_PATTERN.test(token) ? token : null
}

// ── Usuarios y membresías ────────────────────────────────────────────────

/**
 * Convierte un usuario del seed (`membership.ends_in_days`) en uno con
 * `membership.ends_at` real: fin del día `hoy + ends_in_days` en Caracas.
 */
export function materializeUser(seedUser, now, timeZone = APP_TIMEZONE) {
  const { membership, ...rest } = seedUser
  return {
    ...rest,
    membership: membership
      ? {
          status: membership.status,
          ends_at: endOfZonedDay(now, membership.ends_in_days, timeZone).toISOString(),
        }
      : null,
  }
}

export function isMembershipActive(membership, now) {
  if (!membership || membership.status !== 'active' || !membership.ends_at) return false
  return Date.parse(membership.ends_at) > new Date(now).getTime()
}

export function membershipSummary(membership, now, timeZone = APP_TIMEZONE) {
  if (!membership) return { status: 'none', ends_at: null, days_left: null, is_active: false }
  return {
    status: membership.status,
    ends_at: membership.ends_at,
    days_left: membership.ends_at ? calendarDaysBetween(now, membership.ends_at, timeZone) : null,
    is_active: isMembershipActive(membership, now),
  }
}

export function initials(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function publicMember(user) {
  return {
    id: user.id,
    name: user.name,
    initials: initials(user.name),
    classification: user.classification ?? null,
  }
}

// ── Check-in ──────────────────────────────────────────────────────────────

/**
 * Evalúa un intento de check-in.
 *
 * @param {object}   p
 * @param {number}   p.gymId            Gimnasio donde se escanea.
 * @param {string}   [p.code]           Texto leído del QR (method 'qr').
 * @param {number}   [p.userId]         Usuario elegido en el buscador (method 'manual').
 * @param {number}   p.scannerId        Admin que registra el ingreso.
 * @param {'qr'|'manual'} p.method
 * @param {object[]} p.users            Usuarios materializados (con `membership.ends_at`).
 * @param {object[]} p.attendances      Registros previos.
 * @param {Date}     p.now
 * @param {number}   [p.debounceMinutes]
 * @param {() => string} [p.newId]      Generador de id para el registro.
 * @returns {{ response: object, record: object|null }}
 */
export function evaluateCheckIn({
  gymId,
  code,
  userId,
  scannerId,
  method = 'qr',
  users,
  attendances,
  now,
  debounceMinutes = DEFAULT_DEBOUNCE_MINUTES,
  timeZone = APP_TIMEZONE,
  newId = defaultId,
}) {
  const nowDate = new Date(now)
  const checkedInAt = nowDate.toISOString()

  const respond = (result, reason, user, extra = {}) => {
    const summary = user ? membershipSummary(user.membership, nowDate, timeZone) : null
    return {
      result,
      reason,
      member: user ? publicMember(user) : null,
      membership_ends_at: summary?.ends_at ?? null,
      days_left: summary?.days_left ?? null,
      checked_in_at: checkedInAt,
      first_checkin_at: null,
      ...extra,
    }
  }

  const record = (user, response, recordUserId = user?.id ?? null) => ({
    id: newId(),
    gym_id: gymId,
    user_id: recordUserId,
    scanned_by: scannerId ?? null,
    checked_in_at: checkedInAt,
    result: response.result,
    reason: response.reason,
    method,
    membership_ends_at: response.membership_ends_at,
  })

  // 1. Formato inválido o token inexistente → no se registra.
  let user = null
  if (method === 'manual') {
    user = users.find((u) => u.id === Number(userId)) ?? null
  } else {
    const token = parseQrPayload(code)
    user = token ? (users.find((u) => u.checkin_token === token) ?? null) : null
  }
  if (!user) {
    return { response: respond(RESULTS.DENIED, REASONS.UNKNOWN_TOKEN, null), record: null }
  }

  // 2. Usuario de otro gimnasio → no revelar nada de ese gimnasio.
  //    El registro no guarda el user_id ajeno: la tabla `attendances` es por
  //    gimnasio y no debe apuntar a usuarios de otro tenant.
  if (user.gym_id !== gymId) {
    const response = respond(RESULTS.DENIED, REASONS.NOT_MEMBER, null)
    return { response, record: record(null, response, null) }
  }

  // 3. Solo clientes.
  if (user.role !== 'client') {
    const response = respond(RESULTS.DENIED, REASONS.NOT_CLIENT, user)
    return { response, record: record(user, response) }
  }

  // 4. Desactivado por el admin.
  if (user.membership_status !== 'active') {
    const response = respond(RESULTS.DENIED, REASONS.USER_INACTIVE, user)
    return { response, record: record(user, response) }
  }

  // 5. Membresía no activa o vencida.
  if (!isMembershipActive(user.membership, nowDate)) {
    const response = respond(RESULTS.DENIED, REASONS.MEMBERSHIP_EXPIRED, user)
    return { response, record: record(user, response) }
  }

  // 6. Antirrebote: ya hubo un `granted` dentro de la ventana.
  const windowStart = nowDate.getTime() - Math.max(0, Number(debounceMinutes) || 0) * 60_000
  const previous = attendances
    .filter(
      (a) =>
        a.gym_id === gymId &&
        a.user_id === user.id &&
        a.result === RESULTS.GRANTED &&
        Date.parse(a.checked_in_at) > windowStart &&
        Date.parse(a.checked_in_at) <= nowDate.getTime(),
    )
    .sort((a, b) => Date.parse(b.checked_in_at) - Date.parse(a.checked_in_at))[0]
  if (previous) {
    const response = respond(RESULTS.DUPLICATE, null, user, {
      first_checkin_at: previous.checked_in_at,
    })
    return { response, record: record(user, response) }
  }

  // 7. Acceso permitido.
  const response = respond(RESULTS.GRANTED, null, user)
  return { response, record: record(user, response) }
}

/** Registros del gimnasio cuyo `checked_in_at` cae "hoy" en la zona del gimnasio. */
export function filterToday(attendances, gymId, now, timeZone = APP_TIMEZONE) {
  const today = zonedDayKey(now, timeZone)
  return attendances
    .filter((a) => a.gym_id === gymId && zonedDayKey(a.checked_in_at, timeZone) === today)
    .sort((a, b) => Date.parse(b.checked_in_at) - Date.parse(a.checked_in_at))
}

export function countByResult(attendances) {
  const counts = { granted: 0, denied: 0, duplicate: 0, total: attendances.length, unique_members: 0 }
  const granted = new Set()
  for (const a of attendances) {
    counts[a.result] = (counts[a.result] ?? 0) + 1
    if (a.result === RESULTS.GRANTED) granted.add(a.user_id)
  }
  counts.unique_members = granted.size
  return counts
}

let seq = 0
function defaultId() {
  seq += 1
  return `att_${Date.now().toString(36)}_${seq.toString(36)}`
}
