-- TaskFlow 2.2 Journey — oddeleny uzivatelsky cloud, stavajici user_data beze zmeny
create table if not exists public.journey_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.journey_data enable row level security;
revoke all on public.journey_data from anon;
grant select, insert, update, delete on public.journey_data to authenticated;
drop policy if exists "journey_select_own" on public.journey_data;
drop policy if exists "journey_insert_own" on public.journey_data;
drop policy if exists "journey_update_own" on public.journey_data;
drop policy if exists "journey_delete_own" on public.journey_data;
create policy "journey_select_own" on public.journey_data
 for select to authenticated using ((select auth.uid()) = user_id);
create policy "journey_insert_own" on public.journey_data
 for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "journey_update_own" on public.journey_data
 for update to authenticated using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);
create policy "journey_delete_own" on public.journey_data
 for delete to authenticated using ((select auth.uid()) = user_id);