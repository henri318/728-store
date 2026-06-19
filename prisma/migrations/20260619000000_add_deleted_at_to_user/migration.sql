-- AlterTable: add deletedAt column to User for soft-delete support
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
