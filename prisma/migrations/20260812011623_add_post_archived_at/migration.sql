-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "posts_archivedAt_idx" ON "posts"("archivedAt");
