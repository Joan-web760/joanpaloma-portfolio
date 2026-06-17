create extension if not exists pgcrypto;

create table if not exists public.chatbot_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_name text,
  page_url text,
  user_agent text,
  ip_address text,
  user_message text not null,
  assistant_response text,
  model text,
  status text not null default 'completed',
  is_reviewed boolean not null default false,
  reviewed_at timestamptz
);

create index if not exists idx_chatbot_logs_created_at
  on public.chatbot_logs (created_at desc);

create index if not exists idx_chatbot_logs_is_reviewed
  on public.chatbot_logs (is_reviewed, created_at desc);

alter table public.chatbot_logs enable row level security;

drop policy if exists "chatbot_logs_insert_anon" on public.chatbot_logs;
create policy "chatbot_logs_insert_anon"
on public.chatbot_logs
for insert
to anon, authenticated
with check (true);

drop policy if exists "chatbot_logs_select_authenticated" on public.chatbot_logs;
create policy "chatbot_logs_select_authenticated"
on public.chatbot_logs
for select
to authenticated
using (true);

drop policy if exists "chatbot_logs_update_authenticated" on public.chatbot_logs;
create policy "chatbot_logs_update_authenticated"
on public.chatbot_logs
for update
to authenticated
using (true)
with check (true);

drop policy if exists "chatbot_logs_delete_authenticated" on public.chatbot_logs;
create policy "chatbot_logs_delete_authenticated"
on public.chatbot_logs
for delete
to authenticated
using (true);
