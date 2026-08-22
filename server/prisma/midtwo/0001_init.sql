-- ============================================================
-- LocalHub 云端 · 初始表结构 (Supabase PostgreSQL)
-- 运行方式：在 Supabase SQL Editor 执行，或由 prisma migrate deploy 自动应用
-- ============================================================

-- 通用 KV 数据存储
CREATE TABLE IF NOT EXISTS "kv" (
    "key"        TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kv_pkey" PRIMARY KEY ("key")
);

-- 配置项（密码 hash 等）
CREATE TABLE IF NOT EXISTS "settings" (
    "key"   TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- Prisma 迁移表（若使用 prisma migrate deploy 需要）
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);