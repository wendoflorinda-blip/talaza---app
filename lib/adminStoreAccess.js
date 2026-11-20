import { getSupabaseAdminServer } from './supabaseAdminServer';

export async function requireMainAdmin(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Inicie sessão com a conta do administrador principal.' };

  try {
    const supabase = getSupabaseAdminServer();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return { ok: false, status: 401, error: 'A sessão expirou. Entre novamente na conta do administrador.' };
    }
    const { data: admin, error: adminError } = await supabase
      .from('admin_users').select('id').eq('id', authData.user.id).maybeSingle();
    if (adminError) throw adminError;
    if (!admin) return { ok: false, status: 403, error: 'Acesso reservado ao administrador principal do Talaza.' };
    return { ok: true, supabase, user: authData.user };
  } catch (error) {
    console.error('Admin store authorization failed:', error?.code || error?.message);
    return {
      ok: false,
      status: error?.code === 'ADMIN_STORE_SERVER_CONFIG_MISSING' ? 503 : 500,
      error: error?.code === 'ADMIN_STORE_SERVER_CONFIG_MISSING'
        ? 'A configuração segura do servidor ainda não está concluída.'
        : 'Não foi possível validar a sessão administrativa.',
    };
  }
}

export function cleanText(value, max = 180) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}
