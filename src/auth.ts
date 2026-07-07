import NextAuth from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user-config'
import { rateLimitAsync } from '@/lib/rate-limit'

// Shape de columnas de User que se leen en auth
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  status: true,
  password: true,
  featurePlan: true,
  featureCheckin: true,
  featureNutrition: true,
  featureProgress: true,
  featureLog: true,
  featureCoach: true,
  featureGym: true,
  onboardingCompleted: true,
  needsRoleSelection: true,
  identification: true,
  phoneWa: true,
} as const

function buildFeaturesFromUser(u: {
  featurePlan: boolean; featureCheckin: boolean; featureNutrition: boolean;
  featureProgress: boolean; featureLog: boolean; featureCoach: boolean; featureGym: boolean;
}) {
  return {
    plan:      u.featurePlan,
    checkin:   u.featureCheckin,
    nutrition: u.featureNutrition,
    progress:  u.featureProgress,
    log:       u.featureLog,
    coach:     u.featureCoach,
    gym:       u.featureGym,
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Brute-force protection: 10 intentos/min por email
        const email = (credentials.email as string).toLowerCase().trim()
        const { allowed } = await rateLimitAsync(`login-${email}`, { limit: 10, windowMs: 60_000 })
        if (!allowed) return null

        const user = await prisma.user.findUnique({
          where: { email },
          select: USER_SELECT,
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) return null

        const features = buildFeaturesFromUser(user)

        const coachRelation = await prisma.coachAthlete.findFirst({
          where: { athleteId: user.id },
          select: { id: true },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          onboardingCompleted: user.onboardingCompleted,
          activated: user.featurePlan,
          isB2B: !!coachRelation,
          userPlan: 'PRO' as const,
          features,
          needsRoleSelection: user.needsRoleSelection,
          profileComplete: !!(user.identification && user.phoneWa),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status ?? 'ACTIVE'
        token.onboardingCompleted = user.onboardingCompleted ?? false
        token.activated = user.activated ?? false
        token.isB2B = user.isB2B ?? false
        token.userPlan = user.userPlan ?? 'FREE'
        token.features = user.features ?? DEFAULT_USER_CONFIG.features
        token.needsRoleSelection = user.needsRoleSelection ?? false
        token.profileComplete = user.profileComplete ?? false
      }

      // Google OAuth — siempre leer desde DB (PrismaAdapter no llama authorize())
      const t = token as JWT
      if (account?.provider === 'google' && t.id) {
        try {
          const [dbUser, coachRelation] = await Promise.all([
            prisma.user.findUnique({ where: { id: t.id }, select: USER_SELECT }),
            prisma.coachAthlete.findFirst({ where: { athleteId: t.id }, select: { id: true } }),
          ])
          if (dbUser) {
            if (dbUser.needsRoleSelection) {
              token.needsRoleSelection = true
              token.status = 'ACTIVE'
              token.onboardingCompleted = false
              token.activated = false
              token.isB2B = false
              token.userPlan = 'FREE'
              token.features = DEFAULT_USER_CONFIG.features
              token.profileComplete = false
            } else {
              const features = buildFeaturesFromUser(dbUser)
              token.role = dbUser.role
              token.status = dbUser.status
              token.needsRoleSelection = false
              token.onboardingCompleted = dbUser.onboardingCompleted
              token.activated = dbUser.featurePlan
              token.isB2B = !!coachRelation
              token.userPlan = 'PRO'
              token.features = features
              token.profileComplete = !!(dbUser.identification && dbUser.phoneWa)
            }
          }
        } catch {
          // silently fail
        }
      }

      // Refresh desde DB al actualizar sesión (post set-role o onboarding)
      if (trigger === 'update' && t.id) {
        try {
          const [dbUser, coachRelation] = await Promise.all([
            prisma.user.findUnique({ where: { id: t.id }, select: USER_SELECT }),
            prisma.coachAthlete.findFirst({ where: { athleteId: t.id }, select: { id: true } }),
          ])
          if (dbUser) {
            const features = buildFeaturesFromUser(dbUser)
            token.role = dbUser.role
            token.status = dbUser.status
            token.activated = dbUser.featurePlan
            token.isB2B = !!coachRelation
            token.onboardingCompleted = dbUser.onboardingCompleted
            token.userPlan = 'PRO'
            token.features = features
            token.needsRoleSelection = false
            token.profileComplete = !!(dbUser.identification && dbUser.phoneWa)
          }
        } catch {
          // silently fail — token retains last known value
        }
      }

      return token
    },
    async session({ session, token }) {
      const t = token as JWT
      if (t) {
        session.user.id = t.id ?? ''
        session.user.role = t.role ?? 'ATHLETE'
        session.user.status = t.status ?? 'ACTIVE'
        session.user.onboardingCompleted = t.onboardingCompleted ?? false
        session.user.activated = t.activated ?? false
        session.user.isB2B = t.isB2B ?? false
        session.user.userPlan = t.userPlan ?? 'FREE'
        session.user.needsRoleSelection = t.needsRoleSelection ?? false
        session.user.features = t.features ?? DEFAULT_USER_CONFIG.features
        session.user.profileComplete = t.profileComplete ?? false
      }
      return session
    },
  },
})
