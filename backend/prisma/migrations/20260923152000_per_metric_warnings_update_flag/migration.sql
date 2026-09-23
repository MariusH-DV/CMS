-- AlterTable
ALTER TABLE "devices" DROP COLUMN "warningThresholdPercent",
ADD COLUMN     "cpuWarningThresholdPercent" INTEGER,
ADD COLUMN     "ramWarningThresholdPercent" INTEGER,
ADD COLUMN     "diskWarningThresholdPercent" INTEGER,
ADD COLUMN     "gpuWarningThresholdC" INTEGER,
ADD COLUMN     "updateRequested" BOOLEAN NOT NULL DEFAULT false;
