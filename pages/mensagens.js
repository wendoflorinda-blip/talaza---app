-- =====================================================================
-- Talaza · Mensagens (texto, imagem, áudio) + Notificações
-- Supabase → SQL Editor → colar tudo → Run.
-- Pode ser executado mais de uma vez sem estragar nada.
-- =====================================================================

-- 1) Colunas novas na tabela messages --------------------------------
alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_path text,
  add column if not exists media_mime text,
  add column if not exists media_duration integer;

-- 2) Segurança da tabela messages (cada pessoa só vê as suas) ---------
alter table public.messages enable row level security;

drop policy if exists "msg_select_own" on public.messages;
create policy "msg_select_own" on public.messages
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "msg_insert_own" on public.messages;
create policy "msg_insert_own" on public.messages
  for insert to authenticated
  with check (auth.uid() = sender_id);

-- Quem recebe pode marcar como lida
drop policy if exists "msg_update_receiver" on public.messages;
create policy "msg_update_receiver" on public.messages
  for update to authenticated
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- 3) Tempo real (mensagens chegam sem recarregar a página) ------------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

-- 4) Bucket privado para fotos e áudios (máx. 10 MB por ficheiro) -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp',
        'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada pessoa só envia para a sua própria pasta (nome da pasta = id dela)
drop policy if exists "message_media_insert" on storage.objects;
create policy "message_media_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Vê o ficheiro quem o enviou ou quem recebeu a mensagem
drop policy if exists "message_media_select" on storage.objects;
create policy "message_media_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.messages m
        where m.media_path = storage.objects.name
          and m.receiver_id = auth.uid()
      )
    )
  );

-- 5) Notificações -----------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
