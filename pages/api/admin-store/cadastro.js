import { getSupabaseAdminServer } from '../../../lib/supabaseAdminServer';
import { adminInternalEmail, isValidAdminUsername, normalizeAdminUsername, safeText } from '../../../lib/adminStoreAuth';

const attempts = new Map();
function rateLimited(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = String(forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const current = attempts.get(ip) || { count: 0, start: now };
  if (now - current.start > 15 * 60 * 1000) { current.count = 0; current.start = now; }
  current.count += 1;
  attempts.set(ip, current);
  return current.count > 8;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (rateLimited(req)) return res.status(429).json({ error: 'Demasiadas tentativas. Aguarde antes de tentar novamente.' });

  const expectedCode = process.env.ADMIN_STORE_SECRET_CODE;
  if (!expectedCode) return res.status(503).json({ error: 'O cadastro administrativo ainda não está configurado no servidor.' });

  const body = req.body || {};
  const secretCode = String(body.secretCode || '');
  if (!secretCode || secretCode !== expectedCode) return res.status(403).json({ error: 'Código inválido' });

  const username = normalizeAdminUsername(body.username);
  const password = String(body.password || '');
  const country = safeText(body.country, 100);
  const province = safeText(body.province, 100);
  const municipio = safeText(body.municipio, 100);
  const bairro = safeText(body.bairro, 100);
  const nome_da_loja = safeText(body.nome_da_loja, 120);
  const telefone = safeText(body.telefone, 40);
  const descricao = safeText(body.descricao, 1000);
  const selectedProvinces = Array.isArray(body.provinces)
    ? body.provinces.map(item => ({ country: safeText(item?.country, 100), province: safeText(item?.province, 100) })).filter(item => item.country && item.province)
    : [];

  if (!isValidAdminUsername(username)) {
    return res.status(400).json({ error: 'O username deve ter 3 a 30 caracteres e usar letras sem acentos, números, ponto, hífen ou underscore.' });
  }
  if (password.length < 10 || password.length > 72) return res.status(400).json({ error: 'A palavra-passe deve ter entre 10 e 72 caracteres.' });
  if (!country || !province || !municipio || !bairro || !nome_da_loja || !telefone) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }
  if (!selectedProvinces.some(item => item.country.toLowerCase() === country.toLowerCase() && item.province.toLowerCase() === province.toLowerCase())) {
    selectedProvinces.unshift({ country, province });
  }
  const uniqueProvinces = [...new Map(selectedProvinces.map(item => [`${item.country.toLowerCase()}|${item.province.toLowerCase()}`, item])).values()];

  let supabase;
  let createdUserId = null;
  try {
    supabase = getSupabaseAdminServer();

    const { data: existingStore, error: storeCheckError } = await supabase
      .from('admin_stores').select('id').limit(1).maybeSingle();
    if (storeCheckError) throw storeCheckError;
    if (existingStore) return res.status(409).json({ error: 'Já existe uma loja administrativa no Talaza. Só é permitida uma loja em todo o sistema.' });

    const email = adminInternalEmail(username);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { admin_store_account: true, admin_store_username: username },
      app_metadata: { account_scope: 'admin_store' },
    });

    if (createError) {
      const message = String(createError.message || '').toLowerCase();
      if (/email|domain|invalid|not allowed|format/.test(message)) {
        console.error('Supabase rejected the configured internal admin email domain:', createError.code || createError.message);
        return res.status(422).json({
          code: 'INTERNAL_EMAIL_DOMAIN_REJECTED',
          error: 'O Supabase rejeitou o domínio interno combinado. O cadastro foi interrompido. Não será tentado outro domínio.',
        });
      }
      throw createError;
    }

    createdUserId = created?.user?.id;
    if (!createdUserId) throw new Error('AUTH_USER_NOT_RETURNED');

    const { data: store, error: insertError } = await supabase
      .from('admin_stores')
      .insert({
        owner_id: createdUserId,
        country, province, municipio, bairro, nome_da_loja, username,
        descricao: descricao || null,
        telefone,
        is_lifetime: true,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    const rows = uniqueProvinces.map(item => ({ store_id: store.id, country: item.country, province: item.province }));
    const { error: provincesError } = await supabase.from('admin_store_provinces').insert(rows);
    if (provincesError) throw provincesError;

    return res.status(201).json({ ok: true, message: 'Loja administrativa criada com sucesso.' });
  } catch (error) {
    console.error('Admin store signup failed:', error?.code || error?.message);
    if (createdUserId && supabase) {
      try { await supabase.auth.admin.deleteUser(createdUserId); }
      catch (cleanupError) { console.error('Admin store rollback cleanup failed:', cleanupError?.code || cleanupError?.message); }
    }
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Nome de utilizador já usado' });
    }
    if (error?.code === 'ADMIN_STORE_SERVER_CONFIG_MISSING') {
      return res.status(503).json({ error: 'A configuração segura do servidor ainda não está concluída.' });
    }
    return res.status(500).json({ error: 'Não foi possível concluir o cadastro. Nenhuma alternativa de email será tentada.' });
  }
}
