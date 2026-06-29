-- RestoreIndex
-- The Category_slug_idx was inadvertently dropped in the Upload model migration.
-- This migration restores it as a separate, focused change.
CREATE INDEX "Category_slug_idx" ON "Category"("slug");
