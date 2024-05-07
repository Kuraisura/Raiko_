-- Safe to run more than once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  recipient_email text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages
  drop constraint if exists contact_messages_name_check,
  drop constraint if exists contact_messages_email_check,
  drop constraint if exists contact_messages_subject_check,
  drop constraint if exists contact_messages_message_check;

alter table public.contact_messages
  add constraint contact_messages_name_check check (char_length(btrim(name)) between 2 and 25),
  add constraint contact_messages_email_check check (
    char_length(email) between 5 and 40
    and email ~ '^[A-Za-z0-9]+(\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$'
  ),
  add constraint contact_messages_subject_check check (char_length(btrim(subject)) between 3 and 25),
  add constraint contact_messages_message_check check (char_length(btrim(message)) between 10 and 500);

alter table public.contact_messages enable row level security;

drop policy if exists "Public can submit contact messages" on public.contact_messages;
create policy "Public can submit contact messages"
on public.contact_messages
for insert
to anon
with check (true);

revoke all on public.contact_messages from anon;
grant insert on public.contact_messages to anon;
