create extension if not exists pgcrypto;

create table if not exists public.chatbot_knowledge (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  category text not null default 'general',
  question text not null,
  answer text not null,
  keywords text,
  visibility text not null default 'public',
  is_published boolean not null default true,
  priority integer not null default 0,
  notes text
);

create index if not exists idx_chatbot_knowledge_visibility_published
  on public.chatbot_knowledge (visibility, is_published, priority desc, updated_at desc);

create index if not exists idx_chatbot_knowledge_category
  on public.chatbot_knowledge (category, priority desc, updated_at desc);

alter table public.chatbot_knowledge enable row level security;

drop policy if exists "chatbot_knowledge_select_public" on public.chatbot_knowledge;
create policy "chatbot_knowledge_select_public"
on public.chatbot_knowledge
for select
to anon
using (visibility = 'public' and is_published = true);

drop policy if exists "chatbot_knowledge_select_authenticated_all" on public.chatbot_knowledge;
create policy "chatbot_knowledge_select_authenticated_all"
on public.chatbot_knowledge
for select
to authenticated
using (true);

drop policy if exists "chatbot_knowledge_insert_authenticated" on public.chatbot_knowledge;
create policy "chatbot_knowledge_insert_authenticated"
on public.chatbot_knowledge
for insert
to authenticated
with check (true);

drop policy if exists "chatbot_knowledge_update_authenticated" on public.chatbot_knowledge;
create policy "chatbot_knowledge_update_authenticated"
on public.chatbot_knowledge
for update
to authenticated
using (true)
with check (true);

drop policy if exists "chatbot_knowledge_delete_authenticated" on public.chatbot_knowledge;
create policy "chatbot_knowledge_delete_authenticated"
on public.chatbot_knowledge
for delete
to authenticated
using (true);
