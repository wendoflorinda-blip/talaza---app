import { requireMainAdmin, cleanText } from '../../../lib/adminStoreAccess';
export const config={api:{bodyParser:{sizeLimit:'70mb'}}};
function parseDataUrl(dataUrl,allowed,maxBytes,label){
 const match=String(dataUrl||'').match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
 if(!match)throw new Error(label+' inválido.');
 const contentType=match[1].toLowerCase();
 if(!allowed.includes(contentType))throw new Error(label+' com formato não suportado.');
 const buffer=Buffer.from(match[2],'base64');
 if(!buffer.length||buffer.length>maxBytes)throw new Error(label+' excede o limite.');
 return {buffer,contentType};
}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
 const auth=await requireMainAdmin(req);if(!auth.ok)return res.status(auth.status).json({error:auth.error});
 let media,proof;try{
  media=parseDataUrl(req.body?.mediaDataUrl,['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'],50*1024*1024,'Mídia');
  proof=parseDataUrl(req.body?.proofDataUrl,['image/jpeg','image/png','image/webp','application/pdf'],8*1024*1024,'Comprovativo');
 }catch(e){return res.status(400).json({error:e.message});}
 const businessId=cleanText(req.body?.businessId,80),planId=cleanText(req.body?.planId,80);
 const provinceIds=[...new Set((Array.isArray(req.body?.provinceIds)?req.body.provinceIds:[]).map(id=>cleanText(id,80)).filter(Boolean))];
 const phone=String(req.body?.expressSenderPhone||'').replace(/[^0-9]/g,'');
 const description=cleanText(req.body?.description,500);
 if(!businessId||!planId)return res.status(400).json({error:'Loja e plano obrigatórios.'});
 if(!provinceIds.length)return res.status(400).json({error:'Escolha pelo menos uma província.'});
 if(phone.length<7||phone.length>15)return res.status(400).json({error:'Número Express inválido.'});
 const userId=auth.user.id;let mediaPath=null,proofPath=null,promotionId=null,paymentId=null;
 try{
  const {data:store,error:storeErr}=await auth.supabase.from('admin_stores').select('id,business_id,owner_id,country_id,account_type').eq('owner_id',userId).eq('business_id',businessId).maybeSingle();
  if(storeErr)throw storeErr;if(!store||store.account_type!=='admin_store')return res.status(404).json({error:'Loja administrativa não encontrada.'});
  const {data:plan,error:planErr}=await auth.supabase.from('plans').select('id,name,price,duration_days,plan_type,area,is_active').eq('id',planId).maybeSingle();
  if(planErr)throw planErr;if(!plan||!plan.is_active||String(plan.plan_type||'').trim().toLowerCase()!=='destaque premium'||Number(plan.price)<=0||Number(plan.duration_days)<=0)return res.status(400).json({error:'Plano Destaque Premium pago inválido.'});
  const {data:prov,error:provErr}=await auth.supabase.from('provinces').select('id,country_id,name').in('id',provinceIds).eq('country_id',store.country_id);
  if(provErr)throw provErr;if((prov||[]).length!==provinceIds.length)return res.status(400).json({error:'Província não pertence ao país da loja.'});
  const ext=m=>m.contentType.split('/')[1].replace('jpeg','jpg');
  mediaPath=businessId+'/admin-premium-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext(media);
  proofPath=userId+'/admin-store-premium-proof-'+Date.now()+'.'+(proof.contentType==='application/pdf'?'pdf':ext(proof));
  const {error:upMedia}=await auth.supabase.storage.from('premium-media').upload(mediaPath,media.buffer,{contentType:media.contentType,cacheControl:'3600',upsert:false});if(upMedia)throw upMedia;
  const {error:upProof}=await auth.supabase.storage.from('payment-proofs').upload(proofPath,proof.buffer,{contentType:proof.contentType,cacheControl:'3600',upsert:false});if(upProof)throw upProof;
  const mediaUrl=auth.supabase.storage.from('premium-media').getPublicUrl(mediaPath).data?.publicUrl;if(!mediaUrl)throw new Error('URL da mídia indisponível.');
  const {data:promo,error:promoErr}=await auth.supabase.from('premium_promotions').insert({business_id:businessId,user_id:userId,plan_id:plan.id,media_url:mediaUrl,storage_path:mediaPath,media_type:media.contentType.startsWith('video/')?'video':'image',description,status:'pending_payment'}).select('id').single();
  if(promoErr)throw promoErr;promotionId=promo.id;
  const {error:provinceInsertErr}=await auth.supabase.from('premium_promotion_provinces').insert((prov||[]).map(row=>({promotion_id:promotionId,province_id:row.id,country_id:row.country_id})));if(provinceInsertErr)throw provinceInsertErr;
  const proofExt=proof.contentType==='application/pdf'?'pdf':ext(proof);
  const {data:payment,error:paymentErr}=await auth.supabase.from('payment_submissions').insert({user_id:userId,business_id:businessId,plan_id:plan.id,premium_promotion_id:promotionId,amount:Number(plan.price),currency:'Kz',currency_code:'Kz',payment_method:'Express',express_sender_phone:phone,proof_url:proofPath,proof_type:proofExt,proof_image_url:proofExt==='pdf'?null:proofPath,proof_file_url:proofExt==='pdf'?proofPath:null,status:'pending',notes:'Destaque Premium da Loja do Administrador'}).select('id').single();
  if(paymentErr)throw paymentErr;paymentId=payment.id;
  const {error:linkErr}=await auth.supabase.from('premium_promotions').update({payment_submission_id:paymentId}).eq('id',promotionId);if(linkErr)throw linkErr;
  return res.status(201).json({ok:true,promotionId,paymentId,message:'Destaque Premium enviado para aprovação.'});
 }catch(error){
  if(paymentId)await auth.supabase.from('payment_submissions').delete().eq('id',paymentId);
  if(promotionId){await auth.supabase.from('premium_promotion_provinces').delete().eq('promotion_id',promotionId);await auth.supabase.from('premium_promotions').delete().eq('id',promotionId);}
  if(mediaPath)await auth.supabase.storage.from('premium-media').remove([mediaPath]);
  if(proofPath)await auth.supabase.storage.from('payment-proofs').remove([proofPath]);
  console.error('Admin-store Premium submission:',error?.code||error?.message);
  return res.status(500).json({error:error?.message||'Falha no envio Premium.'});
 }
}
