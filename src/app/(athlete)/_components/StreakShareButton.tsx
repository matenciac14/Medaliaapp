'use client'

import ShareMilestoneButton from './ShareMilestoneButton'

interface Props {
  streakDays: number
}

export default function StreakShareButton({ streakDays }: Props) {
  if (streakDays < 7) return null

  return (
    <ShareMilestoneButton
      type="STREAK"
      context={{ streakDays }}
    />
  )
}
