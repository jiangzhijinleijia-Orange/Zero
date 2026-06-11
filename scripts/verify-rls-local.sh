#!/usr/bin/env bash
# =============================================================================
# RLS 検証(ローカル PostgreSQL 版)
#
# Supabase CLI / Docker がない環境でも、素の PostgreSQL 16+ だけで
# マイグレーションの適用と RLS の権限分離を検証する。
#   - Supabase の auth スキーマ(auth.users / auth.uid())と
#     anon / authenticated ロールを模擬してから migrations を適用し、
#     scripts/rls_check.sql の25シナリオを実行する。
#
# 使い方:
#   sudo -u postgres bash scripts/verify-rls-local.sh
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

DB=zero_rls_check

psql -v ON_ERROR_STOP=1 -c "drop database if exists ${DB};"
psql -v ON_ERROR_STOP=1 -c "create database ${DB};"

psql -v ON_ERROR_STOP=1 -d "${DB}" <<'EOF'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
create schema if not exists auth;
create table auth.users (id uuid primary key, email text, last_sign_in_at timestamptz);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::json->>'sub')::uuid
$$;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
EOF

for f in supabase/migrations/*.sql; do
  echo "applying ${f}"
  psql -v ON_ERROR_STOP=1 -d "${DB}" -f "${f}" >/dev/null
done

psql -v ON_ERROR_STOP=1 -d "${DB}" -f scripts/rls_check.sql | grep -E "PASSED" \
  && echo "OK: RLS verification passed."

psql -v ON_ERROR_STOP=1 -c "drop database ${DB};"
