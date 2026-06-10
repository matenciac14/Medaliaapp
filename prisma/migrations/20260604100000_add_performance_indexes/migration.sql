-- Performance indexes for frequently queried columns

-- TrainingPlan: queried by userId + status on every dashboard/plan page load
CREATE INDEX IF NOT EXISTS "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");

-- SessionLog: queried by userId on log page
CREATE INDEX IF NOT EXISTS "SessionLog_userId_idx" ON "SessionLog"("userId");

-- AssignedWorkout: queried by athleteId + isActive on gym page load
CREATE INDEX IF NOT EXISTS "AssignedWorkout_athleteId_isActive_idx" ON "AssignedWorkout"("athleteId", "isActive");

-- GymSession: queried by athleteId + completed on history page and gym page
CREATE INDEX IF NOT EXISTS "GymSession_athleteId_completed_idx" ON "GymSession"("athleteId", "completed");
