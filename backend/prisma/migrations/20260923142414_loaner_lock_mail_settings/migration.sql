-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "isLoaner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockPin" TEXT,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shutdownRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "warningLastSentAt" TIMESTAMP(3),
ADD COLUMN     "warningThresholdPercent" INTEGER;

-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "expiryWarningSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mail_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "password" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "alertRecipientEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_settings_pkey" PRIMARY KEY ("id")
);
