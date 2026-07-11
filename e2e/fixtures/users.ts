/**
 * Usuarios de test E2E — MedalIQ
 *
 * Estos datos deben coincidir con el seed de test (global.setup.ts).
 * NUNCA usar emails/passwords de producción aquí.
 */

export const USERS = {
  // Atleta B2C con plan activo y check-ins
  atletaB2C: {
    email: 'e2e-atleta-b2c@test.medaliq.com',
    password: 'Test1234!',
    name: 'Ana Test B2C',
  },

  // Atleta B2B conectado al coach de test
  atletaB2B: {
    email: 'e2e-atleta-b2b@test.medaliq.com',
    password: 'Test1234!',
    name: 'Carlos Test B2B',
  },

  // Atleta B2C nuevo (sin plan, primer login)
  atletaNuevo: {
    email: 'e2e-atleta-nuevo@test.medaliq.com',
    password: 'Test1234!',
    name: 'Luis Test Nuevo',
  },

  // Coach con atletas activos
  coach: {
    email: 'e2e-coach@test.medaliq.com',
    password: 'Test1234!',
    name: 'Diego Test Coach',
  },

  // Admin
  admin: {
    email: 'e2e-admin@test.medaliq.com',
    password: 'Test1234!',
    name: 'Admin Test',
  },
} as const

export type UserKey = keyof typeof USERS
