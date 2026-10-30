-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('call', 'meeting', 'email', 'task');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'call',
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "dealId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_tenantId_type_done_date_idx" ON "activities"("tenantId", "type", "done", "date");

-- CreateIndex
CREATE INDEX "activities_tenantId_date_idx" ON "activities"("tenantId", "date");

-- CreateIndex
CREATE INDEX "activities_tenantId_customerId_date_idx" ON "activities"("tenantId", "customerId", "date");

-- CreateIndex
CREATE INDEX "activities_tenantId_dealId_idx" ON "activities"("tenantId", "dealId");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
