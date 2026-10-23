-- TaskFlow 2.0: read-only security audit. Run in Supabase SQL Editor.
-- Configuration inspection does not replace a two-user isolation test.
select c.relname as tablename,
       c.relrowsecurity as rowsecurity,
       c.relforcerowsecurity as forcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'user_data'
  and c.relkind in ('r', 'p');

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'user_data'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'user_data'
order by grantee, privilege_type;
