import { requireMainAdmin, cleanText } from '../../../lib/adminStoreAccess';

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

function parseImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Escolha uma imagem JPG, PNG ou WEBP.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error('A imagem deve ter até 8 MB.');
  return { buffer, contentType: 'image/' + match[1], extension: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const action = cleanText(req.body?.action, 20);
  const slot = Number(req.body?.slot);
  let image;
  try { image = parseImage(req.body?.imageDataUrl); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const { data: store, error: storeError } = await auth.supabase.from('admin_stores')
      .select('id,business_id,foto_url').eq('owner_id', auth.user.id).maybeSingle();
    if (storeError) throw storeError;
    if (!store?.business_id) return res.status(404).json({ error: 'A Loja do Administrador não está configurada.' });
    if (!['logo','cover','main'].includes(action)) return res.status(400).json({ error: 'Tipo de imagem inválido.' });
    if (action === 'main' && (!Number.isInteger(slot) || slot < 0 || slot > 2)) return res.status(400).json({ error: 'Slot da imagem principal inválido.' });

    const stamp = Date.now();
    const path = store.business_id + '/admin-store-' + action + '-' + stamp + '.' + image.extension;
    const { error: uploadError } = await auth.supabase.storage.from('business-media').upload(path, image.buffer, { contentType: image.contentType, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const url = auth.supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
    if (!url) { await auth.supabase.storage.from('business-media').remove([path]); throw new Error('Não foi possível obter o URL público.'); }

    let oldPath = null;
    if (action === 'logo') {
      const { error: updateStoreError } = await auth.supabase.from('admin_stores').update({ foto_url: url }).eq('id', store.id).eq('owner_id', auth.user.id);
      if (updateStoreError) throw updateStoreError;
      const { error: updateBusinessError } = await auth.supabase.from('businesses').update({ logo_url: url }).eq('id', store.business_id);
      if (updateBusinessError) throw updateBusinessError;
    } else if (action === 'cover') {
      const { error: updateBusinessError } = await auth.supabase.from('businesses').update({ cover_url: url }).eq('id', store.business_id);
      if (updateBusinessError) throw updateBusinessError;
    } else {
      const { data: existing, error: readError } = await auth.supabase.from('business_images').select('id,storage_path').eq('business_id', store.business_id).eq('kind','main').eq('slot',slot).maybeSingle();
      if (readError) throw readError;
      oldPath = existing?.storage_path || null;
      const payload = { business_id: store.business_id, kind: 'main', slot, image_url: url, storage_path: path, video_url: null, media_type: 'image' };
      if (existing?.id) {
        const { error: updateError } = await auth.supabase.from('business_images').update(payload).eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await auth.supabase.from('business_images').insert(payload);
        if (insertError) throw insertError;
      }
    }
    if (oldPath && oldPath !== path) {
      const { error: cleanupError } = await auth.supabase.storage.from('business-media').remove([oldPath]);
      if (cleanupError) console.warn('Admin store image cleanup warning:', cleanupError.message);
    }
    return res.status(200).json({ ok: true, action, slot: action === 'main' ? slot : null, url, storage_path: path, message: action === 'logo' ? 'Logótipo atualizado.' : action === 'cover' ? 'Capa atualizada.' : 'Imagem principal atualizada.' });
  } catch (error) {
    console.error('Admin store asset upload failed:', JSON.stringify({ code: error?.code || null, message: error?.message || null, details: error?.details || null }));
    return res.status(500).json({ error: 'Erro ao guardar imagem: ' + (error?.message || 'erro desconhecido') });
  }
}
