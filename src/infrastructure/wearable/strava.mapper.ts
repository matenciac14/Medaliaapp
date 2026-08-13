import type { StravaActivity } from './strava.service'
import type { CreateWearableSessionInput, WearableDiscipline } from '@/domain/wearables/create-wearable-session.use-case'

const SPORT_TYPE_MAP: Record<string, WearableDiscipline> = {
  Run:                     'RUNNING',
  TrailRun:                'RUNNING',
  VirtualRun:              'RUNNING',
  Ride:                    'CYCLING',
  VirtualRide:             'CYCLING',
  MountainBikeRide:        'CYCLING',
  Swim:                    'SWIMMING',
  WeightTraining:          'STRENGTH',
  Crossfit:                'STRENGTH',
  Workout:                 'STRENGTH',
}

function mapSportType(sportType: string): WearableDiscipline {
  return SPORT_TYPE_MAP[sportType] ?? 'OTHER'
}

export function stravaActivityToSessionLog(
  activity: StravaActivity,
  userId: string
): CreateWearableSessionInput {
  const avgPaceSecPerKm =
    activity.average_speed && activity.average_speed > 0
      ? Math.round(1000 / activity.average_speed)
      : null

  return {
    userId,
    externalId:      activity.id.toString(),
    dataSource:      'STRAVA',
    discipline:      mapSportType(activity.sport_type),
    distanceKm:      activity.distance > 0 ? activity.distance / 1000 : null,
    durationMin:     activity.moving_time > 0 ? activity.moving_time / 60 : null,
    hrAvg:           activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    hrMax:           activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
    caloriesBurned:  activity.calories ?? null,
    avgPaceSecPerKm,
    sessionDate:     new Date(activity.start_date),
    notes:           activity.name ?? null,
  }
}
