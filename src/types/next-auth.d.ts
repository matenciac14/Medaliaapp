import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      onboardingCompleted: boolean
      activated: boolean
      isB2B: boolean
      userPlan: 'FREE' | 'PRO'
      features: {
        plan: boolean
        checkin: boolean
        nutrition: boolean
        progress: boolean
        log: boolean
        coach: boolean
        gym: boolean
      }
      needsRoleSelection?: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
    isB2B?: boolean
    userPlan?: 'FREE' | 'PRO'
    features?: {
      plan: boolean
      checkin: boolean
      nutrition: boolean
      progress: boolean
      log: boolean
      coach: boolean
      gym: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
    isB2B?: boolean
    userPlan?: 'FREE' | 'PRO'
    needsRoleSelection?: boolean
    features?: {
      plan: boolean
      checkin: boolean
      nutrition: boolean
      progress: boolean
      log: boolean
      coach: boolean
      gym: boolean
    }
  }
}

// @auth/core/jwt is the actual declaration site — next-auth/jwt re-exports from here.
// @auth/core/index.d.ts imports with the ".js" specifier — augment both to cover all resolution paths.
declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
    isB2B?: boolean
    userPlan?: 'FREE' | 'PRO'
    needsRoleSelection?: boolean
    features?: {
      plan: boolean
      checkin: boolean
      nutrition: boolean
      progress: boolean
      log: boolean
      coach: boolean
      gym: boolean
    }
  }
}

declare module '@auth/core/jwt.js' {
  interface JWT {
    id?: string
    role?: string
    onboardingCompleted?: boolean
    activated?: boolean
    isB2B?: boolean
    userPlan?: 'FREE' | 'PRO'
    needsRoleSelection?: boolean
    features?: {
      plan: boolean
      checkin: boolean
      nutrition: boolean
      progress: boolean
      log: boolean
      coach: boolean
      gym: boolean
    }
  }
}
