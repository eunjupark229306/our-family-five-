create table if not exists public.family_data (
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table public.family_data enable row level security;

create policy "Users can read own data"
on public.family_data for select
using (auth.uid() = user_id);

create policy "Users can insert own data"
on public.family_data for insert
with check (auth.uid() = user_id);

create policy "Users can update own data"
on public.family_data for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);