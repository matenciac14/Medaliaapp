-- Remove OVERDUE from PaymentStatus enum.
--
-- Problema: OVERDUE es estado derivado (dueDate < NOW() && status = PENDING)
-- almacenado en DB. Requería un side-effect en el GET para mantenerse actualizado
-- — si el coach no abría Finanzas, los pagos vencidos nunca se marcaban.
--
-- Solución: OVERDUE se calcula en la capa de aplicación (dueDate + status).
-- DB solo persiste PENDING | PAID — estados que realmente cambian por acción humana.

-- 0. Cleanup por si un intento previo dejó el tipo a medias
DROP TYPE IF EXISTS "PaymentStatus_new";

-- 1. Resetear pagos OVERDUE a PENDING (no han sido pagados; el vencimiento es display)
UPDATE "Payment" SET status = 'PENDING' WHERE status = 'OVERDUE';

-- 2. Crear nuevo enum sin OVERDUE
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID');

-- 3. Dropear el DEFAULT antes de mutar el tipo (PostgreSQL no puede castear el default automáticamente)
ALTER TABLE "Payment" ALTER COLUMN status DROP DEFAULT;

-- 4. Migrar la columna al nuevo tipo
ALTER TABLE "Payment"
  ALTER COLUMN status TYPE "PaymentStatus_new"
  USING status::text::"PaymentStatus_new";

-- 5. Restaurar el DEFAULT con el nuevo tipo
ALTER TABLE "Payment" ALTER COLUMN status SET DEFAULT 'PENDING'::"PaymentStatus_new";

-- 6. Eliminar enum viejo y renombrar el nuevo
DROP TYPE "PaymentStatus";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
