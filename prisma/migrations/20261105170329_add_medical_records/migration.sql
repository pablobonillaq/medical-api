-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('read', 'create', 'update', 'denied');

-- CreateEnum
CREATE TYPE "AuditResource" AS ENUM ('medical_history', 'clinical_note');

-- CreateTable
CREATE TABLE "medical_histories" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "blood_type" TEXT,
    "allergies" TEXT,
    "chronic_conditions" TEXT,
    "current_medications" TEXT,
    "surgical_history" TEXT,
    "family_history" TEXT,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "appointment_id" UUID,
    "amends_note_id" UUID,
    "amendment_reason" TEXT,
    "subjective" TEXT NOT NULL,
    "objective" TEXT,
    "assessment" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" "Role" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource" "AuditResource" NOT NULL,
    "resource_id" UUID,
    "patient_id" UUID NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_histories_patient_id_key" ON "medical_histories"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_notes_appointment_id_key" ON "clinical_notes"("appointment_id");

-- CreateIndex
CREATE INDEX "clinical_notes_patient_id_created_at_idx" ON "clinical_notes"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "clinical_notes_amends_note_id_idx" ON "clinical_notes"("amends_note_id");

-- CreateIndex
CREATE INDEX "audit_logs_patient_id_created_at_idx" ON "audit_logs"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_amends_note_id_fkey" FOREIGN KEY ("amends_note_id") REFERENCES "clinical_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only the eight ABO/Rh blood types are valid
ALTER TABLE "medical_histories"
  ADD CONSTRAINT "medical_histories_blood_type_check"
  CHECK ("blood_type" IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- An amendment always has a reason, and only amendments have one
ALTER TABLE "clinical_notes"
  ADD CONSTRAINT "clinical_notes_amendment_reason_check"
  CHECK (("amends_note_id" IS NULL) = ("amendment_reason" IS NULL));

-- An amendment points to the original note, not to an appointment
ALTER TABLE "clinical_notes"
  ADD CONSTRAINT "clinical_notes_amendment_appointment_check"
  CHECK ("amends_note_id" IS NULL OR "appointment_id" IS NULL);

-- A note cannot amend itself
ALTER TABLE "clinical_notes"
  ADD CONSTRAINT "clinical_notes_not_self_amend_check"
  CHECK ("amends_note_id" IS NULL OR "amends_note_id" <> "id");

-- Append-only tables: rows can be inserted and read, never changed or deleted.
-- Row triggers do not run on TRUNCATE, so the test suite can still empty the tables.
CREATE OR REPLACE FUNCTION reject_update_or_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table "%" is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "clinical_notes_append_only"
  BEFORE UPDATE OR DELETE ON "clinical_notes"
  FOR EACH ROW EXECUTE FUNCTION reject_update_or_delete();

CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION reject_update_or_delete();
