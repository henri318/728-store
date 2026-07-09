-- AlterTable
ALTER TABLE "ProductTranslation"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "designChangeDescription" TEXT;

-- Backfill legacy translated fields from Product.customizationConfig into the
-- default Spanish translation when the new columns are still empty.
WITH legacy_translation_data AS (
  SELECT
    p.id AS product_id,
    CASE
      WHEN jsonb_typeof(p."customizationConfig" -> 'tagNames') = 'array' THEN ARRAY(
        SELECT jsonb_array_elements_text(p."customizationConfig" -> 'tagNames')
      )
      ELSE NULL
    END AS tags,
    CASE
      WHEN jsonb_typeof(p."customizationConfig" -> 'sizeOptions') = 'array' THEN ARRAY(
        SELECT jsonb_array_elements_text(p."customizationConfig" -> 'sizeOptions')
      )
      ELSE NULL
    END AS sizes,
    NULLIF(p."customizationConfig" ->> 'designChangeDescription', '') AS "designChangeDescription"
  FROM "Product" p
  WHERE p."customizationConfig" IS NOT NULL
)
UPDATE "ProductTranslation" pt
SET
  tags = CASE
    WHEN cardinality(pt.tags) = 0 AND legacy.tags IS NOT NULL THEN legacy.tags
    ELSE pt.tags
  END,
  sizes = CASE
    WHEN cardinality(pt.sizes) = 0 AND legacy.sizes IS NOT NULL THEN legacy.sizes
    ELSE pt.sizes
  END,
  "designChangeDescription" = CASE
    WHEN pt."designChangeDescription" IS NULL AND legacy."designChangeDescription" IS NOT NULL
      THEN legacy."designChangeDescription"
    ELSE pt."designChangeDescription"
  END
FROM legacy_translation_data legacy
WHERE pt."productId" = legacy.product_id
  AND pt.locale = 'es'
  AND (
    (cardinality(pt.tags) = 0 AND legacy.tags IS NOT NULL)
    OR (cardinality(pt.sizes) = 0 AND legacy.sizes IS NOT NULL)
    OR (pt."designChangeDescription" IS NULL AND legacy."designChangeDescription" IS NOT NULL)
  );
