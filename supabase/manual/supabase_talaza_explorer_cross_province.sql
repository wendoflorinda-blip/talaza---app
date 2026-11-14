-- Talaza: permitir mensagens entre províncias para Explorador Talaza.
-- Executar este ficheiro no SQL Editor do Supabase do projeto Talaza.
-- Não cria nem elimina tabelas e não altera a tabela legacy public.messages.
-- Regra: se quem criou a conversa for vendedor, todos os participantes têm de
-- estar na província principal desse vendedor. Se for Explorador Talaza,
-- pode iniciar uma conversa com um perfil de qualquer província.

drop policy if exists "Talaza users can join conversations they create"
on public.conversation_participants;

create policy "Talaza users can join conversations they create"
on public.conversation_participants
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    or public.talaza_is_conversation_creator(conversation_id)
  )
  and exists (
    select 1
    from public.conversations c
    join public.profiles creator on creator.id = c.created_by
    join public.profiles participant on participant.id = conversation_participants.user_id
    where c.id = conversation_participants.conversation_id
      and (
        (
          (
            exists (
              select 1 from public.businesses b
              where b.owner_id = creator.id
            )
            or lower(coalesce(creator.account_type, '')) like '%vendedor%'
            or lower(coalesce(creator.account_type, '')) like '%seller%'
          )
          and participant.province_id = creator.province_id
        )
        or not (
          exists (
            select 1 from public.businesses b
            where b.owner_id = creator.id
          )
          or lower(coalesce(creator.account_type, '')) like '%vendedor%'
          or lower(coalesce(creator.account_type, '')) like '%seller%'
        )
      )
  )
);
