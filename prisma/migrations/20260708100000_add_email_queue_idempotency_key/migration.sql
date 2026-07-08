-- AlterTable
ALTER TABLE "EmailQueue" ADD COLUMN     "idempotencyKey" TEXT;

-- Backfill existing rows with a deterministic placeholder to satisfy the unique constraint.
UPDATE "EmailQueue"
SET "idempotencyKey" = COALESCE("idempotencyKey", CONCAT("template", ':', "to", ':', "id"));

-- AlterTable
ALTER TABLE "EmailQueue" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EmailQueue_idempotencyKey_key" ON "EmailQueue"("idempotencyKey");
