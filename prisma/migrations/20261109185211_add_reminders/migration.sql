-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('day_before');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('pending', 'sent', 'failed', 'cancelled', 'skipped');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('email', 'whatsapp');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "email_reminders_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "kind" "ReminderKind" NOT NULL DEFAULT 'day_before',
    "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'pending',
    "channel" "ReminderChannel",
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_reminders_status_scheduled_for_idx" ON "appointment_reminders"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_reminders_appointment_id_kind_key" ON "appointment_reminders"("appointment_id", "kind");

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A contact email, when present, looks like an email (the API validates it fully)
ALTER TABLE "patients"
  ADD CONSTRAINT "patients_contact_email_check"
  CHECK ("contact_email" IS NULL OR "contact_email" ~ '^[^@\s]+@[^@\s]+$');

ALTER TABLE "appointment_reminders"
  ADD CONSTRAINT "appointment_reminders_attempts_check"
  CHECK ("attempts" >= 0);

-- A sent reminder always says when and through which channel; only sent ones have sent_at
ALTER TABLE "appointment_reminders"
  ADD CONSTRAINT "appointment_reminders_sent_check"
  CHECK (("status" = 'sent') = ("sent_at" IS NOT NULL) AND ("status" <> 'sent' OR "channel" IS NOT NULL));
