-- Create or replace function to check if user is an editor
alter table public.persons enable row level security;
create or replace function public.is_editor()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'editor'
  );
end;
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

-- Drop existing admin-only policies
drop policy if exists "Admins can insert persons" on public.persons;
drop policy if exists "Admins can update persons" on public.persons;
drop policy if exists "Admins can delete persons" on public.persons;

-- INSERT
create policy "Admins and Editors can insert persons"
on public.persons
for insert
to authenticated
with check (
  public.is_admin() OR public.is_editor()
);

-- UPDATE
create policy "Admins and Editors can update persons"
on public.persons
for update
to authenticated
using (
  public.is_admin() OR public.is_editor()
)
with check (
  public.is_admin() OR public.is_editor()
);

-- DELETE
create policy "Admins and Editors can delete persons"
on public.persons
for delete
to authenticated
using (
  public.is_admin() OR public.is_editor()
);


drop policy if exists "Admins can insert relationships" on public.relationships;
drop policy if exists "Admins can update relationships" on public.relationships;
drop policy if exists "Admins can delete relationships" on public.relationships;

-- INSERT
create policy "Admins and Editors can insert relationships"
on public.relationships
for insert
to authenticated
with check (
  public.is_admin() OR public.is_editor()
);

-- UPDATE
create policy "Admins and Editors can update relationships"
on public.relationships
for update
to authenticated
using (
  public.is_admin() OR public.is_editor()
)
with check (
  public.is_admin() OR public.is_editor()
);

-- DELETE
create policy "Admins and Editors can delete relationships"
on public.relationships
for delete
to authenticated
using (
  public.is_admin() OR public.is_editor()
);