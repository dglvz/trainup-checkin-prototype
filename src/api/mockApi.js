// API simulada. Imita los futuros endpoints de Laravel; las vistas solo usan
// este módulo, nunca el seed ni localStorage directamente.
//
//   getClientQr        → GET  /{gym}/my-qr
//   checkIn            → POST /{gym}/admin/checkin
//   listTodayCheckins  → GET  /{gym}/admin/checkin  (lista "Hoy")
//   searchMembers      → GET  /{gym}/admin/checkin/members?q=
//
// El resto (listGyms, listDemoUsers, listTestCases, settings, resetDemo) existe
// solo porque el prototipo no tiene login.

import { GYMS, USERS } from '../data/seed.js'
import {
  DEFAULT_DEBOUNCE_MINUTES,
  buildQrPayload,
  countByResult,
  evaluateCheckIn,
  filterToday,
  initials,
  materializeUser,
  membershipSummary,
} from '../domain/checkin.js'

const STORAGE_PREFIX = 'trainup-demo:'
const ATTENDANCES_KEY = `${STORAGE_PREFIX}attendances`
const SETTINGS_KEY = `${STORAGE_PREFIX}settings`

// ── Configuración (los tests desactivan la latencia y fijan el reloj) ──────

const config = {
  latency: [150, 300],
  now: () => new Date(),
  storage: resolveStorage(),
}

export function configureMockApi(overrides) {
  Object.assign(config, overrides)
}

function resolveStorage() {
  try {
    const ls = globalThis.localStorage
    const probe = `${STORAGE_PREFIX}probe`
    ls.setItem(probe, '1')
    ls.removeItem(probe)
    return ls
  } catch {
    return createMemoryStorage()
  }
}

export function createMemoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  }
}

function delay() {
  const [min, max] = config.latency
  if (!max) return Promise.resolve()
  const ms = min + Math.random() * (max - min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readJson(key, fallback) {
  try {
    const raw = config.storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  config.storage.setItem(key, JSON.stringify(value))
}

const clone = (v) => JSON.parse(JSON.stringify(v))

// ── "Base de datos" ────────────────────────────────────────────────────────

function users(now = config.now()) {
  return USERS.map((u) => materializeUser(u, now))
}

function findGym(gymId) {
  const gym = GYMS.find((g) => g.id === Number(gymId))
  if (!gym) throw new Error('Gimnasio no encontrado')
  return gym
}

function attendances() {
  return readJson(ATTENDANCES_KEY, [])
}

function publicUser(user) {
  const gym = GYMS.find((g) => g.id === user.gym_id)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: initials(user.name),
    role: user.role,
    classification: user.classification,
    membership_status: user.membership_status,
    gym: gym ? { ...gym } : null,
  }
}

// ── Ajustes ───────────────────────────────────────────────────────────────

export async function getSettings() {
  await delay()
  return { debounceMinutes: DEFAULT_DEBOUNCE_MINUTES, ...readJson(SETTINGS_KEY, {}) }
}

export async function updateSettings(patch) {
  await delay()
  const next = { ...getSettingsSync(), ...patch }
  next.debounceMinutes = Math.min(24 * 60, Math.max(0, Math.round(Number(next.debounceMinutes) || 0)))
  writeJson(SETTINGS_KEY, next)
  return next
}

function getSettingsSync() {
  return { debounceMinutes: DEFAULT_DEBOUNCE_MINUTES, ...readJson(SETTINGS_KEY, {}) }
}

/** Borra todo lo que la demo guardó en localStorage (asistencias y ajustes). */
export async function resetDemo() {
  await delay()
  const keys = []
  for (let i = 0; i < config.storage.length; i++) {
    const k = config.storage.key(i)
    if (k?.startsWith(STORAGE_PREFIX)) keys.push(k)
  }
  keys.forEach((k) => config.storage.removeItem(k))
  return { ok: true }
}

// ── Selección de demo (sustituye al login) ───────────────────────────────

export async function listGyms() {
  await delay()
  return clone(GYMS)
}

export async function listDemoUsers({ gymId, role }) {
  await delay()
  return users()
    .filter((u) => u.gym_id === Number(gymId) && (!role || u.role === role))
    .map(publicUser)
}

export async function getDemoUser(userId) {
  await delay()
  const user = users().find((u) => u.id === Number(userId))
  return user ? publicUser(user) : null
}

/** Todos los usuarios del seed con su QR, para la tabla de casos de prueba. */
export async function listTestCases() {
  await delay()
  const now = config.now()
  return users(now).map((u) => ({
    ...publicUser(u),
    payload: buildQrPayload(u.checkin_token),
    membership: membershipSummary(u.membership, now),
    demo_case: u.demo_case,
    expected: u.expected,
  }))
}

// ── Endpoints ────────────────────────────────────────────────────────────

/** GET /{gym}/my-qr */
export async function getClientQr(userId) {
  await delay()
  const now = config.now()
  const user = users(now).find((u) => u.id === Number(userId))
  if (!user) throw new Error('Usuario no encontrado')
  return {
    payload: buildQrPayload(user.checkin_token),
    user: publicUser(user),
    membership: membershipSummary(user.membership, now),
  }
}

/**
 * POST /{gym}/admin/checkin
 * `code` es el texto leído del QR (method 'qr'). Para el respaldo manual se
 * envía `userId` (method 'manual'), igual que haría el formulario real.
 */
export async function checkIn({ gymId, code, userId, scannerId, method = 'qr' }) {
  await delay()
  findGym(gymId)
  const now = config.now()
  const settings = getSettingsSync()
  const log = attendances()
  const { response, record } = evaluateCheckIn({
    gymId: Number(gymId),
    code,
    userId,
    scannerId,
    method,
    users: users(now),
    attendances: log,
    now,
    debounceMinutes: settings.debounceMinutes,
  })
  if (record) writeJson(ATTENDANCES_KEY, [...log, record])
  return response
}

/** Ingresos de hoy (America/Caracas) con nombre y contadores. */
export async function listTodayCheckins(gymId) {
  await delay()
  const now = config.now()
  const byId = new Map(users(now).map((u) => [u.id, u]))
  const today = filterToday(attendances(), Number(gymId), now)
  return {
    items: today.map((a) => {
      const u = a.user_id != null ? byId.get(a.user_id) : null
      return {
        ...a,
        member: u && u.gym_id === Number(gymId) ? { id: u.id, name: u.name, initials: initials(u.name) } : null,
      }
    }),
    counts: countByResult(today),
  }
}

/** Buscador del respaldo manual: clientes del gimnasio por nombre o email. */
export async function searchMembers(gymId, query) {
  await delay()
  const q = normalize(query)
  if (q.length < 2) return []
  const now = config.now()
  return users(now)
    .filter((u) => u.gym_id === Number(gymId) && u.role === 'client')
    .filter((u) => normalize(u.name).includes(q) || normalize(u.email).includes(q))
    .slice(0, 10)
    .map((u) => ({ ...publicUser(u), membership: membershipSummary(u.membership, now) }))
}

function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}
