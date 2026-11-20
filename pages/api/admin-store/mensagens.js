import { requireMainAdmin } from '../../../lib/adminStoreAccess';

export default async function handler(req, res) {
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: store, error: storeError } = await auth.supabase
      .from('admin_stores').select('id').eq('owner_id', auth.user.id).maybeSingle();
    if (storeError) throw storeError;
    if (!store) return res.status(404).json({ error: 'A Loja do Administrador ainda não existe.' });

    if (req.method === 'GET') {
      const { data, error } = await auth.supabase.from('admin_store_messages')
        .select('id,country,province_origem,nome_cliente,mensagem,lida,created_at')
        .eq('store_id', store.id).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ messages: data || [] });
    }

    if (req.method === 'PATCH') {
      const id = String(req.body?.id || '');
      const lida = req.body?.lida === true;
      if (!id) return res.status(400).json({ error: 'Mensagem inválida.' });
      const { data, error } = await auth.supabase.from('admin_store_messages')
        .update({ lida }).eq('id', id).eq('store_id', store.id)
        .select('id,lida').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Mensagem não encontrada.' });
      return res.status(200).json({ ok: true, message: data });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error('Admin store messages error:', error?.code || error?.message);
    return res.status(500).json({ error: 'Não foi possível carregar ou atualizar as mensagens.' });
  }
}
