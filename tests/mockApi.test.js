import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkIn,
  configureMockApi,
  createMemoryStorage,
  getClientQr,
  getSettings,
  listTodayCheckins,
  resetDemo,
  searchMembers,
  updateSettings,
} from '../src/api/mockApi.js'

let now = new Date('2026-10-08T14:00:00Z')
const storage = createMemoryStorage()
configureMockApi({ latency: [0, 0], now: () => now, storage })

const IRON = 1

beforeEach(async () => {
  now = new Date('2026-10-08T14:00:00Z')
  await resetDemo()
})

describe('mockApi', () => {
  it('getClientQr devuelve el payload TU1 y el estado de la membresía', async () => {
    const { payload, user, membership } = await getClientQr(101)
    expect(payload).toMatch(/^TU1\.[A-Za-z0-9]{40}$/)
    expect(payload).not.toContain('101')
    expect(user).toMatchObject({ name: 'Valentina Rojas', gym: { slug: 'iron-gym' } })
    expect(user).not.toHaveProperty('checkin_token')
    expect(membership).toMatchObject({ status: 'active', days_left: 20, is_active: true })
  })

  it('checkIn registra en localStorage y listTodayCheckins lo devuelve con contadores', async () => {
    const { payload } = await getClientQr(101)
    expect((await checkIn({ gymId: IRON, code: payload, scannerId: 105 })).result).toBe('granted')
    now = new Date(now.getTime() + 60_000)
    expect((await checkIn({ gymId: IRON, code: payload, scannerId: 105 })).result).toBe('duplicate')
    expect((await checkIn({ gymId: IRON, code: 'cualquier cosa', scannerId: 105 })).reason).toBe('unknown_token')

    const { items, counts } = await listTodayCheckins(IRON)
    expect(items).toHaveLength(2) // unknown_token no se registra
    expect(items[0]).toMatchObject({ result: 'duplicate', member: { name: 'Valentina Rojas' } })
    expect(counts).toMatchObject({ granted: 1, duplicate: 1, denied: 0, unique_members: 1 })
    expect(JSON.parse(storage.getItem('trainup-demo:attendances'))).toHaveLength(2)
  })

  it('el registro de otro gimnasio no expone al usuario ajeno', async () => {
    const { payload } = await getClientQr(201)
    await checkIn({ gymId: IRON, code: payload, scannerId: 105 })
    const { items } = await listTodayCheckins(IRON)
    expect(items[0]).toMatchObject({ reason: 'not_member', user_id: null, member: null })
  })

  it('la ventana de antirrebote se lee de los ajustes', async () => {
    await updateSettings({ debounceMinutes: 1 })
    expect((await getSettings()).debounceMinutes).toBe(1)
    const { payload } = await getClientQr(101)
    await checkIn({ gymId: IRON, code: payload, scannerId: 105 })
    now = new Date(now.getTime() + 2 * 60_000)
    expect((await checkIn({ gymId: IRON, code: payload, scannerId: 105 })).result).toBe('granted')
  })

  it('resetDemo borra asistencias y ajustes', async () => {
    await updateSettings({ debounceMinutes: 5 })
    await checkIn({ gymId: IRON, method: 'manual', userId: 101, scannerId: 105 })
    await resetDemo()
    expect((await listTodayCheckins(IRON)).items).toHaveLength(0)
    expect((await getSettings()).debounceMinutes).toBe(60)
  })

  it('searchMembers busca clientes del gimnasio por nombre o email, sin acentos', async () => {
    expect((await searchMembers(IRON, 'mendez')).map((m) => m.id)).toEqual([103])
    expect((await searchMembers(IRON, 'andres.perez@')).map((m) => m.id)).toEqual([102])
    expect(await searchMembers(IRON, 'mariana')).toEqual([]) // admin: no es cliente
    expect(await searchMembers(IRON, 'gabriel')).toEqual([]) // otro gimnasio
    expect(await searchMembers(IRON, 'a')).toEqual([])
  })
})
