-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMPTZ(3),
    "patient_last_read_at" TIMESTAMPTZ(3),
    "clinic_last_read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "sender_role" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_patient_id_key" ON "conversations"("patient_id");

-- CreateIndex
CREATE INDEX "conversations_status_last_message_at_idx" ON "conversations"("status", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_id_idx" ON "messages"("conversation_id", "id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A message has visible text and at most 2000 characters
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_body_length_check"
  CHECK (char_length(btrim("body")) BETWEEN 1 AND 2000);

-- Only the patient and the front desk write in a conversation
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_sender_role_check"
  CHECK ("sender_role" IN ('patient', 'employee'));

-- Messages are never edited or deleted (the function comes from the medical records migration)
CREATE TRIGGER "messages_append_only"
  BEFORE UPDATE OR DELETE ON "messages"
  FOR EACH ROW EXECUTE FUNCTION reject_update_or_delete();
