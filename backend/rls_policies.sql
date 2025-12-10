-- LearnLynk Tech Test - Task 2: RLS Policies on leads

alter table public.leads enable row level security;
alter table public.leads force row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
-- You can use: current_setting('request.jwt.claims', true)::jsonb
alter table public.leads
add column if not exists team_id uuid references public.teams(id); --team link column for visibilty

-- TODO: write a policy so:
-- - counselors see leads where they are owner_id OR in one of their teams
create policy "leads_select_counselors" 
on public.leads 
for select
using (
  -- counselor role
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'counselor'
  -- same tenant
  and (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid = tenant_id
  and (
    -- (a) leads they own
    owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid

    -- OR (b) leads assigned to one of their teams
    or exists (
      select 1
      from public.user_teams ut
      join public.teams t on t.id = ut.team_id
      where ut.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid
        and t.id = public.leads.team_id
        and t.tenant_id = tenant_id
    )
  )
)



-- - admins can see all leads of their tenant
create policy "leads_select_admins"
on public.leads
for select
using (
  -- same tenant
  (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid = tenant_id
  -- and admin role
  and (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
);



-- TODO: add INSERT policy that:
-- - allows counselors/admins to insert leads for their tenant
-- - ensures tenant_id is correctly set/validated

create policy "leads_insert_counselors_admins"
on public.leads
for insert
with check (
  -- enforce row.tenant_id matches JWT tenant_id
  (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid = tenant_id
  -- and role is counselor or admin
  and (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('counselor', 'admin')
);