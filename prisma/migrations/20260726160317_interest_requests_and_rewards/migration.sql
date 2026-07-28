-- CreateEnum
CREATE TYPE "InterestRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MERGED');

-- DropIndex
DROP INDEX "posts_body_trgm";

-- DropIndex
DROP INDEX "projects_name_trgm";

-- DropIndex
DROP INDEX "projects_tagline_trgm";

-- DropIndex
DROP INDEX "users_displayName_trgm";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rewardPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "interest_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "InterestRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedInterestId" TEXT,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interest_requests_status_createdAt_idx" ON "interest_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "interest_requests_requesterId_idx" ON "interest_requests"("requesterId");

-- AddForeignKey
ALTER TABLE "interest_requests" ADD CONSTRAINT "interest_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_requests" ADD CONSTRAINT "interest_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_requests" ADD CONSTRAINT "interest_requests_publishedInterestId_fkey" FOREIGN KEY ("publishedInterestId") REFERENCES "universes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest_requests" ADD CONSTRAINT "interest_requests_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "interest_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
