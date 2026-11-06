-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('lab_result', 'imaging', 'prescription', 'referral', 'other');

-- AlterEnum
ALTER TYPE "AuditResource" ADD VALUE 'attachment';

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "clinical_note_id" UUID,
    "uploaded_by_id" UUID NOT NULL,
    "uploader_role" "Role" NOT NULL,
    "category" "AttachmentCategory" NOT NULL DEFAULT 'other',
    "description" TEXT,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "voided_by_id" UUID,
    "voided_at" TIMESTAMPTZ(3),
    "void_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "attachments_patient_id_created_at_idx" ON "attachments"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_id_idx" ON "attachments"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_clinical_note_id_fkey" FOREIGN KEY ("clinical_note_id") REFERENCES "clinical_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only these file types are accepted; the API checks the real type from the file content
ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_mime_type_check"
  CHECK ("mime_type" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'));

-- Between 1 byte and 10 MB
ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_size_check"
  CHECK ("size_bytes" BETWEEN 1 AND 10485760);

-- SHA-256 in lowercase hexadecimal
ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_sha256_check"
  CHECK ("sha256" ~ '^[0-9a-f]{64}$');

-- Admins never upload files
ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_uploader_role_check"
  CHECK ("uploader_role" IN ('doctor', 'employee', 'patient'));

-- Review and void data are complete or empty, never half filled
ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_review_check"
  CHECK (("reviewed_by_id" IS NULL) = ("reviewed_at" IS NULL));

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_void_check"
  CHECK (
    ("voided_by_id" IS NULL) = ("voided_at" IS NULL)
    AND ("voided_at" IS NULL) = ("void_reason" IS NULL)
  );

-- Attachments are never deleted. Only the review and void fields can be set, and only once.
CREATE OR REPLACE FUNCTION attachments_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Attachments cannot be deleted; void them instead'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF (NEW.id, NEW.patient_id, NEW.clinical_note_id, NEW.uploaded_by_id, NEW.uploader_role,
      NEW.category, NEW.description, NEW.original_name, NEW.mime_type, NEW.size_bytes,
      NEW.sha256, NEW.storage_key, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.patient_id, OLD.clinical_note_id, OLD.uploaded_by_id, OLD.uploader_role,
      OLD.category, OLD.description, OLD.original_name, OLD.mime_type, OLD.size_bytes,
      OLD.sha256, OLD.storage_key, OLD.created_at) THEN
    RAISE EXCEPTION 'Only the review and void fields of an attachment can change'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF OLD.reviewed_at IS NOT NULL
     AND (NEW.reviewed_by_id, NEW.reviewed_at) IS DISTINCT FROM (OLD.reviewed_by_id, OLD.reviewed_at) THEN
    RAISE EXCEPTION 'An attachment can only be reviewed once'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF OLD.voided_at IS NOT NULL
     AND (NEW.voided_by_id, NEW.voided_at, NEW.void_reason)
         IS DISTINCT FROM (OLD.voided_by_id, OLD.voided_at, OLD.void_reason) THEN
    RAISE EXCEPTION 'A voided attachment cannot change'
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "attachments_guard"
  BEFORE UPDATE OR DELETE ON "attachments"
  FOR EACH ROW EXECUTE FUNCTION attachments_guard();
