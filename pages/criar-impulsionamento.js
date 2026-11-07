import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const C = { green:'#08745F', dark:'#06483D', gold:'#D8A319', ink:'#182722', muted:'#66736F', bg:'#F7F6F3', line:'#E3E8E4', purple:'#64358B' };

export default function CriarImpulsionamento() {
  const router = useRouter();
  const { plan: planId, edit_promotion_id: editPromotionId } = router.query;
  const [user,setUser] = useState(null);
  const [business,setBusiness] = useState(null);
  const [plan,setPlan] = useState(null);
  const [file,setFile] = useState(null);
  const [preview,setPreview] = useState('');
  const [mediaType,setMediaType] = useState('');
  const [description,setDescription] = useState('');
  const [loading,setLoading] = useState(true);
  const [sending,setSending] = useState(false);
  const [error,setError] = useState('');

  useEffect(()=>{ if(router.isReady && planId) load(); },[router.isReady,planId,editPromotionId]);

  async function load() {
    setLoading(true); setError('');
    const {data:{session},error:sessionError}=await supabase.auth.getSession();
    if(sessionError || !session?.user){ router.replace('/login'); return; }
    setUser(session.user);
    const [p,b]=await Promise.all([
      supabase.from('plans').select('*').eq('id',planId).eq('is_active',true).maybeSingle(),
      supabase.from('businesses').select('id,name,owner_id,country_id,province_id,category_id,subcategory_id,is_active,approval_status').eq('owner_id',session.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    const existingResult = editPromotionId ? await supabase.from('premium_promotions').select('id,business_id,user_id,plan_id,media_url,storage_path,media_type,description,status').eq('id',editPromotionId).eq('user_id',session.user.id).maybeSingle() : { data: null, error: null };
    if(p.error || !p.data || String(p.data.plan_type||'').trim().toLowerCase()!=='destaque premium') {
      setError('Não foi possível confirmar o plano Destaque Premium escolhido.');
    } else if(b.error || !b.data) {
      setError('Não encontramos um negócio associado à sua conta.');
    } else if(!b.data.is_active || String(b.data.approval_status||'').toLowerCase()!=='approved') {
      setError('O seu perfil de negócio precisa estar aprovado e ativo antes de contratar um Destaque Premium.');
    } else if (editPromotionId && (existingResult.error || !existingResult.data || existingResult.data.status !== 'pending_payment' || existingResult.data.plan_id !== p.data.id || existingResult.data.business_id !== b.data.id)) {
      setError('Não foi possível recuperar o anúncio para edição.');
    } else {
      setPlan(p.data); setBusiness(b.data);
      if (existingResult.data) {
        setDescription(existingResult.data.description || '');
        setPreview(existingResult.data.media_url || '');
        setMediaType(existingResult.data.media_type || 'image');
      }
    }
    setLoading(false);
  }

  function chooseFile(next) {
    setError('');
    if(!next) return;
    const video=next.type.startsWith('video/');
    if(video && !['video/mp4','video/webm','video/quicktime'].includes(next.type)) { setError('Use vídeo MP4, WEBM ou MOV.'); return; }
    if(!video && !['image/jpeg','image/png','image/webp'].includes(next.type)) { setError('Use imagem JPG, PNG ou WebP.'); return; }
    if(next.size > 100*1024*1024) { setError('O ficheiro deve ter no máximo 100 MB.'); return; }
    setFile(next);
    setMediaType(video ? 'video' : 'image');
    setPreview(URL.createObjectURL(next));
  }

  async function submit() {
    if(sending) return;
    setError('');
    if(!file && !editPromotionId) { setError('Adicione uma imagem ou vídeo para a publicação.'); return; }
    if(description.trim().length<2) { setError('Escreva uma descrição para a publicação.'); return; }
    if(!user?.id || !business?.id || !plan?.id) { setError('Os dados expiraram. Atualize a página.'); return; }
    setSending(true);
    let storagePath='';
    try {
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError) throw sessionError;
      if(session?.user?.id!==user.id) throw new Error('A sessão mudou. Entre novamente.');
      let mediaUrl = preview;
      let nextMediaType = mediaType || (file?.type?.startsWith('video/') ? 'video' : 'image');
      if (file) {
        const ext=(file.name.split('.').pop() || (file.type.startsWith('video/')?'mp4':'jpg')).toLowerCase().replace(/[^a-z0-9]/g,'');
        storagePath=business.id+'/premium-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
        const {error:uploadError}=await supabase.storage.from('business-media').upload(storagePath,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
        if(uploadError) throw uploadError;
        mediaUrl=supabase.storage.from('business-media').getPublicUrl(storagePath).data?.publicUrl;
        nextMediaType=file.type.startsWith('video/')?'video':'image';
      }
      if(!mediaUrl) throw new Error('Adicione uma imagem ou vídeo para a publicação.');
      let promotionId = editPromotionId;
      if (editPromotionId) {
        const updateData = { description: description.trim() };
        if (file) Object.assign(updateData,{media_url:mediaUrl,storage_path:storagePath,media_type:nextMediaType});
        const {error:updateError}=await supabase.from('premium_promotions').update(updateData).eq('id',editPromotionId).eq('user_id',user.id);
        if(updateError) throw updateError;
      } else {
        const {data:promotion,error:insertError}=await supabase.from('premium_promotions').insert({
          business_id:business.id,user_id:user.id,plan_id:plan.id,media_url:mediaUrl,storage_path:storagePath,
          media_type:nextMediaType,description:description.trim(),status:'pending_payment'
        }).select('id').single();
        if(insertError) throw insertError;
        promotionId=promotion.id;
      }
      const paymentUrl='/Pagamento?'+new URLSearchParams({plan:String(plan.id),business:String(business.id),premium_promotion_id:String(promotionId)}).toString();
      // Navegação completa evita ficar preso no estado "A preparar…" após o upload e a gravação.
      window.location.assign(paymentUrl);
      return;
    } catch(err) {
      console.error('Erro ao criar publicação premium:',err);
      if(storagePath) { const {error:cleanupError}=await supabase.storage.from('business-media').remove([storagePath]); if(cleanupError) console.warn(cleanupError); }
      setError(err.message || 'Não foi possível preparar a publicação.');
      setSending(false);
    }
  }

  if(loading) return <main style={S.center}>A preparar a publicação…</main>;
  return <main style={S.page}>
    <header style={S.header}><div style={S.headerInner}><div><b style={S.brand}>TALAZA</b><div style={S.headTitle}>Criar publicação impulsionada</div></div><Link href="/impulsionar" style={S.back}>← Impulsionar</Link></div></header>
    <div style={S.content}>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {plan && business && <>
        <section style={{...S.plan,background:Number(plan.duration_days)===30?'linear-gradient(135deg,#8D1E1E 0%,#D93620 48%,#F2A900 100%)':'linear-gradient(135deg,#061A40 0%,#123D78 48%,#8CCBFF 100%)',boxShadow:Number(plan.duration_days)===30?'0 18px 38px rgba(157,48,20,.22)':'0 18px 38px rgba(7,35,83,.22)'}}><span style={S.eyebrow}>✦ PLANO ESCOLHIDO · DESTAQUE PREMIUM</span><h1 style={S.title}>{plan.name}</h1><div style={S.price}>{new Intl.NumberFormat('pt-AO').format(Number(plan.price))} Kz</div><p style={{...S.muted,color:'rgba(255,255,255,.92)'}}>{plan.duration_days} dias · {plan.area}</p><p style={{...S.muted,color:'rgba(255,255,255,.92)'}}>Negócio: <b>{business.name}</b></p></section>
        <section style={S.card}>
          <h2 style={S.sectionTitle}>1. Escolha a imagem ou vídeo</h2>
          <p style={S.muted}>A publicação será apresentada nas áreas incluídas no plano depois da confirmação do pagamento.</p>
          <div style={S.mediaPreviewWrap}>
            {preview ? (mediaType==='video' ? <video src={preview} controls playsInline style={S.preview}/> : <img src={preview} alt="Imagem actual da publicação" style={S.preview}/>) : <div style={S.emptyMedia}>Ainda não foi adicionada uma imagem ou um vídeo.</div>}
            <label style={S.changeMedia}><span style={S.changeMediaPlus}>＋</span>{preview ? 'Alterar imagem ou vídeo' : 'Adicionar imagem ou vídeo'}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e=>chooseFile(e.target.files?.[0])} style={{display:'none'}} /></label>
          </div>
          {file && <p style={S.fileName}>Novo ficheiro seleccionado: {file.name}</p>}
          <h2 style={S.sectionTitle}>2. Descrição da publicação</h2>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} rows={5} placeholder="Escreva uma descrição clara para apresentar o seu produto, serviço ou novidade…" style={S.textarea}/>
          <div style={S.count}>{description.length}/2000</div>
          <h2 style={S.sectionTitle}>3. Rever e continuar</h2>
          <p style={S.notice}>Depois de continuar, irá para o pagamento por Multicaixa Express e poderá enviar o comprovativo. A publicação só aparecerá nas vitrines após a administração confirmar o pagamento. A duração começa nessa aprovação.</p>
          <button type="button" onClick={submit} disabled={sending} style={{...S.cta,opacity:sending ? 0.65 : 1}}>{sending?'A preparar…':'Continuar para pagamento →'}</button>
        </section>
      </>}
    </div>
  </main>;
}

const S={
 page:{minHeight:'100vh',background:C.bg,color:C.ink,paddingBottom:50},
 center:{minHeight:'100vh',display:'grid',placeItems:'center',color:C.green,fontWeight:800},
 header:{background:C.dark,color:'#fff',padding:'17px 20px'},
 headerInner:{maxWidth:820,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12},
 brand:{fontSize:11,letterSpacing:2.5,color:C.gold},headTitle:{fontSize:18,fontWeight:800,marginTop:5},
 back:{color:'#fff',textDecoration:'none',fontSize:12,fontWeight:800,border:'1px solid #ffffff55',padding:'10px 13px',borderRadius:11},
 content:{maxWidth:820,margin:'0 auto',padding:'24px 16px'},
 plan:{padding:23,borderRadius:20,background:'linear-gradient(125deg,#06483D,#08745F 58%,#64358B)',color:'#fff',marginBottom:18},
 eyebrow:{fontSize:10,letterSpacing:2,color:'#F4D36B',fontWeight:900},title:{fontSize:26,margin:'10px 0 4px'},price:{fontSize:27,fontWeight:900},muted:{color:C.muted,fontSize:13,lineHeight:1.6},sectionTitle:{fontSize:17,margin:'20px 0 9px'},card:{background:'#fff',border:'1px solid '+C.line,borderRadius:20,padding:22,boxShadow:'0 10px 30px #1827220a'},
 mediaPreviewWrap:{display:'grid',gap:11,marginTop:14},
 emptyMedia:{minHeight:170,display:'grid',placeItems:'center',padding:18,border:'1px dashed #C8D4CE',borderRadius:14,color:C.muted,textAlign:'center',fontSize:13},
 changeMedia:{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:9,width:'100%',boxSizing:'border-box',padding:'12px 15px',border:'1px solid #8FC4B6',borderRadius:12,background:'#F2FAF7',color:C.green,fontWeight:900,cursor:'pointer'},
 changeMediaPlus:{width:25,height:25,display:'grid',placeItems:'center',borderRadius:'50%',background:C.green,color:'#fff',fontSize:19,lineHeight:1},
 preview:{display:'block',width:'100%',maxHeight:440,objectFit:'contain',borderRadius:14,background:'#111'},
 fileName:{fontSize:12,color:C.muted,overflowWrap:'anywhere'},textarea:{width:'100%',boxSizing:'border-box',padding:14,border:'1px solid #CFDAD4',borderRadius:12,font:'inherit',resize:'vertical',outlineColor:C.green},count:{textAlign:'right',fontSize:11,color:C.muted,marginTop:5},
 notice:{padding:14,borderRadius:12,background:'#F2EAF9',color:'#3F1D60',fontSize:13,lineHeight:1.65},
 cta:{width:'100%',marginTop:18,padding:15,border:0,borderRadius:13,background:C.green,color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer'},
 error:{padding:14,marginBottom:16,borderRadius:12,background:'#FFF0EE',color:'#9C3027',lineHeight:1.5}
};
