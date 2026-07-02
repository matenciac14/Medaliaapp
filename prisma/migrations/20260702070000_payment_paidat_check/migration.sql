-- DBI-20: Enforce paidAt IS NOT NULL when status = 'PAID'
ALTER TABLE "Payment"
  ADD CONSTRAINT "payment_paid_status_requires_paid_at"
  CHECK (status != 'PAID' OR "paidAt" IS NOT NULL);
