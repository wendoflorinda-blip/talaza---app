import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const COLORS = { green:'#0F6E5C', dark:'#083F35', gold:'#DDA10A', purple:'#7656A6', ink:'#17211F', muted:'#596560', line:'#E5E9E7', bg:'#F8F6F3' };

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-AO', { day:'2-digit', month:'short', year:'numeric' });
}

export default function RedeParcerias() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [province, setProvince] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [activeTab, setActiveTab] = useState('entregas');
  const [availablePartners, setAvailablePartners] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [business, setBusiness] = useState(null);
  const [account, setAccount] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [selectedProvinceIds, setSelectedProvinceIds] = useState([]);
  const [publications, setPublications] = useState([]);
  const [myPublications, setMyPublications] = useState([]);
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [reactivationProof, setReactivationProof] = useState(null);
  const [reactivationPending, setReactivationPending] = useState(false);
  const [sendingReactivation, setSendingReactivation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const maxProvinces = account?.unlocked_tier === 'girassol_pro' ? 10 : 3;
  const progressGoal = account?.unlocked_tier === 'girassol' || account?.unlocked_tier === 'girassol_pro' ? 1000000 : 5000;
  const progress = Math.min(100, (Number(account?.unique_saved_count || 0) / progressGoal) * 100);
  const isUnlocked = Boolean(account?.unlocked_tier);
  const isSuspended = account?.access_status === 'suspended';
  const reactivationAmount = Number(account?.reactivation_amount || 12000);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const [{ data: authData }, { data: provinceRows, error: provinceError }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('provinces').select('id,name,country_id').order('name')
        ]);
        if (provinceError) throw provinceError;
        if (cancelled) return;
        const currentUser = authData?.user || null;
        setUser(currentUser);
        setProvinces(provinceRows || []);
        const requestedProvince = String(router.query.province || router.query.homeProvince || '');
        const requestedCountry = String(router.query.country || router.query.homeCountry || '');
        let profileProvince = '';
        let profileCountry = '';
        if (currentUser) {
          const { data: profile } = await supabase.from('profiles').select('country_id,province_id').eq('id', currentUser.id).maybeSingle();
          profileProvince = profile?.province_id || '';
          profileCountry = profile?.country_id || '';
        }
        const activeProvince = requestedProvince || profileProvince;
        if (cancelled) return;
        setProvince(activeProvince);
        const provinceRow = (provinceRows || []).find(item => item.id === activeProvince);
        const activeCountry = requestedCountry || profileCountry || provinceRow?.country_id || '';
        setCountryId(activeCountry);
        setProvinceName(provinceRow?.name || '');

        if (currentUser) {
          const { data: ownedBusiness, error: businessError } = await supabase.from('businesses')
            .select('id,owner_id,name,country_id,province_id,logo_url,is_active,approval_status')
            .eq('owner_id', currentUser.id).order('created_at', { ascending:false }).limit(1).maybeSingle();
          if (businessError) throw businessError;
          if (ownedBusiness) {
            setBusiness(ownedBusiness);
            const [{ data: girassolAccount, error: accountError }, { data: ownRows, error: ownError }] = await Promise.all([
              supabase.from('girassol_accounts').select('business_id,unique_saved_count,unlocked_tier,unlocked_at,access_status,progress_reset_at,reactivation_started_at,reactivation_amount').eq('business_id', ownedBusiness.id).maybeSingle(),
              supabase.from('girassol_publications').select('id,business_id,media_path,media_type,description,status,created_at,expires_at,next_publish_at').eq('business_id', ownedBusiness.id).order('created_at', { ascending:false })
            ]);
            if (accountError) throw accountError;
            if (ownError) throw ownError;
            setAccount(girassolAccount || null);
            setMyPublications(ownRows || []);
            const { data: pendingReactivation } = await supabase.from('girassol_reactivation_requests').select('id').eq('business_id', ownedBusiness.id).eq('status','pending').limit(1).maybeSingle();
            setReactivationPending(Boolean(pendingReactivation));
          }
        }

        if (activeProvince) {
          const { data: targetRows, error: targetError } = await supabase.from('girassol_publication_provinces')
            .select('publication_id').eq('province_id', activeProvince);
          if (targetError) throw targetError;
          const ids = [...new Set((targetRows || []).map(row => row.publication_id))];
          if (ids.length) {
            const { data: posts, error: postsError } = await supabase.from('girassol_publications')
              .select('id,business_id,media_path,media_type,description,created_at,expires_at')
              .in('id', ids).eq('status','active').gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false});
            if (postsError) throw postsError;
            const businessIds = [...new Set((posts || []).map(row => row.business_id))];
            const { data: businessRows, error: businessesError } = await supabase.from('businesses')
              .select('id,name,owner_id,logo_url,province_id,country_id').in('id',businessIds.length ? businessIds : ['00000000-0000-0000-0000-000000000000'])
              .eq('is_active',true).eq('approval_status','approved');
            if (businessesError) throw businessesError;
            const byId = Object.fromEntries((businessRows || []).map(row => [row.id,row]));
            const provinceIds = [...new Set((businessRows || []).map(row => row.province_id))];
            const { data: originRows } = await supabase.from('provinces').select('id,name').in('id',provinceIds.length ? provinceIds : ['00000000-0000-0000-0000-000000000000']);
            const originNames = Object.fromEntries((originRows || []).map(row => [row.id,row.name]));
            const enriched = await Promise.all((posts || []).filter(row => byId[row.business_id]).map(async row => {
              const { data: signed } = await supabase.storage.from('girassol-publications').createSignedUrl(row.media_path, 3600);
              return { ...row, business:byId[row.business_id], originProvince:originNames[byId[row.business_id].province_id] || '', signedUrl:signed?.signedUrl || '' };
            }));
            if (!cancelled) setPublications(enriched);
          } else if (!cancelled) setPublications([]);
        } else if (!cancelled) setPublications([]);
      } catch (err) {
        console.error('Erro ao carregar Rede de Parcerias:',err);
        if (!cancelled) setError(err.message || 'Não foi possível carregar a Rede de Parcerias.');
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [router.isReady, router.query.province, router.query.homeProvince, router.query.country, router.query.homeCountry]);

  const latestPublication = useMemo(() => myPublications[0] || null, [myPublications]);
  const canPublishAt = latestPublication?.next_publish_at ? new Date(latestPublication.next_publish_at) : null;
  const cooldownActive = Boolean(canPublishAt && canPublishAt > new Date());
  const hostingActive = Boolean(business?.is_active && business?.approval_status === 'approved');

  function toggleProvince(id) {
    setSelectedProvinceIds(current => current.includes(id) ? current.filter(value => value !== id) : current.length < maxProvinces ? [...current,id] : current);
  }

  async function submitReactivation() {
    if (!business || !account?.unlocked_tier || !isSuspended || !reactivationProof || sendingReactivation) return;
    if (!reactivationProof.type.startsWith('image/') && reactivationProof.type !== 'application/pdf') { setError('Envie uma imagem ou um comprovativo PDF.'); return; }
    if (reactivationProof.size > 10 * 1024 * 1024) { setError('O comprovativo deve ter no máximo 10 MB.'); return; }
    setSendingReactivation(true); setError(''); setNotice('');
    let proofPath = '';
    try {
      const ext = (reactivationProof.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
      proofPath = business.id + '/reactivation-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('girassol-proofs').upload(proofPath,reactivationProof,{upsert:false,contentType:reactivationProof.type});
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('girassol_reactivation_requests').insert({business_id:business.id,tier:account.unlocked_tier,amount:reactivationAmount,currency:'AOA',proof_path:proofPath,status:'pending'});
      if (insertError) throw insertError;
      setReactivationPending(true); setReactivationProof(null);
      const input = document.getElementById('girassol-reactivation-proof'); if (input) input.value = '';
      setNotice('Comprovativo enviado. A reactivação aguarda aprovação da administração. A hospedagem normal continua independente.');
    } catch (err) {
      if (proofPath) await supabase.storage.from('girassol-proofs').remove([proofPath]).catch(()=>{});
      setError(err.message || 'Não foi possível enviar o comprovativo de reactivação.');
    } finally { setSendingReactivation(false); }
  }

  async function publish() {
    if (!user || !business) { setError('Entre numa conta de vendedor para publicar.'); return; }
    if (!isUnlocked || isSuspended) { setError('O acesso Girassol ainda não está activo.'); return; }
    if (!hostingActive) { setError('A hospedagem da loja precisa de estar activa.'); return; }
    if (!mediaFile || !description.trim() || selectedProvinceIds.length < 1) { setError('Escolha uma imagem ou vídeo, escreva a descrição e seleccione as províncias.'); return; }
    if (cooldownActive) { setError('A próxima publicação só ficará disponível em ' + formatDate(canPublishAt) + '.'); return; }
    const isVideo = mediaFile.type.startsWith('video/');
    if (!isVideo && !mediaFile.type.startsWith('image/')) { setError('Escolha uma imagem ou vídeo válido.'); return; }
    if (mediaFile.size > 100 * 1024 * 1024) { setError('O ficheiro deve ter no máximo 100 MB.'); return; }
    setPublishing(true); setError(''); setNotice('');
    let path = '';
    try {
      const ext = (mediaFile.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g,'') || (isVideo ? 'mp4' : 'jpg');
      path = business.id + '/parceria-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('girassol-publications').upload(path,mediaFile,{upsert:false,contentType:mediaFile.type,cacheControl:'3600'});
      if (uploadError) throw uploadError;
      const { data: publicationId, error: rpcError } = await supabase.rpc('girassol_publish',{
        p_business_id:business.id,p_media_path:path,p_media_type:isVideo?'video':'image',
        p_description:description.trim(),p_province_ids:selectedProvinceIds
      });
      if (rpcError) throw rpcError;
      setNotice('Publicação enviada para Entrega Interprovincial. Ficará disponível durante 5 dias.');
      setDescription(''); setMediaFile(null); setSelectedProvinceIds([]);
      const { data: ownRows } = await supabase.from('girassol_publications').select('id,business_id,media_path,media_type,description,status,created_at,expires_at,next_publish_at').eq('business_id',business.id).order('created_at',{ascending:false});
      setMyPublications(ownRows || []);
      const input = document.getElementById('girassol-media'); if (input) input.value = '';
      if (!publicationId) console.warn('Publicação criada sem ID devolvido pela RPC.');
    } catch (err) {
      if (path) await supabase.storage.from('girassol-publications').remove([path]).catch(() => {});
      console.error('Erro ao publicar na Rede de Parcerias:',err);
      setError(err.message || 'Não foi possível publicar. Verifique o acesso Girassol e tente novamente.');
    } finally { setPublishing(false); }
  }

  return (
    <>
      <Head><title>Rede de Parcerias | TALAZA</title><meta name="description" content="Conheça negócios de outras províncias na Entrega Interprovincial da Talaza." /></Head>
      <main style={{minHeight:'100vh',background:COLORS.bg,color:COLORS.ink,padding:'24px 16px 60px'}}>
        <div style={{maxWidth:1120,margin:'0 auto'}}>
          <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap',marginBottom:22}}>
            <div><div style={{fontSize:12,fontWeight:900,letterSpacing:1.5,color:COLORS.green}}>TALAZA · LIGAÇÕES ENTRE PROVÍNCIAS</div><h1 style={{fontSize:30,lineHeight:1.1,margin:'8px 0',color:COLORS.dark}}>Rede de Parcerias</h1><p style={{margin:0,color:COLORS.muted}}>Descubra negócios que fazem entregas para a sua província.</p></div>
            <button type="button" onClick={() => {
              const target = String(router.query.returnTo || '');
              if (target.startsWith('/') && !target.startsWith('//')) router.push(target + (target.includes('?') ? '&' : '?') + 'menuOpen=1');
              else router.push({pathname:'/explore',query:{country:countryId,province,menuOpen:'1'}});
            }} style={{padding:'10px 15px',borderRadius:12,border:'1px solid '+COLORS.line,background:'#fff',color:COLORS.dark,fontWeight:800,cursor:'pointer'}}>← Voltar ao menu</button>
          </header>
          {error && <div role="alert" style={{padding:13,marginBottom:12,borderRadius:12,background:'#FDECEC',color:'#9B2929'}}>{error}</div>}
          {notice && <div role="status" style={{padding:13,marginBottom:12,borderRadius:12,background:'#E8F3F0',color:COLORS.dark}}>{notice}</div>}
          {loading ? <div style={{padding:32,textAlign:'center'}}>A carregar Rede de Parcerias…</div> : (
            <>
              <section style={{background:'#fff',border:'1px solid '+COLORS.line,borderRadius:18,padding:18,marginBottom:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <div><h2 style={{margin:'0 0 5px',fontSize:20,color:COLORS.dark}}>Entrega Interprovincial</h2><p style={{margin:0,color:COLORS.muted,fontSize:13}}>Esta área é separada da Vitrine local. Os negócios aparecem aqui apenas nas províncias seleccionadas pelo vendedor.</p></div>
                  <label style={{fontSize:13,fontWeight:800,color:COLORS.dark}}>Província de entrega
                    <select value={province} onChange={event=>router.push({pathname:'/rede-parcerias',query:{province:event.target.value,country:countryId,homeCountry:router.query.homeCountry||countryId,homeProvince:router.query.homeProvince||province}})} style={{display:'block',marginTop:6,minWidth:190,padding:10,borderRadius:10,border:'1px solid '+COLORS.line,background:'#fff'}}><option value="">Seleccione a província</option>{provinces.filter(item=>!countryId || item.country_id===countryId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  </label>
                </div>
              </section>

              {business && (
                <section style={{background:'#fff',border:'1px solid '+COLORS.line,borderRadius:18,padding:18,marginBottom:20}}>
                  <h2 style={{margin:'0 0 8px',fontSize:19,color:COLORS.dark}}>Acesso do seu negócio</h2>
                  {!isUnlocked ? <>
                    <p style={{color:COLORS.muted}}>Guardados únicos: <strong>{Number(account?.unique_saved_count||0).toLocaleString('pt-AO')}</strong> de <strong>{progressGoal.toLocaleString('pt-AO')}</strong></p>
                    <div style={{height:9,borderRadius:99,background:'#EDF0EE',overflow:'hidden'}}><div style={{height:'100%',width:progress+'%',background:COLORS.gold}}/></div>
                    <p style={{fontSize:13,color:COLORS.muted}}>Ao atingir 5.000 Guardados desbloqueia Girassol. Ao atingir 1.000.000 desbloqueia Girassol Pró.</p>
                  </> : <>
                    <p style={{margin:'0 0 12px',color:COLORS.muted}}>Nível: <strong>{account.unlocked_tier === 'girassol_pro' ? 'Girassol Pró' : 'Girassol'}</strong> · {isSuspended ? 'Acesso suspenso' : 'Acesso activo'}</p>
                    {account.unlocked_tier === 'girassol' && <div style={{margin:'12px 0 16px'}}><p style={{fontSize:13,color:COLORS.muted}}>Progresso para Girassol Pró: <strong>{Number(account.unique_saved_count||0).toLocaleString('pt-AO')} / 1.000.000 Guardados únicos</strong></p><div style={{height:8,borderRadius:99,background:'#EDF0EE',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,(Number(account.unique_saved_count||0)/1000000)*100)+'%',background:COLORS.gold}}/></div></div>}
                    {isSuspended && <div style={{padding:14,borderRadius:12,background:'#FFF8E7',marginTop:10}}><p style={{color:'#805A00',marginTop:0}}>A conquista permanece, mas o acesso está suspenso. Envie o comprovativo de reactivação de {reactivationAmount.toLocaleString('pt-AO')} Kz. Este pagamento não substitui a hospedagem normal da loja.</p>{reactivationPending ? <strong style={{color:'#805A00'}}>Comprovativo recebido · A aguardar análise administrativa</strong> : <><label style={{display:'block',fontWeight:800,marginBottom:7}}>Comprovativo de {reactivationAmount.toLocaleString('pt-AO')} Kz</label><input id="girassol-reactivation-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event=>setReactivationProof(event.target.files?.[0]||null)}/><button type="button" disabled={!reactivationProof||sendingReactivation} onClick={submitReactivation} style={{display:'block',marginTop:12,border:0,borderRadius:10,padding:'11px 16px',background:COLORS.green,color:'#fff',fontWeight:900,opacity:!reactivationProof||sendingReactivation ? .6 : 1}}>{sendingReactivation?'A enviar…':'Enviar comprovativo de reactivação'}</button></>}</div>}
                    {!isSuspended && <>
                      <p style={{fontSize:13,color:COLORS.muted}}>Pode seleccionar até {maxProvinces} províncias por publicação. A publicação dura 5 dias e poderá publicar novamente 15 dias após a publicação anterior.</p>
                      <label style={{display:'block',fontWeight:800,margin:'12px 0 6px'}}>Descrição</label>
                      <textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Descreva os produtos ou serviços que entrega noutras províncias…" style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:12,border:'1px solid '+COLORS.line,resize:'vertical'}}/>
                      <label style={{display:'block',fontWeight:800,margin:'12px 0 6px'}}>Foto ou vídeo</label>
                      <input id="girassol-media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={event=>setMediaFile(event.target.files?.[0]||null)} />
                      <p style={{fontSize:12,color:COLORS.muted}}>Seleccione as províncias onde consegue efectuar entregas:</p>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:8,maxHeight:220,overflowY:'auto',padding:8,border:'1px solid '+COLORS.line,borderRadius:12}}>
                        {provinces.filter(item=>item.country_id===business.country_id && item.id!==business.province_id).map(item=><label key={item.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,padding:7,background:selectedProvinceIds.includes(item.id)?'#E8F3F0':'#fff',borderRadius:8}}><input type="checkbox" checked={selectedProvinceIds.includes(item.id)} onChange={()=>toggleProvince(item.id)} disabled={!selectedProvinceIds.includes(item.id)&&selectedProvinceIds.length>=maxProvinces}/>{item.name}</label>)}
                      </div>
                      <p style={{fontSize:12,color:COLORS.muted}}>{selectedProvinceIds.length} de {maxProvinces} províncias seleccionadas. A província de origem do negócio não é alterada.</p>
                      {!hostingActive && <p style={{color:'#9B2929'}}>A hospedagem normal da loja não está activa. As publicações ficam suspensas até renovar.</p>}
                      {cooldownActive && <p style={{color:'#8B5B00'}}>Próxima publicação disponível a partir de {formatDate(canPublishAt)}.</p>}
                      <button type="button" disabled={publishing||!hostingActive||cooldownActive} onClick={publish} style={{border:0,borderRadius:12,padding:'12px 18px',background:COLORS.green,color:'#fff',fontWeight:900,cursor:'pointer',opacity:publishing||!hostingActive||cooldownActive ? .55 : 1}}>{publishing?'A publicar…':'Publicar na Entrega Interprovincial'}</button>
                    </>}
                  </>}
                  {myPublications.length>0 && <div style={{marginTop:18,borderTop:'1px solid '+COLORS.line,paddingTop:14}}><h3 style={{fontSize:15,color:COLORS.dark}}>As minhas publicações</h3>{myPublications.map(item=><p key={item.id} style={{fontSize:13,color:COLORS.muted,margin:'7px 0'}}> {item.status==='active'?'Activa':'Expirada'} · publicada em {formatDate(item.created_at)} · termina em {formatDate(item.expires_at)} · próxima publicação: {formatDate(item.next_publish_at)}</p>)}</div>}
                </section>
              )}

              <section>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:12}}><div><h2 style={{margin:0,color:COLORS.dark,fontSize:21}}>{provinceName ? 'Negócios que entregam em '+provinceName : 'Escolha uma província'}</h2><p style={{margin:'5px 0 0',fontSize:13,color:COLORS.muted}}>Publicações de vendedores Girassol e Girassol Pró.</p></div><span style={{fontSize:12,color:COLORS.muted}}>{publications.length} publicações</span></div>
                {!province ? <div style={{padding:26,background:'#fff',borderRadius:16,color:COLORS.muted}}>Seleccione uma província para consultar as entregas disponíveis.</div> : publications.length===0 ? <div style={{padding:26,background:'#fff',borderRadius:16,color:COLORS.muted}}>Ainda não existem publicações de entrega para esta província.</div> : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:16}}>
                  {publications.map(item=><article key={item.id} style={{background:'#fff',border:'1px solid '+COLORS.line,borderRadius:17,overflow:'hidden'}}>
                    {item.signedUrl ? (item.media_type==='video' ? <video src={item.signedUrl} controls playsInline style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',background:'#111'}}/> : <img src={item.signedUrl} alt={item.description} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',display:'block'}}/>) : <div style={{aspectRatio:'1/1',display:'grid',placeItems:'center',background:'#F0F2F0',color:COLORS.muted}}>Multimédia indisponível</div>}
                    <div style={{padding:14}}><div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>{item.business.logo_url ? <img src={item.business.logo_url} alt="" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover'}}/> : <span style={{width:38,height:38,borderRadius:'50%',background:'#E8F3F0',display:'grid',placeItems:'center',fontWeight:900,color:COLORS.green}}>{item.business.name?.slice(0,1)||'T'}</span>}<div><strong style={{display:'block',color:COLORS.dark}}>{item.business.name}</strong><span style={{fontSize:11,color:COLORS.muted}}>Origem: {item.originProvince}</span></div></div><p style={{fontSize:13,lineHeight:1.5,whiteSpace:'pre-wrap',margin:'0 0 14px'}}>{item.description}</p><div style={{display:'flex',gap:8}}><Link href={'/businesses/'+item.business.id+'?country='+item.business.country_id+'&province='+item.business.province_id} style={{flex:1,textAlign:'center',padding:'10px 8px',borderRadius:10,background:COLORS.green,color:'#fff',textDecoration:'none',fontWeight:800,fontSize:12}}>Ver perfil</Link><button type="button" onClick={()=>router.push({pathname:'/mensagens',query:{to:item.business.owner_id,source:'Entrega Interprovincial',sourceId:item.id,box:'explore'}})} style={{flex:1,padding:'10px 8px',borderRadius:10,border:'1px solid '+COLORS.green,background:'#fff',color:COLORS.green,fontWeight:800,fontSize:12,cursor:'pointer'}}>Enviar mensagem</button></div></div>
                  </article>)}
                </div>}
              </section>
            </>
          )}
        </div>
      </main>
      <style jsx>{`@media(max-width:600px){main{padding-left:10px!important;padding-right:10px!important}}`}</style>
    </>
  );
}
