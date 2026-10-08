// Datos de demo 100 % ficticios. Nombres, gimnasios y correos (@example.com)
// son inventados; los tokens se generaron solo para este prototipo.
//
// `ends_in_days` es relativo a "hoy" (America/Caracas). Al usarse se convierte
// en `ends_at` real (fin de ese día en Caracas), así la demo nunca vence.

export const GYMS = [
  { id: 1, slug: 'iron-gym', name: 'Iron Gym' },
  { id: 2, slug: 'crossbox', name: 'CrossBox Altamira' },
]

export const USERS = [
  // ── iron-gym ────────────────────────────────────────────────────────────
  {
    id: 101,
    gym_id: 1,
    name: 'Valentina Rojas',
    email: 'valentina.rojas@example.com',
    role: 'client',
    membership_status: 'active',
    classification: 'Avanzado',
    membership: { status: 'active', ends_in_days: 20 },
    checkin_token: 'jcezsKv9alTSWVyo6tMjJPuiW9BgFZVEIcbNEK9d',
    demo_case: 'Activa, ~20 días restantes → acceso permitido',
    expected: 'granted',
  },
  {
    id: 102,
    gym_id: 1,
    name: 'Andrés Pérez',
    email: 'andres.perez@example.com',
    role: 'client',
    membership_status: 'active',
    classification: 'Intermedio',
    membership: { status: 'active', ends_in_days: 0 },
    checkin_token: '3zrTxZBG46m0ItcU720ka1HfGZz5pUGp6RYH3OAZ',
    demo_case: 'Vence hoy más tarde → acceso permitido',
    expected: 'granted',
  },
  {
    id: 103,
    gym_id: 1,
    name: 'Camila Méndez',
    email: 'camila.mendez@example.com',
    role: 'client',
    membership_status: 'active',
    classification: 'Principiante',
    membership: { status: 'active', ends_in_days: -3 },
    checkin_token: 'wfOiDd0sCPL10qO8XmaK7SxsYXEWXr3AnUr038KB',
    demo_case: 'Membresía vencida hace 3 días → rechazado',
    expected: 'membership_expired',
  },
  {
    id: 104,
    gym_id: 1,
    name: 'Luis Herrera',
    email: 'luis.herrera@example.com',
    role: 'client',
    membership_status: 'inactive',
    classification: 'Intermedio',
    membership: { status: 'active', ends_in_days: 45 },
    checkin_token: 'OYWT2hyec3wRx0tU2dLxrHcMcGCOV2SGJ3amdyYM',
    demo_case: 'Desactivado por el admin (membresía con fecha futura) → rechazado',
    expected: 'user_inactive',
  },
  {
    id: 105,
    gym_id: 1,
    name: 'Mariana Torres',
    email: 'mariana.torres@example.com',
    role: 'admin',
    membership_status: 'active',
    classification: 'Staff',
    membership: null,
    checkin_token: 'H8l7fe0HBG8MuuqadFyIQjdQCVTx9LwD61M3oWA1',
    demo_case: 'Admin (no es cliente) → rechazado',
    expected: 'not_client',
  },

  // ── crossbox ────────────────────────────────────────────────────────────
  {
    id: 201,
    gym_id: 2,
    name: 'Gabriel Suárez',
    email: 'gabriel.suarez@example.com',
    role: 'client',
    membership_status: 'active',
    classification: 'Elite',
    membership: { status: 'active', ends_in_days: 30 },
    checkin_token: 'TN48oI8L09lvCMokptVAWE8B2S0lZ1PhYYI5hWDq',
    demo_case: 'Cliente activo de CrossBox → rechazado en Iron Gym',
    expected: 'not_member',
  },
  {
    id: 202,
    gym_id: 2,
    name: 'Paula Ortega',
    email: 'paula.ortega@example.com',
    role: 'admin',
    membership_status: 'active',
    classification: 'Staff',
    membership: null,
    checkin_token: 'iOFtjCEUVhplg02wqGNsYpaUgRSLe5gwsDr7IL6L',
    demo_case: 'Admin de CrossBox → rechazado en Iron Gym',
    expected: 'not_member',
  },
]
