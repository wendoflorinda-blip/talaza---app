-- Talaza: migração segura de mensagens internas.
-- IMPORTANTE: não altera nem reutiliza public.messages, pois essa tabela já serve
-- a outro fluxo da aplicação. Executar manualmente no SQL Editor do projeto Supabase
-- usado pela Preview da branch Dev.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  province_id uuid not null,
  source text not null default 'Vitrine',
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.talaza_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  storage_path text,
  attachment_name text,
  message_type text not null default 'text',
  created_at timestamptz not null default now(),
  constraint talaza_messages_content_check
    check (nullif(trim(coalesce(body, '')), '') is not null or storage_path is not null)
);

create index if not exists conversations_province_updated_idx
  on public.conversations (province_id, updated_at desc);
create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id, conversation_id);
create index if not exists talaza_messages_conversation_created_idx
  on public.talaza_messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.talaza_messages enable row level security;

-- Funções SECURITY DEFINER evitam recursão nas políticas RLS de participantes.
create or replace function public.talaza_is_conversation_participant(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = target_conversation and cp.user_id = auth.uid()
  );
$$;

create or replace function public.talaza_is_conversation_creator(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = target_conversation and c.created_by = auth.uid()
  );
$$;

revoke all on function public.talaza_is_conversation_participant(uuid) from public;
revoke all on function public.talaza_is_conversation_creator(uuid) from public;
grant execute on function public.talaza_is_conversation_participant(uuid) to authenticated;
grant execute on function public.talaza_is_conversation_creator(uuid) to authenticated;

drop policy if exists "Talaza participants can view conversations" on public.conversations;
create policy "Talaza participants can view conversations"
on public.conversations for select to authenticated
using (public.talaza_is_conversation_participant(id));

drop policy if exists "Talaza users can create conversations" on public.conversations;
create policy "Talaza users can create conversations"
on public.conversations for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.province_id = conversations.province_id
  )
);

drop policy if exists "Talaza participants can update conversations" on public.conversations;
create policy "Talaza participants can update conversations"
on public.conversations for update to authenticated
using (public.talaza_is_conversation_participant(id))
with check (public.talaza_is_conversation_participant(id));

drop policy if exists "Talaza participants can view memberships" on public.conversation_participants;
create policy "Talaza participants can view memberships"
on public.conversation_participants for select to authenticated
using (public.talaza_is_conversation_participant(conversation_id));

drop policy if exists "Talaza users can join conversations they create" on public.conversation_participants;
create policy "Talaza users can join conversations they create"
on public.conversation_participants for insert to authenticated
with check (
  (
    user_id = auth.uid()
    or public.talaza_is_conversation_creator(conversation_id)
  )
  and exists (
    select 1
    from public.conversations c
    join public.profiles p on p.id = conversation_participants.user_id
    where c.id = conversation_participants.conversation_id
      and p.province_id = c.province_id
  )
);

drop policy if exists "Talaza users can view conversation messages" on public.talaza_messages;
create policy "Talaza users can view conversation messages"
on public.talaza_messages for select to authenticated
using (public.talaza_is_conversation_participant(conversation_id));

drop policy if exists "Talaza users can send own conversation messages" on public.talaza_messages;
create policy "Talaza users can send own conversation messages"
on public.talaza_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.talaza_is_conversation_participant(conversation_id)
);

-- Anexos: mantém o bucket existente message-media e as políticas atuais.
-- Caminho dos novos anexos: <user_id>/<conversation_id>/<ficheiro>.
-- Esta política adicional só permite ao participante ler anexos referenciados
-- por mensagens da nova tabela. Não remove nem substitui políticas existentes.
drop policy if exists "Talaza participants can read internal message media" on storage.objects;
create policy "Talaza participants can read internal message media"
on storage.objects for select to authenticated
using (
  bucket_id = 'message-media'
  and exists (
    select 1 from public.talaza_messages tm
    join public.conversation_participants cp on cp.conversation_id = tm.conversation_id
    where tm.storage_path = storage.objects.name
      and cp.user_id = auth.uid()
  )
);

-- Avatar: cria o bucket dedicado se ainda não existir; não reutiliza message-media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "Talaza users can upload own avatar" on storage.objects;
create policy "Talaza users can upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Talaza users can update own avatar" on storage.objects;
create policy "Talaza users can update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Talaza users can delete own avatar" on storage.objects;
create policy "Talaza users can delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Leitura pública apenas para imagens do bucket de avatares.
drop policy if exists "Talaza public can view avatars" on storage.objects;
create policy "Talaza public can view avatars"
on storage.objects for select to public
using (bucket_id = 'avatars');

-- Realtime para a nova tabela de mensagens, sem alterar a tabela public.messages.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'talaza_messages'
  ) then
    alter publication supabase_realtime add table public.talaza_messages;
  end if;
exception when undefined_object then
  raise notice 'Publicação supabase_realtime não existe neste projeto; configure Realtime manualmente se necessário.';
end $$;
