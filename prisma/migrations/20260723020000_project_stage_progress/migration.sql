-- AlterTable: build-in-public journey fields on projects
ALTER TABLE "projects" ADD COLUMN     "stage" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;
