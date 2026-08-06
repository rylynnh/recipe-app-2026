-- Invite-only shared household access for the recipe app.
-- Run this migration in the Supabase SQL editor before deploying the client changes.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My recipe household',
  created_at timestamptz not null default now()
);

create table if not exists public.allowed_emails (
  email text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Adds tenancy fields without deleting existing data. Existing rows must be assigned
-- to a household once, before RLS is enabled (see README).
alter table public.recipes add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.recipes add column if not exists owner_id uuid references auth.users(id);
alter table public.todos add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.todos add column if not exists owner_id uuid references auth.users(id);
alter table public.food_items add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.food_items add column if not exists owner_id uuid references auth.users(id);
alter table public.unit_conversions add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.unit_conversions add column if not exists owner_id uuid references auth.users(id);
alter table public.review_items add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.review_items add column if not exists owner_id uuid references auth.users(id);

create index if not exists recipes_household_id_idx on public.recipes(household_id);
create index if not exists todos_household_id_idx on public.todos(household_id);
create index if not exists food_items_household_id_idx on public.food_items(household_id);
create index if not exists unit_conversions_household_id_idx on public.unit_conversions(household_id);
create index if not exists review_items_household_id_idx on public.review_items(household_id);

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Called by the client after a successful Magic Link login. It claims the
-- allow-list entry for the signed-in email; an uninvited account gets no access.
create or replace function public.claim_household_access()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.allowed_emails%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into invite
  from public.allowed_emails
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));

  if invite.household_id is null then
    raise exception 'This email is not on the allow list';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (invite.household_id, auth.uid(), invite.role)
  on conflict (household_id, user_id) do update set role = excluded.role;

  return invite.household_id;
end;
$$;

create or replace function public.assign_household_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.household_id is null then new.household_id := public.current_household_id(); end if;
  if new.owner_id is null then new.owner_id := auth.uid(); end if;
  if new.household_id is null then raise exception 'No household access'; end if;
  return new;
end;
$$;

drop trigger if exists recipes_assign_household on public.recipes;
create trigger recipes_assign_household before insert on public.recipes for each row execute function public.assign_household_context();
drop trigger if exists todos_assign_household on public.todos;
create trigger todos_assign_household before insert on public.todos for each row execute function public.assign_household_context();
drop trigger if exists food_items_assign_household on public.food_items;
create trigger food_items_assign_household before insert on public.food_items for each row execute function public.assign_household_context();
drop trigger if exists unit_conversions_assign_household on public.unit_conversions;
create trigger unit_conversions_assign_household before insert on public.unit_conversions for each row execute function public.assign_household_context();
drop trigger if exists review_items_assign_household on public.review_items;
create trigger review_items_assign_household before insert on public.review_items for each row execute function public.assign_household_context();

alter table public.households enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.todos enable row level security;
alter table public.food_items enable row level security;
alter table public.unit_conversions enable row level security;
alter table public.review_items enable row level security;

-- Remove old policies so a legacy permissive policy cannot bypass this migration.
do $$
declare policy_record record;
begin
  for policy_record in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('households', 'allowed_emails', 'household_members', 'recipes', 'todos', 'food_items', 'unit_conversions', 'review_items')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy "members read household" on public.households for select to authenticated using (public.is_household_member(id));
create policy "members read themselves" on public.household_members for select to authenticated using (user_id = auth.uid() or public.is_household_owner(household_id));
create policy "owners manage members" on public.household_members for all to authenticated using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));
create policy "owners read allow list" on public.allowed_emails for select to authenticated using (public.is_household_owner(household_id));
create policy "owners manage allow list" on public.allowed_emails for all to authenticated using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));

create policy "recipes members read" on public.recipes for select to authenticated using (public.is_household_member(household_id));
create policy "recipes members insert" on public.recipes for insert to authenticated with check (public.is_household_member(household_id));
create policy "recipes members update" on public.recipes for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "recipes owners delete" on public.recipes for delete to authenticated using (public.is_household_owner(household_id));

create policy "todos members read" on public.todos for select to authenticated using (public.is_household_member(household_id));
create policy "todos members insert" on public.todos for insert to authenticated with check (public.is_household_member(household_id));
create policy "todos members update" on public.todos for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "todos owners delete" on public.todos for delete to authenticated using (public.is_household_owner(household_id));

create policy "food members read" on public.food_items for select to authenticated using (public.is_household_member(household_id));
create policy "food members insert" on public.food_items for insert to authenticated with check (public.is_household_member(household_id));
create policy "food members update" on public.food_items for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "food owners delete" on public.food_items for delete to authenticated using (public.is_household_owner(household_id));

create policy "conversions members read" on public.unit_conversions for select to authenticated using (public.is_household_member(household_id));
create policy "conversions members insert" on public.unit_conversions for insert to authenticated with check (public.is_household_member(household_id));
create policy "conversions members update" on public.unit_conversions for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "conversions owners delete" on public.unit_conversions for delete to authenticated using (public.is_household_owner(household_id));

create policy "reviews members read" on public.review_items for select to authenticated using (public.is_household_member(household_id));
create policy "reviews members insert" on public.review_items for insert to authenticated with check (public.is_household_member(household_id));
create policy "reviews members update" on public.review_items for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "reviews owners delete" on public.review_items for delete to authenticated using (public.is_household_owner(household_id));

revoke all on public.households, public.allowed_emails, public.household_members, public.recipes, public.todos, public.food_items, public.unit_conversions, public.review_items from anon;
grant select, insert, update, delete on public.households, public.allowed_emails, public.household_members, public.recipes, public.todos, public.food_items, public.unit_conversions, public.review_items to authenticated;

-- Create a PRIVATE bucket named recipe-images in the Supabase dashboard, then run:
-- create policy "household images read" on storage.objects for select to authenticated
-- using (bucket_id = 'recipe-images' and public.is_household_member((storage.foldername(name))[1]::uuid));
-- create policy "household images upload" on storage.objects for insert to authenticated
-- with check (bucket_id = 'recipe-images' and public.is_household_member((storage.foldername(name))[1]::uuid));
-- create policy "household images update" on storage.objects for update to authenticated
-- using (bucket_id = 'recipe-images' and public.is_household_member((storage.foldername(name))[1]::uuid));
-- create policy "household images delete" on storage.objects for delete to authenticated
-- using (bucket_id = 'recipe-images' and public.is_household_owner((storage.foldername(name))[1]::uuid));
