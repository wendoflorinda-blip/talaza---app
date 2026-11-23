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
  const submittedCode = String(body.secretCode || '').trim();
  const normalizedExpectedCode = String(expectedCode).trim();
  if (!submittedCode || submittedCode !== normalizedExpectedCode) {
    return res.status(403).json({ error: 'Código Secreto da Loja do Administrador incorreto. Espaços no início/fim são ignorados; letras maiúsculas/minúsculas precisam corresponder.' });
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

    const orderedProvinces = provinceRows.sort((a, b) => uniqueIds.indexOf(a.id) - uniqueIds.indexOf(b.id));
    const provincePayload = orderedProvinces.map(row => {
      const requestedRow = requested.find(item => item.provinceId === row.id) || {};
      const areas = Array.isArray(requestedRow.areas)
        ? [...new Set(requestedRow.areas.map(value => cleanText(value, 100)).filter(Boolean))]
        : [];
      return { ...row, areas };
    });

    const firstProvince = provincePayload[0];
    const firstArea = firstProvince.areas[0] || '';

    // Businesses are constrained by Talaza to the owner's primary country/province.
    // The admin storefront's multi-province hosting is stored separately below.
    const { data: ownerProfile, error: ownerProfileError } = await auth.supabase
      .from('profiles').select('country_id,province_id').eq('id', auth.user.id).maybeSingle();
    if (ownerProfileError) throw ownerProfileError;
    if (!ownerProfile?.country_id || !ownerProfile?.province_id) {
      return res.status(400).json({ error: 'O perfil do administrador não tem País e Província principais definidos. Atualize o perfil e tente novamente.' });
    }

    const { data: business, error: businessError } = await auth.supabase.from('businesses').insert({
      owner_id: auth.user.id, name: nome, description: descricao || null,
      country_id: ownerProfile.country_id, province_id: ownerProfile.province_id,
      category_id: categoryId, subcategory_id: subcategoryId,
      municipality: null, neighborhood: '', phone: telefone, whatsapp: telefone,
      is_active: false, approval_status: 'approved',
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
      municipio: firstArea, bairro: '', nome_da_loja: nome, username: 'talaza-oficial-' + businessId.slice(0, 8),
      descricao: descricao || null, telefone, foto_url: photoUrl, is_lifetime: false,
      account_type: 'admin_store', hosting_status: 'inactive', hosting_type: 'none', premium_payment_required: false, hosting_expires_at: null,
      business_id: businessId, country_id: country.id, category_id: categoryId, subcategory_id: subcategoryId,
    }).select('*').single();
    if (storeError) throw storeError;
    storeId = store.id;

    const provinceInsertRows = provincePayload.map(row => ({
      store_id: storeId, country: country.name, province: row.name,
      country_id: country.id, province_id: row.id, areas: row.areas,
    }));
    const { data: insertedProvinces, error: locationsError } = await auth.supabase.from('admin_store_provinces').insert(provinceInsertRows).select('*');
    if (locationsError) throw locationsError;
    return res.status(201).json({ ok: true, message: 'Loja administrativa criada. Está inativa até ativar um plano de Hospedagem.', storeId, businessId, store, provinces: insertedProvinces || [] });
  } catch (error) {
    console.error('Admin store creation failed:', JSON.stringify({ code: error?.code || null, message: error?.message || null, details: error?.details || null, hint: error?.hint || null }));
    if (storeId) await auth.supabase.from('admin_stores').delete().eq('id', storeId);
    if (businessId) await auth.supabase.from('businesses').delete().eq('id', businessId);
    if (photoPath) await auth.supabase.storage.from('business-media').remove([photoPath]);
    if (error?.code === '23505') return res.status(409).json({ error: 'A loja única já existe ou ocorreu um conflito de registo.' });
    if (error?.code === '23514' && String(error?.message || '').includes('província e o país principais')) {
      return res.status(400).json({ error: 'A localização do negócio auxiliar não corresponde ao País e Província principais do administrador. A Loja do Administrador mantém as províncias de hospedagem selecionadas.' });
    }
    return res.status(500).json({ error: 'Erro Supabase: ' + (error?.message || 'erro desconhecido') + (error?.code ? ' (' + error.code + ')' : '') });
  }
}
