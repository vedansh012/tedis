-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "isSeeded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "post_media" ADD COLUMN     "blurDataUrl" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "isSeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "company" TEXT,
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSeeded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "postsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_postsCount_idx" ON "tags"("postsCount");

-- CreateIndex
CREATE INDEX "post_tags_tagId_createdAt_idx" ON "post_tags"("tagId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_score_createdAt_idx" ON "posts"("score", "createdAt");

-- CreateIndex
CREATE INDEX "users_isSeeded_idx" ON "users"("isSeeded");

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
