-- TALAZA: permissões do painel, suporte e notificações
-- Executar uma única vez no Supabase > SQL Editor > New query.
-- Não desative RLS. As políticas abaixo são restritas a utilizadores autenticados
-- que tenham uma linha em public.admin_users com id = auth.uid().

-- 1. Caixa de entrada do Suporte Talaza
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(trim(message)) > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;

DROP POLICY IF EXISTS "Talaza users submit own support messages" ON public.support_messages;
CREATE POLICY "Talaza users submit own support messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Talaza admins view support messages" ON public.support_messages;
CREATE POLICY "Talaza admins view support messages"
ON public.support_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Talaza admins update support messages" ON public.support_messages;
CREATE POLICY "Talaza admins update support messages"
ON public.support_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- 2. Notificações enviadas pela administração.
-- user_id = NULL significa aviso geral; UUID significa notificação individual.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  type text NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'individual')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Migração segura caso notifications já exista com a versão antiga
-- (que usava content em vez de body ou tinha user_id NOT NULL).
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id uuid NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

DO $notification_migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'content'
  ) THEN
    EXECUTE 'UPDATE public.notifications SET body = content WHERE body IS NULL';
    EXECUTE 'ALTER TABLE public.notifications ALTER COLUMN content DROP NOT NULL';
  END IF;
END;
$notification_migration$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
ON public.notifications (user_id, created_at DESC);

DROP POLICY IF EXISTS "Talaza users view general and own notifications" ON public.notifications;
CREATE POLICY "Talaza users view general and own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Talaza users mark own notifications read" ON public.notifications;
CREATE POLICY "Talaza users mark own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Talaza admins send notifications" ON public.notifications;
CREATE POLICY "Talaza admins send notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  AND (user_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id))
);

-- Permissões de tabela necessárias às operações feitas pelo painel.
GRANT SELECT, UPDATE ON public.payment_submissions TO authenticated;
-- Permitir guardar os dois comprovativos no mesmo pedido, mantendo compatibilidade
-- com os registos antigos que usam proof_url e proof_type.
ALTER TABLE public.payment_submissions
  ADD COLUMN IF NOT EXISTS proof_image_url text NULL;
ALTER TABLE public.payment_submissions
  ADD COLUMN IF NOT EXISTS proof_file_url text NULL;
GRANT UPDATE ON public.businesses TO authenticated;
GRANT SELECT, UPDATE ON public.community_posts TO authenticated;
GRANT SELECT, UPDATE ON public.community_reports TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- 3. O administrador pode consultar e rever pagamentos.
DROP POLICY IF EXISTS "Talaza admins view all payment submissions" ON public.payment_submissions;
CREATE POLICY "Talaza admins view all payment submissions"
ON public.payment_submissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Talaza admins update payment submissions" ON public.payment_submissions;
CREATE POLICY "Talaza admins update payment submissions"
ON public.payment_submissions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

GRANT SELECT ON storage.objects TO authenticated;

-- O administrador pode abrir comprovativos privados no bucket payment-proofs.
DROP POLICY IF EXISTS "Talaza admins view payment proofs" ON storage.objects;
CREATE POLICY "Talaza admins view payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
);

-- 4. Permitir que o administrador aprove/rejeite perfis e publicações da comunidade.
DROP POLICY IF EXISTS "Talaza admins update businesses" ON public.businesses;
CREATE POLICY "Talaza admins update businesses"
ON public.businesses FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Talaza admins view community posts" ON public.community_posts;
CREATE POLICY "Talaza admins view community posts"
ON public.community_posts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Talaza admins update community posts" ON public.community_posts;
CREATE POLICY "Talaza admins update community posts"
ON public.community_posts FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Talaza admins view community reports" ON public.community_reports;
CREATE POLICY "Talaza admins view community reports"
ON public.community_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Talaza admins update community reports" ON public.community_reports;
CREATE POLICY "Talaza admins update community reports"
ON public.community_reports FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- 5. Os administradores precisam conseguir listar os nomes dos utilizadores
-- para escolher um destinatário individual no painel.
DROP POLICY IF EXISTS "Talaza admins view profiles for support" ON public.profiles;
CREATE POLICY "Talaza admins view profiles for support"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));


-- 6. Segurança e moderação das áreas Eventos e Oportunidades.
-- O painel usa as tabelas já existentes; não cria tabelas duplicadas.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view own admin record" ON public.admin_users;
CREATE POLICY "Admins can view own admin record"
ON public.admin_users FOR SELECT TO authenticated
USING (id = auth.uid());

-- A coluna type guarda a categoria da notificação, sem restringir o envio
-- de avisos de análise a um conjunto antigo de dois valores.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('general', 'individual', 'admin_review', 'seller_review', 'payment_review', 'community_review', 'event_review', 'opportunity_review'));

GRANT SELECT, UPDATE ON public.events TO authenticated;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Talaza admins view events" ON public.events;
CREATE POLICY "Talaza admins view events"
ON public.events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));
DROP POLICY IF EXISTS "Talaza admins update events" ON public.events;
CREATE POLICY "Talaza admins update events"
ON public.events FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

GRANT SELECT, UPDATE ON public.job_posts TO authenticated;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Talaza admins view job posts" ON public.job_posts;
CREATE POLICY "Talaza admins view job posts"
ON public.job_posts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));
DROP POLICY IF EXISTS "Talaza admins update job posts" ON public.job_posts;
CREATE POLICY "Talaza admins update job posts"
ON public.job_posts FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));


-- Regista a aprovação administrativa de um evento sem confundir com o pagamento.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT false;


-- 7. Storage para imagens de Procura-se e Achei! na Comunidade Talaza.
-- O bucket community-posts deve existir; não é criado automaticamente aqui.
GRANT SELECT, INSERT ON storage.objects TO authenticated;
DROP POLICY IF EXISTS "Talaza users upload community post images" ON storage.objects;
CREATE POLICY "Talaza users upload community post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "Talaza users view community post images" ON storage.objects;
CREATE POLICY "Talaza users view community post images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-posts');
DROP POLICY IF EXISTS "Talaza admins insert official community content" ON public.community_posts;
CREATE POLICY "Talaza admins insert official community content"
ON public.community_posts FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
);
