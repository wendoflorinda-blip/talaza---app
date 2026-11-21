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
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const body = req.body || {};
  const nome = cleanText(body.nome, 120);
  const descricao = cleanText(body.descricao, 1200);
  const telefone = cleanText(body.telefone, 40);
  const categoryId = cleanText(body.categoryId, 80);
  const subcategoryId = cleanText(body.subcategoryId, 80);
  if (!nome || !telefone || !categoryId || !subcategoryId) return res.status(400).json({ error: 'Preencha nome, telefone, categoria e subcategoria.' });
  let photo;
  try { photo = parsePhoto(body.photoDataUrl); } catch (error) { return res.status(400).json({ error: error.message }); }

  try {
    const { data: store, error: storeReadError } = await auth.supabase.from('admin_stores')
      .select('id,business_id,foto_url').eq('owner_id', auth.user.id).maybeSingle();
    if (storeReadError) throw storeReadError;
    if (!store) return res.status(404).json({ error: 'Loja administrativa não encontrada.' });

    const { data: category, error: categoryError } = await auth.supabase.from('categories')
      .select('id').eq('id', categoryId).eq('active', true).eq('signup_visible', true).maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return res.status(400).json({ error: 'A categoria escolhida não está disponível.' });
    const { data: subcategory, error: subcategoryError } = await auth.supabase.from('subcategories')
      .select('id').eq('id', subcategoryId).eq('category_id', categoryId).eq('is_active', true).maybeSingle();
    if (subcategoryError) throw subcategoryError;
    if (!subcategory) return res.status(400).json({ error: 'A subcategoria não pertence à categoria escolhida.' });

    let photoUrl = store.foto_url || null;
    if (photo) {
      const photoPath = store.business_id + '/admin-store-logo-' + Date.now() + '.' + photo.extension;
      const { error: uploadError } = await auth.supabase.storage.from('business-media').upload(photoPath, photo.buffer, { contentType: photo.contentType, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      photoUrl = auth.supabase.storage.from('business-media').getPublicUrl(photoPath).data?.publicUrl || photoUrl;
    }
    const { error: updateStoreError } = await auth.supabase.from('admin_stores').update({
      nome_da_loja: nome, descricao: descricao || null, telefone, foto_url: photoUrl, category_id: categoryId, subcategory_id: subcategoryId
    }).eq('id', store.id).eq('owner_id', auth.user.id);
    if (updateStoreError) throw updateStoreError;
    if (store.business_id) {
      const { error: updateBusinessError } = await auth.supabase.from('businesses').update({
        name: nome, description: descricao || null, phone: telefone, whatsapp: telefone, logo_url: photoUrl, category_id: categoryId, subcategory_id: subcategoryId
      }).eq('id', store.business_id).eq('owner_id', auth.user.id);
      if (updateBusinessError) throw updateBusinessError;
    }
    return res.status(200).json({ ok: true, message: 'Dados da loja atualizados.' });
  } catch (error) {
    console.error('Admin store update failed:', JSON.stringify({ code: error?.code || null, message: error?.message || null, details: error?.details || null }));
    return res.status(500).json({ error: 'Erro ao atualizar a loja: ' + (error?.message || 'erro desconhecido') + (error?.code ? ' (' + error.code + ')' : '') });
  }
}
