-- TALAZA: mensagens reais entre utilizadores
-- Executar uma única vez no Supabase SQL Editor.
-- Mantém RLS ativo e limita conversas a utilizadores da mesma província principal.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  province_id uuid not null references public.provinces(id) on delete restrict,
  source text not null default 'Vitrine'
    check (source in ('Vitrine','Contratar','Comunidade Talaza','Oportunidades','Eventos','Ebooks','Outro')),
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text check (body is null or length(trim(body)) between 1 and 5000),
  storage_path text,
  attachment_name text,
  message_type text not null default 'text' check (message_type in ('text','image','file','audio')),
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists storage_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages alter column body drop not null;
do $
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_message_type_check') then
    alter table public.messages add constraint messages_message_type_check check (message_type in ('text','image','file','audio'));
  end if;
end $;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-attachments', 'message-attachments', false, 15728640, null)
on conflict (id) do nothing;

drop policy if exists "Talaza participants read message attachments" on storage.objects;
create policy "Talaza participants read message attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'message-attachments'
  and public.talaza_is_conversation_participant((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Talaza participants upload message attachments" on storage.objects;
create policy "Talaza participants upload message attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-attachments'
  and public.talaza_is_conversation_participant((storage.foldername(name))[1]::uuid)
  and (storage.foldername(name))[2] = auth.uid()::text
);

create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);
create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.talaza_is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function public.talaza_is_conversation_creator(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.created_by = auth.uid()
  );
$;

revoke all on function public.talaza_is_conversation_creator(uuid) from public;
grant execute on function public.talaza_is_conversation_creator(uuid) to authenticated;

create or replace function public.talaza_conversation_province(p_conversation_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $
  select c.province_id from public.conversations c where c.id = p_conversation_id;
$;

revoke all on function public.talaza_conversation_province(uuid) from public;
grant execute on function public.talaza_conversation_province(uuid) to authenticated;

create or replace function public.talaza_same_primary_province(p_user_id uuid, p_province_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.province_id = p_province_id
  );
$$;

revoke all on function public.talaza_is_conversation_participant(uuid) from public;
grant execute on function public.talaza_is_conversation_participant(uuid) to authenticated;
revoke all on function public.talaza_same_primary_province(uuid, uuid) from public;
grant execute on function public.talaza_same_primary_province(uuid, uuid) to authenticated;

drop policy if exists "Talaza participants read their conversations" on public.conversations;
create policy "Talaza participants read their conversations"
on public.conversations for select to authenticated
using (public.talaza_is_conversation_participant(id));

drop policy if exists "Talaza users create conversations in their province" on public.conversations;
create policy "Talaza users create conversations in their province"
on public.conversations for insert to authenticated
with check (
  created_by = auth.uid()
  and public.talaza_same_primary_province(auth.uid(), province_id)
);

drop policy if exists "Talaza participants update conversation timestamp" on public.conversations;
create policy "Talaza participants update conversation timestamp"
on public.conversations for update to authenticated
using (public.talaza_is_conversation_participant(id))
with check (public.talaza_is_conversation_participant(id));

drop policy if exists "Talaza users read participants in their conversations" on public.conversation_participants;
create policy "Talaza users read participants in their conversations"
on public.conversation_participants for select to authenticated
using (public.talaza_is_conversation_participant(conversation_id));

drop policy if exists "Talaza conversation creator adds same-province participants" on public.conversation_participants;
create policy "Talaza conversation creator adds same-province participants"
on public.conversation_participants for insert to authenticated
with check (
  public.talaza_same_primary_province(
    user_id,
    public.talaza_conversation_province(conversation_id)
  )
  and public.talaza_is_conversation_creator(conversation_id)
);

drop policy if exists "Talaza participants read messages" on public.messages;
create policy "Talaza participants read messages"
on public.messages for select to authenticated
using (public.talaza_is_conversation_participant(conversation_id));

drop policy if exists "Talaza participants send their own messages" on public.messages;
create policy "Talaza participants send their own messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.talaza_is_conversation_participant(conversation_id)
);

grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.conversation_participants to authenticated;
grant select, insert on public.messages to authenticated;
