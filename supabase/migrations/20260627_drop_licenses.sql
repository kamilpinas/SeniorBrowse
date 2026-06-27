-- Licensing/payments removed — SeniorBrowse is free for everyone now.
-- Drops the table created by 20260517_create_licenses.sql and extended by
-- 20260518_add_install_id.sql / 20260611_lock_down_licenses_rls.sql.
-- check-url's rate_limits table/function (20260612_rate_limits.sql) is
-- unrelated and stays.

drop table if exists public.licenses cascade;
