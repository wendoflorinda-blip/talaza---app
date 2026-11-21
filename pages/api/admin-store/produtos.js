import { requireMainAdmin, cleanText } from '../../../lib/adminStoreAccess';

export const config = { api: { bodyParser: { sizeLimit: '70mb' } } };

function parseImage(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Escolha imagens JPG, PNG ou WEBP.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 6 * 1024 * 1024) throw new Error('Cada imagem deve ter no máximo 6 MB.');
  return { buffer, contentType: 'image/' + match[1], extension: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

export default async function handler(req, res) {
  const auth = await requireMainAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  try {
    const { data: store, error: storeError } = await auth.supabase.from('admin_stores')
      .select('id,business_id').eq('owner_id', auth.user.id).maybeSingle();
    if (storeError) throw storeError;
    if (!store?.business_id) return res.status(404).json({ error: 'Crie primeiro a Loja do Administrador.' });

    if (req.method === 'POST') {
      const name = cleanText(req.body?.name, 120);
      const description = cleanText(req.body?.description, 1000);
      const rawPrice = req.body?.price === '' || req.body?.price == null ? null : Number(req.body.price);
      if (!name) return res.status(400).json({ error: 'Indique o nome do produto.' });
      if (rawPrice !== null && (!Number.isFinite(rawPrice) || rawPrice < 0)) return res.status(400).json({ error: 'Indique um preço válido.' });
      const rawImages = Array.isArray(req.body?.photosDataUrls) ? req.body.photosDataUrls : [req.body?.photoDataUrl];
      const imageDataUrls = rawImages.filter(Boolean).slice(0, 10);
      if (!imageDataUrls.length) return res.status(400).json({ error: 'Escolha pelo menos uma fotografia do produto.' });
      let images;
      try { images = imageDataUrls.map(parseImage); } catch (error) { return res.status(400).json({ error: error.message }); }

      const paths=[];
      try {
        const rows=[];
        for (let i=0;i<images.length;i++) {
          const image=images[i];
          const path=store.business_id+'/admin-product-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,7)+'.'+image.extension;
          const {error:uploadError}=await auth.supabase.storage.from('business-media').upload(path,image.buffer,{contentType:image.contentType,cacheControl:'3600',upsert:false});
          if(uploadError) throw uploadError;
          paths.push(path);
          const imageUrl=auth.supabase.storage.from('business-media').getPublicUrl(path).data?.publicUrl;
          if(!imageUrl) throw new Error('Não foi possível obter a imagem do produto.');
          rows.push({business_id:store.business_id,kind:'panel',image_url:imageUrl,video_url:null,media_type:'image',storage_path:path,name,description:description||null,price:rawPrice});
        }
        const {data:products,error:insertError}=await auth.supabase.from('business_images').insert(rows).select('id,image_url,name,description,price,created_at,media_type,storage_path');
        if(insertError) throw insertError;
        return res.status(201).json({ok:true,products:products||[],product:products?.[0]||null});
      } catch(error) {
        if(paths.length) await auth.supabase.storage.from('business-media').remove(paths);
        console.error('Admin store product upload failed:',error?.code||error?.message);
        throw error;
      }
    }

    if (req.method === 'PATCH') {
      const id=cleanText(req.body?.id,80);
      const name=cleanText(req.body?.name,120);
      const description=cleanText(req.body?.description,1000);
      const rawPrice=req.body?.price===''||req.body?.price==null?null:Number(req.body.price);
      if(!id||!name) return res.status(400).json({error:'Indique o nome do produto.'});
      if(rawPrice!==null&&(!Number.isFinite(rawPrice)||rawPrice<0)) return res.status(400).json({error:'Indique um preço válido.'});
      const {data:product,error:updateError}=await auth.supabase.from('business_images').update({name,description:description||null,price:rawPrice})
        .eq('id',id).eq('business_id',store.business_id).eq('kind','panel')
        .select('id,image_url,name,description,price,created_at,media_type,storage_path').maybeSingle();
      if(updateError) throw updateError;
      if(!product) return res.status(404).json({error:'Produto não encontrado.'});
      return res.status(200).json({ok:true,product});
    }

    if (req.method === 'DELETE') {
      const id = cleanText(req.body?.id, 80);
      if (!id) return res.status(400).json({ error: 'Produto inválido.' });
      const { data: product, error: productError } = await auth.supabase.from('business_images')
        .select('id,storage_path').eq('id', id).eq('business_id', store.business_id).eq('kind', 'panel').maybeSingle();
      if (productError) throw productError;
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
      const { error: deleteError } = await auth.supabase.from('business_images').delete()
        .eq('id', id).eq('business_id', store.business_id);
      if (deleteError) throw deleteError;
      if (product.storage_path) {
        const { error: storageError } = await auth.supabase.storage.from('business-media').remove([product.storage_path]);
        if (storageError) console.warn('Admin product image cleanup failed:', storageError.message);
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error('Admin store products error:', error?.code || error?.message);
    return res.status(500).json({ error: 'Não foi possível guardar ou remover o produto.' });
  }
}
