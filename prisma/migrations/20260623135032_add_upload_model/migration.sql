-- DropIndex
DROP INDEX "Category_slug_idx";

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Upload_storageKey_key" ON "Upload"("storageKey");

-- CreateIndex
CREATE INDEX "Upload_uploadedBy_idx" ON "Upload"("uploadedBy");

-- CreateIndex
CREATE INDEX "Upload_type_status_idx" ON "Upload"("type", "status");

-- CreateIndex
CREATE INDEX "Upload_status_createdAt_idx" ON "Upload"("status", "createdAt");
