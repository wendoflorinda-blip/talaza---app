import { getSupabasePublicServer } from '../../../lib/supabaseAdminServer';
import { adminInternalEmail, isValidAdminUsername, normalizeAdminUsername } from '../../../lib/adminStoreAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const username = normalizeAdminUsername(req.body?.username);
  const password = String(req.body?.password || '');
  if (!isValidAdminUsername(username) || !password) return res.status(400).json({ error: 'Username ou palavra-passe inválidos.' });

  try {
    const supabase = getSupabasePublicServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminInternalEmail(username),
      password,
    });
    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ error: 'Username ou palavra-passe incorretos.' });
    }
    return res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error('Admin store login error:', error?.code || error?.message);
    return res.status(503).json({ error: 'O login administrativo não está disponível neste momento.' });
  }
}
