-- ============================================================
-- LocalHub 云端 · 多用户改造迁移 (0002)
-- 1. 新建 users 表
-- 2. kv 表增加 user_id 外键，按用户隔离
-- 3. 将已有的单用户数据迁移到"管理员"账号
-- ============================================================

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id"            TEXT NOT NULL,
    "email"         TEXT,
    "password_hash" TEXT,
    "github_id"     TEXT,
    "github_login"  TEXT,
    "display_name"  TEXT,
    "avatar_url"    TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 唯一索引（Postgres 允许多个 NULL，所以唯一索引不影响多个邮箱/GitHub 账号为 NULL）
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_github_id_key" ON "users"("github_id");

-- 2. 迁移：把现存 kv 数据归属到一个默认"管理员"账号
-- 若已有该账号则复用，否则创建一个默认管理员（邮箱 admin@localhub.local，密码走 settings 的旧密码）
INSERT INTO "users" ("id", "email")
SELECT 'migrated-admin', 'admin@localhub.local'
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "id" = 'migrated-admin');

-- 给现存 kv 数据附加 user_id（只处理还没有 user_id 的老数据）
ALTER TABLE "kv" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

UPDATE "kv" SET "user_id" = 'migrated-admin' WHERE "user_id" IS NULL;

-- 3. 重建 kv 主键为 (user_id, key)
ALTER TABLE "kv" DROP CONSTRAINT IF EXISTS "kv_pkey";
ALTER TABLE "kv" ADD CONSTRAINT "kv_pkey" PRIMARY KEY ("user_id", "key");

-- 4. 外键约束
ALTER TABLE "kv" DROP CONSTRAINT IF EXISTS "kv_user_id_fkey";
ALTER TABLE "kv"
    ADD CONSTRAINT "kv_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "kv_user_id_idx" ON "kv"("user_id");