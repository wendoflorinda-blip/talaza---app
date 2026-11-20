import { requireMainAdmin } from '../../../lib/adminStoreAccess';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: store, error } = await auth.supabase
      .from('admin_stores')
      .select('id,owner_id,country,province,municipio,bairro,nome_da_loja,username,descricao,telefone,foto_url,is_lifetime,created_at,business_id,country_id,category_id,subcategory_id')
      .eq('owner_id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!store) return res.status(200).json({ isAdmin: true, store: null, provinces: [], products: [] });

    const [provinceResult, productResult] = await Promise.all([
      auth.supabase.from('admin_store_provinces')
        .select('id,country,province,country_id,province_id,areas')
        .eq('store_id', store.id).order('province'),
      store.business_id
        ? auth.supabase.from('business_images')
            .select('id,image_url,video_url,media_type,storage_path,name,description,price,created_at')
            .eq('business_id', store.business_id).eq('kind', 'panel').order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (provinceResult.error || productResult.error) throw provinceResult.error || productResult.error;
    return res.status(200).json({
      isAdmin: true,
      store,
      provinces: provinceResult.data || [],
      products: productResult.data || [],
    });
  } catch (error) {
    console.error('Admin store dashboard load failed:', error?.code || error?.message);
    return res.status(503).json({ error: 'Não foi possível carregar os dados da Loja do Administrador.' });
  }
}
