import { getSupabaseAdminServer } from '../../../lib/supabaseAdminServer';
import { cleanText } from '../../../lib/adminStoreAccess';

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
      const { data: store, error: storeError } = await supabase.from('admin_stores')
        .select('id,country,province,nome_da_loja,descricao,telefone,foto_url,business_id,country_id,category_id,subcategory_id')
        .limit(1).maybeSingle();
      if (storeError) throw storeError;
      if (!store) return res.status(404).json({ error: 'A Loja do Administrador ainda não foi publicada.' });
      const [locations, products, mainImages, business] = await Promise.all([
        supabase.from('admin_store_provinces').select('id,country,province,areas').eq('store_id', store.id).order('province'),
        store.business_id ? supabase.from('business_images')
          .select('id,image_url,name,description,price,created_at').eq('business_id', store.business_id).eq('kind', 'panel').order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        store.business_id ? supabase.from('business_images').select('id,slot,image_url,created_at').eq('business_id',store.business_id).eq('kind','main').order('slot')
          : Promise.resolve({ data: [], error: null }),
        store.business_id ? supabase.from('businesses').select('address,municipality,neighborhood,opening_hours,whatsapp,cover_url,logo_url').eq('id',store.business_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (locations.error || products.error || mainImages.error || business.error) throw locations.error || products.error || mainImages.error || business.error;
      return res.status(200).json({ store, provinces: locations.data || [], products: products.data || [], mainImages:mainImages.data||[], business:business.data||null });
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
