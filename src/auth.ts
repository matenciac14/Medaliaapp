import NextAuth, { type Session } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { parseUserConfig, getUserPlan } from '@/lib/config/user-config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        const config = parseUserConfig(user.config)

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
          onboardingCompleted: config.onboarding.completed,
          activated: config.features.plan,
          isB2B: !!coachRelation,
          userPlan: getUserPlan(config.features),
          features: config.features,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.onboardingCompleted = (user as any).onboardingCompleted ?? false
        token.activated = (user as any).activated ?? false
        token.isB2B = (user as any).isB2B ?? false
        token.userPlan = (user as any).userPlan ?? 'FREE'
        token.features = (user as any).features ?? {}
      }
      // Refresh from DB on session update
      if (trigger === 'update' && token.id) {
        try {
          const [dbUser, coachRelation] = await Promise.all([
            prisma.user.findUnique({
              where: { id: token.id as string },
              select: { config: true },
            }),
            prisma.coachAthlete.findFirst({
              where: { athleteId: token.id as string },
              select: { id: true },
            }),
          ])
          if (dbUser) {
            const config = parseUserConfig(dbUser.config)
            token.activated = config.features.plan
            token.isB2B = !!coachRelation
            token.onboardingCompleted = config.onboarding.completed
            token.userPlan = getUserPlan(config.features)
            token.features = config.features
          }
        } catch {
          // silently fail — token retains last known value
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
        session.user.activated = token.activated as boolean
        session.user.isB2B = (token.isB2B as boolean) ?? false
        session.user.userPlan = (token.userPlan as 'FREE' | 'PRO') ?? 'FREE'
        session.user.features = (token.features as Session['user']['features']) ?? {
          plan: true, checkin: true, nutrition: true, progress: true,
          log: true, coach: false, gym: true,
        }
      }
      return session
    },
  },
})
