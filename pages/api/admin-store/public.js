import { getSupabaseAdminServer } from '../../../lib/supabaseAdminServer';
import { cleanText } from '../../../lib/adminStoreAccess';

function slugifyStoreName(value) {
  return String(value||'loja-administrador').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'loja-administrador';
}

const attempts = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = attempts.get(ip) || { start: now, count: 0 };
  if (now - entry.start > 15 * 60 * 1000) { entry.start = now; entry.count = 0; }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > 12;
}

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdminServer();
    if (req.method === 'GET') {
      const requestedSlug = cleanText(req.query?.slug, 180);
      const provinceId = cleanText(req.query?.provinceId, 80);
      const countryId = cleanText(req.query?.countryId, 80);
      const subcategoryId = cleanText(req.query?.subcategoryId, 80);
      const { data: allStores, error: storesError } = await supabase.from('admin_stores')
        .select('id,owner_id,country,province,nome_da_loja,descricao,telefone,foto_url,business_id,country_id,category_id,subcategory_id,hosting_status,hosting_type,is_lifetime')
        .order('created_at', { ascending: true });
      if (storesError) throw storesError;
      const storeRows = allStores || [];

      const loadStoreBundle = async (store) => {
        const [locations, products, mainImages, business, subscriptions] = await Promise.all([
          supabase.from('admin_store_provinces').select('id,country,province,province_id,country_id,areas').eq('store_id', store.id).order('province'),
          store.business_id ? supabase.from('business_images').select('id,image_url,name,description,price,created_at').eq('business_id', store.business_id).eq('kind', 'panel').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
          store.business_id ? supabase.from('business_images').select('id,slot,image_url,created_at').eq('business_id',store.business_id).eq('kind','main').order('slot') : Promise.resolve({ data: [], error: null }),
          store.business_id ? supabase.from('businesses').select('address,municipality,neighborhood,opening_hours,whatsapp,cover_url,logo_url,is_active,approval_status').eq('id',store.business_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
          store.business_id ? supabase.from('business_subscriptions').select('id,plan_id,starts_at,expires_at,status').eq('business_id',store.business_id).order('starts_at',{ascending:false}) : Promise.resolve({ data: [], error: null }),
        ]);
        const issue = locations.error || products.error || mainImages.error || business.error || subscriptions.error;
        if (issue) throw issue;
        const now = Date.now();
        const activeSubscription = (subscriptions.data || []).find(row => {
          const starts = row.starts_at ? new Date(row.starts_at).getTime() : 0;
          const expires = row.expires_at ? new Date(row.expires_at).getTime() : 0;
          return String(row.status || '').toLowerCase() === 'active' && starts <= now && expires > now;
        }) || null;
        const hostingActive = Boolean(activeSubscription && business.data?.is_active === true && String(business.data?.approval_status || '').toLowerCase() === 'approved');
        return {
          store: { ...store, provinces: locations.data || [] }, publicSlug: slugifyStoreName(store.nome_da_loja), provinces: locations.data || [],
          products: products.data || [], mainImages: mainImages.data || [], business: business.data || null,
          hostingActive, hostingStatus: hostingActive ? 'active' : 'inactive',
          hostingExpiry: hostingActive ? activeSubscription.expires_at : null,
        };
      };

      if (requestedSlug) {
        const byId = storeRows.find(item => String(item.id) === requestedSlug);
        const bySlug = storeRows.filter(item => slugifyStoreName(item.nome_da_loja) === requestedSlug);
        const matches = byId ? [byId] : bySlug;
        if (!matches.length) return res.status(404).json({ error: 'Esta página pública da loja não existe.' });
        if (matches.length > 1) return res.status(409).json({ error: 'Há lojas com o mesmo nome. Abra a loja usando o seu identificador.' });
        return res.status(200).json(await loadStoreBundle(matches[0]));
      }

      if (provinceId) {
        let locationsQuery = supabase.from('admin_store_provinces').select('store_id').eq('province_id', provinceId);
        if (countryId) locationsQuery = locationsQuery.eq('country_id', countryId);
        const { data: matchingLocations, error: locationsError } = await locationsQuery;
        if (locationsError) throw locationsError;
        const storeIds = [...new Set((matchingLocations || []).map(row => row.store_id).filter(Boolean))];
        const candidates = storeRows.filter(item => storeIds.includes(item.id) && (!countryId || String(item.country_id) === String(countryId)) && (!subcategoryId || String(item.subcategory_id) === String(subcategoryId)));
        const bundles = await Promise.all(candidates.map(loadStoreBundle));
        return res.status(200).json({ stores: bundles.filter(item => item.hostingActive) });
      }

      const store = storeRows[0] || null;
      if (!store) return res.status(404).json({ error: 'A Loja do Administrador ainda não foi publicada.' });
      return res.status(200).json(await loadStoreBundle(store));
    }
    if (req.method === 'POST') {
      if (limited(req)) return res.status(429).json({ error: 'Muitas mensagens enviadas. Aguarde alguns minutos e tente novamente.' });
      const storeId = cleanText(req.body?.storeId, 80);
      const nome = cleanText(req.body?.nome, 100);
      const provinceRowId = cleanText(req.body?.provinceId, 80);
      const mensagem = cleanText(req.body?.mensagem, 1500);
      if (!storeId || !nome || !provinceRowId || mensagem.length < 5) return res.status(400).json({ error: 'Preencha o seu nome, a província e uma mensagem com pelo menos 5 caracteres.' });
      const { data: location, error: locationError } = await supabase.from('admin_store_provinces')
        .select('store_id,country,province').eq('id', provinceRowId).eq('store_id', storeId).maybeSingle();
      if (locationError) throw locationError;
      if (!location) return res.status(400).json({ error: 'Escolha uma província onde a loja está disponível.' });
      const { error: insertError } = await supabase.from('admin_store_messages').insert({
        store_id: storeId, country: location.country, province_origem: location.province,
        nome_cliente: nome, mensagem, lida: false,
      });
      if (insertError) throw insertError;
      return res.status(201).json({ ok: true, message: 'Mensagem enviada à equipa da Loja do Administrador.' });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error('Admin store public endpoint error:', error?.code || error?.message);
    return res.status(500).json({ error: 'Não foi possível concluir o pedido. Tente novamente.' });
  }
}
