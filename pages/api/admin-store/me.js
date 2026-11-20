import { getSupabaseAdminServer } from '../../../lib/supabaseAdminServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Sessão não encontrada.' });
  try {
    const supabase = getSupabaseAdminServer();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'Sessão inválida.' });
    const { data: store, error } = await supabase
      .from('admin_stores')
      .select('id,country,province,municipio,bairro,nome_da_loja,username,descricao,telefone,is_lifetime,created_at')
      .eq('owner_id', authData.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!store) return res.status(403).json({ error: 'Esta conta não possui uma loja administrativa.' });
    const { data: provinces, error: provincesError } = await supabase
      .from('admin_store_provinces').select('country,province').eq('store_id', store.id).order('country').order('province');
    if (provincesError) throw provincesError;
    return res.status(200).json({ store, provinces: provinces || [] });
  } catch (error) {
    console.error('Admin store profile error:', error?.code || error?.message);
    return res.status(503).json({ error: 'Não foi possível carregar a loja administrativa.' });
  }
}
