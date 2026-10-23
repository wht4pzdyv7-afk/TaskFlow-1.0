-- TaskFlow 2.0: read-only security audit. Run in Supabase SQL Editor.
-- Note: this checks policy configuration, NOT cross-user isolation in a browser.
select tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname='public' and tablename='user_data';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='user_data'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='user_data'
order by grantee, privilege_type;
