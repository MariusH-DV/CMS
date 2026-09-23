-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "cpuLoadPercent" DOUBLE PRECISION,
ADD COLUMN     "diskUsedPercent" DOUBLE PRECISION,
ADD COLUMN     "gpuAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gpuMemMb" INTEGER,
ADD COLUMN     "gpuTempC" DOUBLE PRECISION,
ADD COLUMN     "memUsedPercent" DOUBLE PRECISION,
ADD COLUMN     "uptimeSeconds" INTEGER;

-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "brandingEnabled" BOOLEAN NOT NULL DEFAULT false;
