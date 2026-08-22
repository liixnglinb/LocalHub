-- 清理多用户测试数据（删除测试账号及其隔离数据）
DELETE FROM "kv" WHERE "user_id" IN (
  SELECT "id" FROM "users" WHERE "email" IN ('test2@user.com', 'user3@user.com')
);
DELETE FROM "users" WHERE "email" IN ('test2@user.com', 'user3@user.com');