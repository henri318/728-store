-- Preserve the upload identity separately from its expiring read URL so
-- authorized order downloads can mint a new presigned URL on demand.
ALTER TABLE "Customization" ADD COLUMN "imageUploadId" TEXT;
