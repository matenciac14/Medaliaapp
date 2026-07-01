-- ⚠️  REVISAR ANTES DE EJECUTAR EN PRODUCCIÓN
-- Elimina todos los usuarios de prueba del seed de desarrollo.
-- Mantiene: admin@medaliq.com
-- Los deletes en cascada (CoachAthlete, TrainingPlan, WeeklyCheckIn, etc.)
-- están definidos en el schema con onDelete: Cascade.
--
-- Uso: psql "$DATABASE_URL" -f scripts/cleanup-test-users.sql

DELETE FROM "User" WHERE email IN (
  -- Coaches de prueba
  'coach@medaliq.com',
  'maria.coach@medaliq.com',
  -- Atletas de prueba
  'miguel@medaliq.com',
  'ana@medaliq.com',
  'juan.perez@medaliq.com',
  'sofia.ramirez@medaliq.com',
  'andres.moreno@medaliq.com',
  'valentina.castro@medaliq.com',
  'camilo.torres@medaliq.com',
  'laura.gomez@medaliq.com',
  'sebastian.rios@medaliq.com',
  'daniela.vargas@medaliq.com',
  'felipe.herrera@medaliq.com',
  'isabella.mendez@medaliq.com',
  'nicolas.gutierrez@medaliq.com',
  'catalina.jimenez@medaliq.com',
  'santiago.rodriguez@medaliq.com'
);
