-- AlterTable: add firstName, lastName, and address columns to User
ALTER TABLE "User"
  ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "addressStreet" TEXT,
  ADD COLUMN "addressCity" TEXT,
  ADD COLUMN "addressPostalCode" TEXT,
  ADD COLUMN "addressCountry" TEXT;

-- Update role default to new enum values
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- CreateTable: Role
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- Data backfill: map old role values to new enum
UPDATE "User" SET "role" = 'CUSTOMER' WHERE "role" = 'client';
UPDATE "User" SET "role" = 'CUSTOMER' WHERE "role" = 'guest';
UPDATE "User" SET "role" = 'CUSTOMER' WHERE "role" = 'shop';
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'admin';
