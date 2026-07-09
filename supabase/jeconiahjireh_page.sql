create extension if not exists pgcrypto;

create table if not exists public.jeconiahjireh_page (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null default 'Jeconiah Jireh',
  description text not null default 'A private chatbot page for Joan Paloma''s daughter.',
  kicker text not null default 'Private page',
  heading text not null default 'Jeconiah Jireh',
  intro text not null default 'A private space made for Joan Paloma''s daughter, Jeconiah Jireh. Ask questions, draft ideas, learn something new, or talk through everyday thoughts with a gentle assistant.',
  chatbot_title text not null default 'Jeconiah Jireh',
  chatbot_subtitle text not null default 'Private everyday assistant',
  status_label text not null default 'Private assistant',
  placeholder text not null default 'Ask anything, Jeconiah Jireh...',
  button_label text not null default 'Send',
  welcome_message text not null default 'Hi Jeconiah Jireh. This is your private assistant. You can ask for help with writing, studying, ideas, plans, or anything you want to understand better. I will format replies in Markdown so they are easy to read.',
  quick_prompts text[] not null default array[
    'Help me understand something in simple words.',
    'Help me brainstorm an idea.',
    'Draft a kind message for me.',
    'Give me step-by-step instructions.'
  ],
  lead_prompts text[] not null default array[
    'Ask me clarifying questions first.',
    'Make this sound warmer.',
    'Turn this into action steps.'
  ],
  system_prompt text not null default 'Answer as a kind, general-purpose private assistant for Joan Paloma''s daughter, Jeconiah Jireh. Jeconiah Jireh is her first name. Help with writing, learning, planning, brainstorming, decisions, and everyday questions. Keep responses warm, clear, age-appropriate, and practical. Use Markdown formatting for every response. Do not request sensitive personal information.',
  is_published boolean not null default true
);

create index if not exists idx_jeconiahjireh_page_published_updated
  on public.jeconiahjireh_page (is_published, updated_at desc);

alter table public.jeconiahjireh_page enable row level security;

drop policy if exists "jeconiahjireh_page_select_published" on public.jeconiahjireh_page;
create policy "jeconiahjireh_page_select_published"
on public.jeconiahjireh_page
for select
to anon
using (is_published = true);

drop policy if exists "jeconiahjireh_page_select_authenticated_all" on public.jeconiahjireh_page;
create policy "jeconiahjireh_page_select_authenticated_all"
on public.jeconiahjireh_page
for select
to authenticated
using (true);

drop policy if exists "jeconiahjireh_page_insert_authenticated" on public.jeconiahjireh_page;
create policy "jeconiahjireh_page_insert_authenticated"
on public.jeconiahjireh_page
for insert
to authenticated
with check (true);

drop policy if exists "jeconiahjireh_page_update_authenticated" on public.jeconiahjireh_page;
create policy "jeconiahjireh_page_update_authenticated"
on public.jeconiahjireh_page
for update
to authenticated
using (true)
with check (true);

drop policy if exists "jeconiahjireh_page_delete_authenticated" on public.jeconiahjireh_page;
create policy "jeconiahjireh_page_delete_authenticated"
on public.jeconiahjireh_page
for delete
to authenticated
using (true);

insert into public.jeconiahjireh_page (
  title,
  description,
  kicker,
  heading,
  intro,
  chatbot_title,
  chatbot_subtitle,
  status_label,
  placeholder,
  button_label,
  welcome_message,
  quick_prompts,
  lead_prompts,
  system_prompt,
  is_published
)
select
  'Jeconiah Jireh',
  'A private chatbot page for Joan Paloma''s daughter.',
  'Private page',
  'Jeconiah Jireh',
  'A private space made for Joan Paloma''s daughter, Jeconiah Jireh. Ask questions, draft ideas, learn something new, or talk through everyday thoughts with a gentle assistant.',
  'Jeconiah Jireh',
  'Private everyday assistant',
  'Private assistant',
  'Ask anything, Jeconiah Jireh...',
  'Send',
  'Hi Jeconiah Jireh. This is your private assistant. You can ask for help with writing, studying, ideas, plans, or anything you want to understand better. I will format replies in Markdown so they are easy to read.',
  array[
    'Help me understand something in simple words.',
    'Help me brainstorm an idea.',
    'Draft a kind message for me.',
    'Give me step-by-step instructions.'
  ],
  array[
    'Ask me clarifying questions first.',
    'Make this sound warmer.',
    'Turn this into action steps.'
  ],
  'Answer as a kind, general-purpose private assistant for Joan Paloma''s daughter, Jeconiah Jireh. Jeconiah Jireh is her first name. Help with writing, learning, planning, brainstorming, decisions, and everyday questions. Keep responses warm, clear, age-appropriate, and practical. Use Markdown formatting for every response. Do not request sensitive personal information.',
  true
where not exists (select 1 from public.jeconiahjireh_page);
