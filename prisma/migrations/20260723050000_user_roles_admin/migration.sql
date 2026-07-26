-- Platform RBAC for the admin panel + a BANNED account state.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'BANNED';

CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPPORT', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
CREATE INDEX "users_role_idx" ON "users"("role");
