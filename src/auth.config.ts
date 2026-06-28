import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

// Config sin Prisma — compatible con Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
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
        token.role = (user as any).role
        token.onboardingCompleted = (user as any).onboardingCompleted ?? false
        token.activated = (user as any).activated ?? false
        token.userPlan = (user as any).userPlan ?? 'FREE'
        token.features = (user as any).features ?? {}
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
        session.user.activated = token.activated as boolean
        session.user.userPlan = (token.userPlan as 'FREE' | 'PRO') ?? 'FREE'
        session.user.needsRoleSelection = (token.needsRoleSelection as boolean) ?? false
        session.user.features = (token.features as any) ?? {
          plan: true, checkin: true, nutrition: true, progress: true,
          log: true, coach: false, gym: true,
        }
      }
      return session
    },
  },
}
