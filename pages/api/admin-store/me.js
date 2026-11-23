import { requireMainAdmin } from '../../../lib/adminStoreAccess';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const storeFields = 'id,owner_id,country,province,municipio,bairro,nome_da_loja,username,descricao,telefone,foto_url,is_lifetime,account_type,hosting_status,hosting_type,premium_payment_required,hosting_expires_at,created_at,business_id,country_id,category_id,subcategory_id';
    const { data: stores, error: storesError } = await auth.supabase
      .from('admin_stores')
      .select(storeFields)
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: true });
    if (storesError) throw storesError;
    const storeList = stores || [];
    const storeIds = storeList.map(item => item.id).filter(Boolean);
    const { data: allProvinceRows, error: allProvinceError } = storeIds.length
      ? await auth.supabase.from('admin_store_provinces').select('id,store_id,province,country,province_id,country_id,areas').in('store_id', storeIds).order('province')
      : { data: [], error: null };
    if (allProvinceError) throw allProvinceError;
    const provincesByStore = Object.fromEntries(storeList.map(item => [item.id, (allProvinceRows || []).filter(row => row.store_id === item.id)]));
    const storesWithProvinces = storeList.map(item => ({ ...item, provinces: provincesByStore[item.id] || [] }));
    const requestedStoreId = String(req.query?.storeId || '').trim();
    const store = requestedStoreId
      ? storesWithProvinces.find(item => item.id === requestedStoreId) || null
      : storesWithProvinces[0] || null;
    if (requestedStoreId && !store) return res.status(404).json({ error: 'A loja selecionada não pertence à administradora.' });
    if (!store) return res.status(200).json({ isAdmin: true, stores: storesWithProvinces, store: null, provinces: [], products: [], mainImages: [], business: null });

    const [provinceResult, productResult, mainImagesResult, businessResult, subscriptionsResult] = await Promise.all([
      auth.supabase.from('admin_store_provinces')
        .select('id,country,province,country_id,province_id,areas')
        .eq('store_id', store.id).order('province'),
      store.business_id
        ? auth.supabase.from('business_images')
            .select('id,image_url,video_url,media_type,storage_path,name,description,price,created_at')
            .eq('business_id', store.business_id).eq('kind', 'panel').order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      store.business_id
        ? auth.supabase.from('business_images').select('id,slot,image_url,storage_path,created_at').eq('business_id', store.business_id).eq('kind', 'main').order('slot')
        : Promise.resolve({ data: [], error: null }),
      store.business_id
        ? auth.supabase.from('businesses').select('id,name,description,phone,whatsapp,address,municipality,neighborhood,opening_hours,logo_url,cover_url,country_id,province_id,category_id,subcategory_id,is_active,approval_status').eq('id', store.business_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      store.business_id
        ? auth.supabase.from('business_subscriptions').select('id,plan_id,starts_at,expires_at,status').eq('business_id', store.business_id).order('starts_at',{ascending:false})
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (provinceResult.error) console.error('Admin store provinces read failed:', provinceResult.error.code, provinceResult.error.message);
    if (productResult.error) console.error('Admin store products read failed:', productResult.error.code, productResult.error.message);
    if (mainImagesResult.error) console.error('Admin store main images read failed:', mainImagesResult.error.code, mainImagesResult.error.message);
    if (businessResult.error) console.error('Admin store business read failed:', businessResult.error.code, businessResult.error.message);
    const now = Date.now();
    const activeSubscription = (subscriptionsResult.data || []).find(row => {
      const start = row.starts_at ? new Date(row.starts_at).getTime() : 0;
      const expiry = row.expires_at ? new Date(row.expires_at).getTime() : 0;
      return String(row.status || '').toLowerCase() === 'active' && start <= now && expiry > now;
    }) || null;
    const hostingActive = Boolean(activeSubscription && businessResult.data?.is_active === true && String(businessResult.data?.approval_status || '').toLowerCase() === 'approved');
    return res.status(200).json({
      isAdmin: true,
      stores: storesWithProvinces,
      store,
      provinces: provinceResult.data || [],
      products: productResult.data || [],
      mainImages: mainImagesResult.data || [],
      business: businessResult.data || null,
      hostingActive,
      hostingStatus: hostingActive ? 'active' : 'inactive',
      hostingExpiry: hostingActive ? activeSubscription.expires_at : null,
      provincesReadError: provinceResult.error ? 'Não foi possível carregar as províncias.' : null,
      productsReadError: productResult.error ? 'Não foi possível carregar os produtos.' : null,
    });
  } catch (error) {
    console.error('Admin store dashboard load failed:', JSON.stringify({ code: error?.code || null, message: error?.message || null, details: error?.details || null, hint: error?.hint || null }));
    return res.status(503).json({ error: 'Falha ao ler as lojas administrativas no Supabase: ' + (error?.message || 'erro desconhecido') + (error?.code ? ' (' + error.code + ')' : '') });
  }
}
