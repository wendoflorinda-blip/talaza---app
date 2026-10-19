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
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.notifications TO authenticated;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
ON public.notifications (user_id, created_at DESC);

DROP POLICY IF EXISTS "Talaza users view general and own notifications" ON public.notifications;
CREATE POLICY "Talaza users view general and own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Talaza admins send notifications" ON public.notifications;
CREATE POLICY "Talaza admins send notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  AND (user_id IS NULL OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id))
);

-- Permissões de tabela necessárias às operações feitas pelo painel.
GRANT SELECT, UPDATE ON public.payment_submissions TO authenticated;
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
