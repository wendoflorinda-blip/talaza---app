import { requireMainAdmin, cleanText } from '../../../lib/adminStoreAccess';

const attempts = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (now - entry.start > 15 * 60 * 1000) { entry.start = now; entry.count = 0; }
  entry.count += 1; attempts.set(ip, entry);
  return entry.count > 12;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (limited(req)) return res.status(429).json({ error: 'Demasiadas tentativas. Aguarde alguns minutos.' });

  const body = req.body || {};
  const type = body.type === 'seller' ? 'seller' : body.type === 'client' ? 'client' : '';
  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 254).toLowerCase();
  const password = String(body.password || '');
  const phone = cleanText(body.phone, 40);
  if (!type) return res.status(400).json({ error: 'Escolha Cliente ou Vendedor.' });
  if (!name) return res.status(400).json({ error: 'Indique o nome.' });
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Indique um e-mail válido.' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'A palavra-passe deve ter entre 6 e 72 caracteres.' });
  if (!phone) return res.status(400).json({ error: 'Indique o telefone.' });

  const accountType = type === 'seller' ? 'vendedor' : 'explorador';
  let createdUserId = null;
  try {
    const { data: created, error: createError } = await auth.supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        name,
        phone,
        account_type: accountType,
        talaza_admin_created_account: true,
        ...(type === 'seller' ? { talaza_admin_created_seller: true } : {}),
      },
    });
    if (createError) {
      if (/already|exists|registered/i.test(createError.message || '')) return res.status(409).json({ error: 'Este e-mail já está associado a uma conta Talaza.' });
      throw createError;
    }
    if (!created?.user?.id) throw new Error('Auth não devolveu o ID da conta criada.');
    createdUserId = created.user.id;
    const { error: profileError } = await auth.supabase.from('profiles').upsert({
      id: createdUserId, name, phone, account_type: accountType,
    }, { onConflict: 'id' });
    if (profileError) throw profileError;
    return res.status(201).json({ ok: true, account: { id: createdUserId, name, email, phone, type } });
  } catch (error) {
    if (createdUserId) {
      const { error: rollbackError } = await auth.supabase.auth.admin.deleteUser(createdUserId);
      if (rollbackError) console.error('Admin-created account rollback failed:', rollbackError.message);
    }
    console.error('Admin create account error:', JSON.stringify({ code: error?.code || null, message: error?.message || null }));
    return res.status(500).json({ error: 'Não foi possível criar a conta. ' + (error?.message || 'Erro interno do Supabase.') });
  }
}
