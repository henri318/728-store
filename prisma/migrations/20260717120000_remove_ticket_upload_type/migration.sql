-- Remove the obsolete ticket category from the UploadType enum.
-- No data transformation is required because the Upload table is empty.
BEGIN;

ALTER TYPE "UploadType" RENAME TO "UploadType_old";

CREATE TYPE "UploadType" AS ENUM ('product', 'avatar', 'general', 'customization');

ALTER TABLE "Upload"
  ALTER COLUMN "type" TYPE "UploadType"
  USING ("type"::text::"UploadType");

DROP TYPE "UploadType_old";

COMMIT;
