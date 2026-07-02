-- DBI-05: PlannedSession.workoutDayId — onDelete: SetNull
-- Si coach borra WorkoutDay, PlannedSession.workoutDayId debe quedar null
-- Sin esto Postgres usa RESTRICT (default) pero la FK queda huérfana en app layer

-- Drop existing FK constraint and re-create with ON DELETE SET NULL
ALTER TABLE "PlannedSession" DROP CONSTRAINT IF EXISTS "PlannedSession_workoutDayId_fkey";
ALTER TABLE "PlannedSession"
  ADD CONSTRAINT "PlannedSession_workoutDayId_fkey"
  FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DBI-06: SessionLog.plannedSessionId — onDelete: SetNull
-- Si PlannedSession se borra (plan reemplazado), SessionLog queda como log libre (plannedSessionId = null)
-- Sin esto Postgres usa RESTRICT y el delete del plan falla o la FK queda huérfana

ALTER TABLE "SessionLog" DROP CONSTRAINT IF EXISTS "SessionLog_plannedSessionId_fkey";
ALTER TABLE "SessionLog"
  ADD CONSTRAINT "SessionLog_plannedSessionId_fkey"
  FOREIGN KEY ("plannedSessionId") REFERENCES "PlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
