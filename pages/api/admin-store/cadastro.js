import { requireMainAdmin, cleanText } from '../../../lib/adminStoreAccess';

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };

function parsePhoto(dataUrl) {
  if (!dataUrl) return null;
  const match = String(dataUrl).match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('A fotografia deve ser JPG, PNG ou WEBP.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) throw new Error('A fotografia deve ter no máximo 4 MB.');
  return { buffer, contentType: 'image/' + match[1], extension: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const expectedCode = process.env.ADMIN_STORE_SECRET_CODE;
  if (!expectedCode) return res.status(503).json({ error: 'O código secreto ADMIN_STORE_SECRET_CODE não está configurado no Preview da Vercel.' });
  const body = req.body || {};
  if (!String(body.secretCode || '') || String(body.secretCode) !== expectedCode) {
    return res.status(403).json({ error: 'Código Secreto da Loja do Administrador incorreto.' });
  }

  const nome = cleanText(body.nome, 120);
  const descricao = cleanText(body.descricao, 1200);
  const telefone = cleanText(body.telefone, 40);
  const countryId = cleanText(body.countryId, 80);
  const categoryId = cleanText(body.categoryId, 80);
  const subcategoryId = cleanText(body.subcategoryId, 80);
  const requested = Array.isArray(body.provinces) ? body.provinces : [];
  if (!nome || !telefone || !countryId || !categoryId || !subcategoryId) {
    return res.status(400).json({ error: 'Preencha o nome, telefone, país, categoria e subcategoria.' });
  }
  if (!requested.length) return res.status(400).json({ error: 'Escolha pelo menos uma província.' });
  const uniqueIds = [...new Set(requested.map(item => cleanText(item?.provinceId, 80)).filter(Boolean))];
  if (uniqueIds.length !== requested.length) return res.status(400).json({ error: 'A lista de províncias contém valores inválidos ou repetidos.' });
  let photo;
  try { photo = parsePhoto(body.photoDataUrl); }
  catch (error) { return res.status(400).json({ error: error.message }); }

  let businessId = null;
  let storeId = null;
  let photoPath = null;
  try {
    const { data: country, error: countryError } = await auth.supabase.from('countries')
      .select('id,name').eq('id', countryId).maybeSingle();
    if (countryError) throw countryError;
    if (!country) return res.status(400).json({ error: 'O país escolhido não existe.' });

    const { data: provinceRows, error: provinceError } = await auth.supabase.from('provinces')
      .select('id,name,country_id').in('id', uniqueIds).eq('country_id', countryId);
    if (provinceError) throw provinceError;
    if ((provinceRows || []).length !== uniqueIds.length) return res.status(400).json({ error: 'Uma ou mais províncias não pertencem ao país escolhido.' });

    const { data: category, error: categoryError } = await auth.supabase.from('categories')
      .select('id').eq('id', categoryId).eq('active', true).eq('signup_visible', true).maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return res.status(400).json({ error: 'A categoria escolhida não está disponível.' });

    const { data: subcategory, error: subcategoryError } = await auth.supabase.from('subcategories')
      .select('id').eq('id', subcategoryId).eq('category_id', categoryId).eq('is_active', true).maybeSingle();
    if (subcategoryError) throw subcategoryError;
    if (!subcategory) return res.status(400).json({ error: 'A subcategoria não pertence à categoria escolhida.' });

    const { data: existing, error: existingError } = await auth.supabase.from('admin_stores')
      .select('id').limit(1).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return res.status(409).json({ error: 'A única Loja do Administrador já foi criada. Edite as localizações no painel.' });

    const orderedProvinces = provinceRows.sort((a, b) => uniqueIds.indexOf(a.id) - uniqueIds.indexOf(b.id));
    const provincePayload = orderedProvinces.map(row => {
      const requestedRow = requested.find(item => item.provinceId === row.id) || {};
      const areas = Array.isArray(requestedRow.areas)
        ? [...new Set(requestedRow.areas.map(value => cleanText(value, 100)).filter(Boolean))]
        : [];
      return { ...row, areas };
    });
    if (provincePayload.some(row => !row.areas.length)) {
      return res.status(400).json({ error: 'Indique pelo menos um Município / Área em cada província selecionada.' });
    }

    const firstProvince = provincePayload[0];
    const firstArea = firstProvince.areas[0] || '';
    const { data: business, error: businessError } = await auth.supabase.from('businesses').insert({
      owner_id: auth.user.id, name: nome, description: descricao || null,
      country_id: country.id, province_id: firstProvince.id,
      category_id: categoryId, subcategory_id: subcategoryId,
      municipality: firstArea, neighborhood: '', phone: telefone, whatsapp: telefone,
      is_active: true, approval_status: 'approved',
    }).select('id').single();
    if (businessError) throw businessError;
    businessId = business.id;

    let photoUrl = null;
    if (photo) {
      photoPath = businessId + '/admin-store-logo-' + Date.now() + '.' + photo.extension;
      const { error: uploadError } = await auth.supabase.storage.from('business-media')
        .upload(photoPath, photo.buffer, { contentType: photo.contentType, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      photoUrl = auth.supabase.storage.from('business-media').getPublicUrl(photoPath).data?.publicUrl || null;
    }
    if (photoUrl) {
      const { error: logoError } = await auth.supabase.from('businesses').update({ logo_url: photoUrl }).eq('id', businessId);
      if (logoError) throw logoError;
    }

    const { data: store, error: storeError } = await auth.supabase.from('admin_stores').insert({
      owner_id: auth.user.id, country: country.name, province: firstProvince.name,
      municipio: firstArea, bairro: '', nome_da_loja: nome, username: 'talaza-oficial',
      descricao: descricao || null, telefone, foto_url: photoUrl, is_lifetime: true,
      business_id: businessId, country_id: country.id, category_id: categoryId, subcategory_id: subcategoryId,
    }).select('id').single();
    if (storeError) throw storeError;
    storeId = store.id;

    const provinceInsertRows = provincePayload.map(row => ({
      store_id: storeId, country: country.name, province: row.name,
      country_id: country.id, province_id: row.id, areas: row.areas,
    }));
    const { error: locationsError } = await auth.supabase.from('admin_store_provinces').insert(provinceInsertRows);
    if (locationsError) throw locationsError;
    return res.status(201).json({ ok: true, message: 'Loja administrativa criada e ativada.', storeId, businessId });
  } catch (error) {
    console.error('Admin store creation failed:', error?.code || error?.message);
    if (storeId) await auth.supabase.from('admin_stores').delete().eq('id', storeId);
    if (businessId) await auth.supabase.from('businesses').delete().eq('id', businessId);
    if (photoPath) await auth.supabase.storage.from('business-media').remove([photoPath]);
    if (error?.code === '23505') return res.status(409).json({ error: 'A loja única já existe ou ocorreu um conflito de registo.' });
    return res.status(500).json({ error: 'Não foi possível criar a loja. Nenhum e-mail foi enviado.' });
  }
}
