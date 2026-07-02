-- DBA-P2 + DBA-P3 indexes — auditoría de módulos 2026-07

-- ── P2: CoachAthlete(coachId, status) ────────────────────────────────────────
-- getCoachLimits() hace COUNT WHERE coachId = X AND status = 'ACTIVE'
-- El @@unique([coachId, athleteId]) no cubre el filtro por status
CREATE INDEX IF NOT EXISTS "CoachAthlete_coachId_status_idx" ON "CoachAthlete"("coachId", "status");

-- ── P2: SetLog(exerciseName, completed) ──────────────────────────────────────
-- isPRByName() busca max weight WHERE exerciseName = X AND completed = true
-- Sin índice: table scan en atletas con 1000+ sets
CREATE INDEX IF NOT EXISTS "SetLog_exerciseName_completed_idx" ON "SetLog"("exerciseName", "completed");

-- ── P3: WeeklyCheckIn(userId, weekNumber) ────────────────────────────────────
-- findFirst({ where: { userId, weekNumber } }) usa solo @@index([userId])
-- El weekNumber se filtra en memoria — O(n) sobre todos los check-ins del atleta
CREATE INDEX IF NOT EXISTS "WeeklyCheckIn_userId_weekNumber_idx" ON "WeeklyCheckIn"("userId", "weekNumber");

-- ── P3: SessionLog(userId, completedAt DESC) ─────────────────────────────────
-- Queries de historial hacen orderBy: { completedAt: 'desc' } sobre @@index([userId])
-- Índice compuesto elimina el sort adicional
CREATE INDEX IF NOT EXISTS "SessionLog_userId_completedAt_idx" ON "SessionLog"("userId", "completedAt" DESC);
