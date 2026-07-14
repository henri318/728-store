CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "street" TEXT,
    "houseNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "county" TEXT,
    "state" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "formattedAddress" TEXT,
    "floor" TEXT,
    "door" TEXT,
    "stairway" TEXT,
    "block" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UserAddress" ("id", "userId", "street", "postalCode", "city", "country", "countryCode", "createdAt", "updatedAt")
SELECT 'legacy_' || "id", "id", "addressStreet", "addressPostalCode", "addressCity", "addressCountry",
       CASE WHEN lower(coalesce("addressCountry", '')) IN ('es', 'españa', 'spain', 'espana') THEN 'ES' ELSE NULL END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE NULLIF(trim(coalesce("addressStreet", '')), '') IS NOT NULL
   OR NULLIF(trim(coalesce("addressCity", '')), '') IS NOT NULL
   OR NULLIF(trim(coalesce("addressPostalCode", '')), '') IS NOT NULL
   OR NULLIF(trim(coalesce("addressCountry", '')), '') IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "addressStreet",
  DROP COLUMN "addressCity",
  DROP COLUMN "addressPostalCode",
  DROP COLUMN "addressCountry";

ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "UserAddress_userId_key" ON "UserAddress"("userId");

ALTER TABLE "Order"
  ADD COLUMN "deliveryStreet" TEXT,
  ADD COLUMN "deliveryHouseNumber" TEXT,
  ADD COLUMN "deliveryAddressLine1" TEXT,
  ADD COLUMN "deliveryAddressLine2" TEXT,
  ADD COLUMN "deliveryPostalCode" TEXT,
  ADD COLUMN "deliveryCity" TEXT,
  ADD COLUMN "deliveryCounty" TEXT,
  ADD COLUMN "deliveryState" TEXT,
  ADD COLUMN "deliveryCountry" TEXT,
  ADD COLUMN "deliveryCountryCode" TEXT,
  ADD COLUMN "deliveryFormattedAddress" TEXT,
  ADD COLUMN "deliveryFloor" TEXT,
  ADD COLUMN "deliveryDoor" TEXT,
  ADD COLUMN "deliveryStairway" TEXT,
  ADD COLUMN "deliveryBlock" TEXT,
  ADD COLUMN "deliveryInstructions" TEXT;
