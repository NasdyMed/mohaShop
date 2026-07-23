ALTER TABLE "Order"
ADD COLUMN "customerEmail" TEXT,
ADD COLUMN "customerAddressComplement" TEXT,
ADD COLUMN "customerCity" TEXT NOT NULL DEFAULT 'Non renseignée',
ADD COLUMN "customerRegion" TEXT NOT NULL DEFAULT 'Non renseignée',
ADD COLUMN "customerPostalCode" TEXT,
ADD COLUMN "customerCountry" TEXT NOT NULL DEFAULT 'Maroc',
ADD COLUMN "deliveryNotes" TEXT;

ALTER TABLE "Order"
ALTER COLUMN "customerCity" DROP DEFAULT,
ALTER COLUMN "customerRegion" DROP DEFAULT;
