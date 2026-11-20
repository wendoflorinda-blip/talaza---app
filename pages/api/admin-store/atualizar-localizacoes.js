import { requireMainAdmin, cleanText } from '../../../lib/adminStoreAccess';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: store, error: storeError } = await auth.supabase
      .from('admin_stores').select('id,country_id,country').eq('owner_id', auth.user.id).maybeSingle();
    if (storeError) throw storeError;
    if (!store) return res.status(404).json({ error: 'A loja administrativa ainda não foi criada.' });

    const requested = Array.isArray(req.body?.provinces) ? req.body.provinces : [];
    if (!requested.length) return res.status(400).json({ error: 'A loja precisa de estar hospedada em pelo menos uma província.' });
    const ids = [...new Set(requested.map(item => cleanText(item?.provinceId, 80)).filter(Boolean))];
    if (ids.length !== requested.length) return res.status(400).json({ error: 'A lista de províncias contém valores inválidos ou repetidos.' });

    const { data: provinceRows, error: provinceError } = await auth.supabase
      .from('provinces').select('id,name,country_id').in('id', ids).eq('country_id', store.country_id);
    if (provinceError) throw provinceError;
    if ((provinceRows || []).length !== ids.length) return res.status(400).json({ error: 'Todas as províncias têm de pertencer ao país da loja.' });

    const payload = provinceRows.map(row => {
      const selected = requested.find(item => item.provinceId === row.id) || {};
      const areas = Array.isArray(selected.areas)
        ? [...new Set(selected.areas.map(value => cleanText(value, 100)).filter(Boolean))]
        : [];
      return { store_id: store.id, country: store.country, province: row.name, country_id: store.country_id, province_id: row.id, areas };
    });
    if (payload.some(row => !row.areas.length)) return res.status(400).json({ error: 'Indique pelo menos um Município / Área em cada província selecionada.' });

    const { error: upsertError } = await auth.supabase
      .from('admin_store_provinces')
      .upsert(payload, { onConflict: 'store_id,country,province' });
    if (upsertError) throw upsertError;

    const { data: existingRows, error: existingError } = await auth.supabase
      .from('admin_store_provinces').select('id,province_id').eq('store_id', store.id);
    if (existingError) throw existingError;
    for (const row of existingRows || []) {
      if (!ids.includes(row.province_id)) {
        const { error: deleteError } = await auth.supabase.from('admin_store_provinces').delete().eq('id', row.id);
        if (deleteError) throw deleteError;
      }
    }
    return res.status(200).json({ ok: true, message: 'As províncias e áreas da loja foram atualizadas.' });
  } catch (error) {
    console.error('Admin store locations update failed:', error?.code || error?.message);
    return res.status(500).json({ error: 'Não foi possível atualizar as localizações da loja.' });
  }
}
