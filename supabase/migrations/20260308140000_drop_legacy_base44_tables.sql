-- Drop legacy base44 PascalCase orphan tables (applied to production 2026-03-08)
-- User/Beacon kept: too many FK deps. UserActivity/EventRSVP/kv_store_* safe to drop.

DROP TABLE IF EXISTS "UserActivity" CASCADE;
DROP TABLE IF EXISTS "EventRSVP" CASCADE;
DROP TABLE IF EXISTS kv_store_1e88289c CASCADE;
DROP TABLE IF EXISTS kv_store_5bd13760 CASCADE;
DROP TABLE IF EXISTS kv_store_6a0a6a97 CASCADE;
DROP TABLE IF EXISTS kv_store_c26c7b56 CASCADE;
DROP TABLE IF EXISTS kv_store_f739775c CASCADE;
