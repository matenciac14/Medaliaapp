-- DBI-02: AssignedWorkout.templateId → onDelete: Cascade
-- When a WorkoutTemplate is deleted, its AssignedWorkout records are also deleted.
-- This prevents orphaned AssignedWorkout rows that reference a deleted template.

ALTER TABLE "AssignedWorkout" DROP CONSTRAINT "AssignedWorkout_templateId_fkey";

ALTER TABLE "AssignedWorkout" ADD CONSTRAINT "AssignedWorkout_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
