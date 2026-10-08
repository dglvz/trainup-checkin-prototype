import { describe, expect, it } from 'vitest'
import { GYMS, USERS } from '../src/data/seed.js'
import {
  buildQrPayload,
  countByResult,
  evaluateCheckIn,
  filterToday,
  initials,
  materializeUser,
  parseQrPayload,
} from '../src/domain/checkin.js'
import { calendarDaysBetween, endOfZonedDay, zonedDayKey } from '../src/domain/time.js'

// 2026-10-08 10:00 en Caracas (UTC-4) = 14:00Z
const NOW = new Date('2026-10-08T14:00:00Z')
const IRON = GYMS.find((g) => g.slug === 'iron-gym').id
const CROSS = GYMS.find((g) => g.slug === 'crossbox').id
const ADMIN_IRON = 105

const users = USERS.map((u) => materializeUser(u, NOW))
const byName = (name) => USERS.find((u) => u.name === name)
const qrOf = (name) => buildQrPayload(byName(name).checkin_token)

function run(overrides = {}) {
  let n = 0
  return evaluateCheckIn({
    gymId: IRON,
    scannerId: ADMIN_IRON,
    method: 'qr',
    users,
    attendances: [],
    now: NOW,
    newId: () => `t${++n}`,
    ...overrides,
  })
}

describe('seed', () => {
  it('tiene tokens fijos de 40 alfanuméricos y únicos', () => {
    const tokens = USERS.map((u) => u.checkin_token)
    tokens.forEach((t) => expect(t).toMatch(/^[A-Za-z0-9]{40}$/))
    expect(new Set(tokens).size).toBe(tokens.length)
  })

  it('solo usa correos @example.com', () => {
    USERS.forEach((u) => expect(u.email).toMatch(/@example\.com$/))
  })
})

describe('formato del QR', () => {
  const token = byName('Valentina Rojas').checkin_token

  it('genera exactamente TU1.{token}', () => {
    expect(buildQrPayload(token)).toBe(`TU1.${token}`)
  })

  it('acepta solo el formato versionado', () => {
    expect(parseQrPayload(`TU1.${token}`)).toBe(token)
    expect(parseQrPayload(` TU1.${token}\n`)).toBe(token)
  })

  it.each([
    ['URL', `https://example.com/checkin/${token}`],
    ['token sin prefijo', token],
    ['otra versión', `TU2.${token}`],
    ['token corto', 'TU1.abc123'],
    ['caracteres no alfanuméricos', `TU1.${token.slice(0, 39)}-`],
    ['token largo', `TU1.${token}x`],
    ['texto cualquiera', 'Hola mundo'],
    ['vacío', ''],
    ['null', null],
  ])('rechaza %s', (_label, text) => {
    expect(parseQrPayload(text)).toBeNull()
  })
})

describe('evaluateCheckIn: reglas en orden', () => {
  it('1. formato inválido → denied/unknown_token y no registra', () => {
    const { response, record } = run({ code: 'https://example.com/qr/123' })
    expect(response).toMatchObject({ result: 'denied', reason: 'unknown_token', member: null })
    expect(record).toBeNull()
  })

  it('1. token con formato válido pero inexistente → unknown_token y no registra', () => {
    const { response, record } = run({ code: 'TU1.' + 'A'.repeat(40) })
    expect(response.reason).toBe('unknown_token')
    expect(record).toBeNull()
  })

  it('2. cliente de otro gimnasio → not_member sin revelar datos', () => {
    const { response, record } = run({ code: qrOf('Gabriel Suárez') })
    expect(response).toMatchObject({
      result: 'denied',
      reason: 'not_member',
      member: null,
      membership_ends_at: null,
      days_left: null,
    })
    expect(record).toMatchObject({ gym_id: IRON, user_id: null, result: 'denied', reason: 'not_member' })
  })

  it('2. admin de otro gimnasio → not_member (antes que not_client)', () => {
    const { response } = run({ code: qrOf('Paula Ortega') })
    expect(response.reason).toBe('not_member')
    expect(response.member).toBeNull()
  })

  it('3. admin del mismo gimnasio → not_client', () => {
    const { response, record } = run({ code: qrOf('Mariana Torres') })
    expect(response).toMatchObject({ result: 'denied', reason: 'not_client' })
    expect(response.member).toMatchObject({ id: 105, initials: 'MT' })
    expect(record.reason).toBe('not_client')
  })

  it('4. usuario desactivado (aunque la membresía tenga fecha futura) → user_inactive', () => {
    const { response } = run({ code: qrOf('Luis Herrera') })
    expect(response).toMatchObject({ result: 'denied', reason: 'user_inactive' })
    expect(response.days_left).toBe(45)
  })

  it('5. membresía vencida hace 3 días → membership_expired', () => {
    const { response, record } = run({ code: qrOf('Camila Méndez') })
    expect(response).toMatchObject({ result: 'denied', reason: 'membership_expired', days_left: -3 })
    expect(record.membership_ends_at).toBe(response.membership_ends_at)
  })

  it('5. membresía con status inactive aunque la fecha sea futura → membership_expired', () => {
    const custom = users.map((u) =>
      u.id === 101 ? { ...u, membership: { ...u.membership, status: 'inactive' } } : u,
    )
    const { response } = run({ code: qrOf('Valentina Rojas'), users: custom })
    expect(response.reason).toBe('membership_expired')
  })

  it('7. cliente activo con ~20 días → granted', () => {
    const { response, record } = run({ code: qrOf('Valentina Rojas') })
    expect(response).toMatchObject({
      result: 'granted',
      reason: null,
      member: { id: 101, name: 'Valentina Rojas', initials: 'VR', classification: 'Avanzado' },
      days_left: 20,
      checked_in_at: NOW.toISOString(),
      first_checkin_at: null,
    })
    expect(record).toEqual({
      id: 't1',
      gym_id: IRON,
      user_id: 101,
      scanned_by: ADMIN_IRON,
      checked_in_at: NOW.toISOString(),
      result: 'granted',
      reason: null,
      method: 'qr',
      membership_ends_at: response.membership_ends_at,
    })
  })

  it('7. vence hoy más tarde → granted con days_left 0', () => {
    const { response } = run({ code: qrOf('Andrés Pérez') })
    expect(response).toMatchObject({ result: 'granted', days_left: 0 })
  })

  it('vence hoy: a las 23:59 aún entra; al día siguiente ya no', () => {
    const lateNight = new Date('2026-10-09T03:59:00Z') // 23:59 en Caracas
    const nextDay = new Date('2026-10-09T04:00:01Z') // 00:00:01 en Caracas
    const code = qrOf('Andrés Pérez')
    expect(run({ code, now: lateNight }).response.result).toBe('granted')
    expect(run({ code, now: nextDay }).response.reason).toBe('membership_expired')
  })

  it('manual: usa userId y registra method manual', () => {
    const { response, record } = run({ method: 'manual', userId: 101 })
    expect(response.result).toBe('granted')
    expect(record.method).toBe('manual')
  })

  it('manual: usuario inexistente → unknown_token', () => {
    const { response, record } = run({ method: 'manual', userId: 9999 })
    expect(response.reason).toBe('unknown_token')
    expect(record).toBeNull()
  })
})

describe('evaluateCheckIn: antirrebote', () => {
  const first = run({ code: qrOf('Valentina Rojas') }).record

  it('6. segundo escaneo dentro de la ventana → duplicate con hora del primero', () => {
    const later = new Date(NOW.getTime() + 10 * 60_000)
    const { response, record } = run({ code: qrOf('Valentina Rojas'), attendances: [first], now: later })
    expect(response).toMatchObject({
      result: 'duplicate',
      reason: null,
      first_checkin_at: first.checked_in_at,
    })
    expect(response.member.id).toBe(101)
    expect(record.result).toBe('duplicate')
  })

  it('un duplicate no reinicia la ventana ni cuenta como asistencia', () => {
    const t10 = new Date(NOW.getTime() + 10 * 60_000)
    const dup = run({ code: qrOf('Valentina Rojas'), attendances: [first], now: t10 }).record
    const t65 = new Date(NOW.getTime() + 65 * 60_000)
    const { response } = run({ code: qrOf('Valentina Rojas'), attendances: [first, dup], now: t65 })
    expect(response.result).toBe('granted')
    expect(countByResult([first, dup]).unique_members).toBe(1)
  })

  it('fuera de la ventana → granted de nuevo', () => {
    const later = new Date(NOW.getTime() + 61 * 60_000)
    const { response } = run({ code: qrOf('Valentina Rojas'), attendances: [first], now: later })
    expect(response.result).toBe('granted')
  })

  it('la ventana es configurable', () => {
    const later = new Date(NOW.getTime() + 10 * 60_000)
    const args = { code: qrOf('Valentina Rojas'), attendances: [first], now: later }
    expect(run({ ...args, debounceMinutes: 5 }).response.result).toBe('granted')
    expect(run({ ...args, debounceMinutes: 15 }).response.result).toBe('duplicate')
    expect(run({ ...args, debounceMinutes: 0 }).response.result).toBe('granted')
  })

  it('un denied previo no provoca duplicate', () => {
    const denied = { ...first, result: 'denied', reason: 'membership_expired' }
    const { response } = run({ code: qrOf('Valentina Rojas'), attendances: [denied] })
    expect(response.result).toBe('granted')
  })

  it('el manual también respeta el antirrebote', () => {
    const later = new Date(NOW.getTime() + 60_000)
    const { response } = run({ method: 'manual', userId: 101, attendances: [first], now: later })
    expect(response.result).toBe('duplicate')
  })
})

describe('zona horaria America/Caracas', () => {
  it('"hoy" se calcula en Caracas, no en UTC', () => {
    // 2026-10-09 02:00Z = 2026-10-08 22:00 en Caracas
    expect(zonedDayKey('2026-10-09T02:00:00Z')).toBe('2026-10-08')
    expect(zonedDayKey('2026-10-09T04:00:00Z')).toBe('2026-10-09')
  })

  it('endOfZonedDay devuelve las 23:59:59.999 locales', () => {
    expect(endOfZonedDay(NOW, 0).toISOString()).toBe('2026-10-09T03:59:59.999Z')
    expect(endOfZonedDay(NOW, 20).toISOString()).toBe('2026-10-29T03:59:59.999Z')
    expect(endOfZonedDay(NOW, -3).toISOString()).toBe('2026-10-06T03:59:59.999Z')
  })

  it('calendarDaysBetween cuenta días calendario', () => {
    expect(calendarDaysBetween(NOW, endOfZonedDay(NOW, 12))).toBe(12)
    expect(calendarDaysBetween(NOW, endOfZonedDay(NOW, -3))).toBe(-3)
  })

  it('filterToday usa el día de Caracas y el gimnasio', () => {
    const rows = [
      { id: 'a', gym_id: IRON, checked_in_at: '2026-10-08T04:30:00Z', result: 'granted', user_id: 1 }, // 00:30 hoy
      { id: 'b', gym_id: IRON, checked_in_at: '2026-10-08T03:30:00Z', result: 'granted', user_id: 1 }, // ayer 23:30
      { id: 'c', gym_id: CROSS, checked_in_at: '2026-10-08T13:00:00Z', result: 'granted', user_id: 2 },
      { id: 'd', gym_id: IRON, checked_in_at: '2026-10-08T13:00:00Z', result: 'denied', user_id: 3 },
    ]
    expect(filterToday(rows, IRON, NOW).map((r) => r.id)).toEqual(['d', 'a'])
  })
})

describe('utilidades', () => {
  it('initials', () => {
    expect(initials('Valentina Rojas')).toBe('VR')
    expect(initials('  camila  méndez de la torre ')).toBe('CM')
    expect(initials('Cher')).toBe('C')
  })

  it('countByResult', () => {
    const rows = [
      { result: 'granted', user_id: 1 },
      { result: 'granted', user_id: 2 },
      { result: 'duplicate', user_id: 1 },
      { result: 'denied', user_id: 3 },
    ]
    expect(countByResult(rows)).toEqual({ granted: 2, denied: 1, duplicate: 1, total: 4, unique_members: 2 })
  })
})
