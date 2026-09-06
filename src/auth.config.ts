import type { NextAuthConfig } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user_config'

// Config sin Prisma — compatible con Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
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
    // Credentials sin authorize — la lógica real está en auth.ts (Node runtime)
    Credentials({}),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status ?? 'ACTIVE'
        token.onboardingCompleted = user.onboardingCompleted ?? false
        token.activated = user.activated ?? false
        token.userPlan = user.userPlan ?? 'FREE'
        token.features = user.features ?? DEFAULT_USER_CONFIG.features
      }
      return token
    },
    async session({ session, token }) {
      // Cast required: next-auth v5 beta.31 doesn't resolve JWT module augmentation
      // correctly in callback context — the augmented JWT from next-auth/jwt is correct.
      const t = token as JWT
      if (t) {
        session.user.id = t.id ?? ''
        session.user.role = t.role ?? 'ATHLETE'
        session.user.status = t.status ?? 'ACTIVE'
        session.user.onboardingCompleted = t.onboardingCompleted ?? false
        session.user.activated = t.activated ?? false
        session.user.userPlan = t.userPlan ?? 'FREE'
        session.user.needsRoleSelection = t.needsRoleSelection ?? false
        session.user.features = t.features ?? DEFAULT_USER_CONFIG.features
      }
      return session
    },
  },
}
