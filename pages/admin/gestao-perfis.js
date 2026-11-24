import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const relationName = (r) => Array.isArray(r) ? r[0]?.name || '' : r?.name || '';
const daysLeft = (expiry) => {
  if (!expiry) return 0;
  const t = new Date(expiry).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.ceil((t - Date.now()) / 86400000)) : 0;
};

export default function GestaoPerfisAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [images, setImages] = useState([]);
  const [products, setProducts] = useState([]);
  const [savedCounts, setSavedCounts] = useState({});
  const [viewedIds, setViewedIds] = useState(new Set());
  const [boostTotals, setBoostTotals] = useState({});
  const [boostInput, setBoostInput] = useState('');
  const [boostBusy, setBoostBusy] = useState(false);
  const [hosting, setHosting] = useState({});
  const [categoryChoice, setCategoryChoice] = useState('');
  const [subcategoryChoice, setSubcategoryChoice] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) { router.replace('/admin/login'); return; }
        const { data: adminRow, error: adminError } = await supabase.from('admin_users').select('id').eq('id', authData.user.id).maybeSingle();
        if (adminError || !adminRow) { router.replace('/'); return; }
        const [businessRes, adminStoreRes, categoryRes, subcategoryRes, savesRes, subscriptionsRes, viewsRes, boostsRes] = await Promise.all([
          supabase.from('businesses').select('id,owner_id,name,description,logo_url,cover_url,country_id,province_id,category_id,subcategory_id,approval_status,is_active,countries(name),provinces(name),categories(name),subcategories(name)').order('created_at',{ascending:false}),
          supabase.from('admin_stores').select('business_id').not('business_id','is',null),
          supabase.from('categories').select('id,name,active,signup_visible').eq('active',true).eq('signup_visible',true).order('name'),
          supabase.from('subcategories').select('id,name,category_id,is_active').eq('is_active',true).order('name'),
          supabase.from('saved_businesses').select('business_id'),
          supabase.from('business_subscriptions').select('business_id,starts_at,expires_at,status,created_at').order('starts_at',{ascending:false}).order('created_at',{ascending:false}),
          supabase.from('admin_business_profile_views').select('business_id,admin_user_id,viewed_at'),
          supabase.from('admin_saved_business_boosts').select('business_id,amount')
        ]);
        for (const res of [businessRes,adminStoreRes,categoryRes,subcategoryRes,savesRes,subscriptionsRes,viewsRes,boostsRes]) if (res.error) throw res.error;
        const adminIds = new Set((adminStoreRes.data || []).map(r => r.business_id).filter(Boolean));
        const normals = (businessRes.data || []).filter(b => !adminIds.has(b.id));
        const viewed = new Set((viewsRes.data || []).map(r=>r.business_id));
        const boosts = {};
        (boostsRes.data || []).forEach(r=>{ boosts[r.business_id]=(boosts[r.business_id]||0)+Number(r.amount||0); });
        const counts = {};
        (savesRes.data || []).forEach(r => { counts[r.business_id] = (counts[r.business_id] || 0) + 1; });
        const latest = {};
        (subscriptionsRes.data || []).forEach(r => { if (!latest[r.business_id]) latest[r.business_id] = r; });
        const hostMap = {};
        normals.forEach(b => {
          const s = latest[b.id] || null, days = daysLeft(s?.expires_at);
          hostMap[b.id] = { subscription:s, days, active:Boolean(s && String(s.status).toLowerCase()==='active' && days>0), label: s && String(s.status).toLowerCase()==='active' && days>0 ? 'Ativa' : days>0 ? (s?.status || 'Outro estado') : 'Expirada/sem hospedagem' };
        });
        if (!cancelled) { setBusinesses(normals); setViewedIds(viewed); setBoostTotals(boosts); setCategories(categoryRes.data || []); setSubcategories(subcategoryRes.data || []); setSavedCounts(counts); setHosting(hostMap); }
      } catch (e) { if (!cancelled) setError(e?.message || 'Não foi possível carregar Gestão de Perfis.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const filtered = useMemo(() => businesses.filter(b => !viewedIds.has(b.id) && String(b.name || '').toLowerCase().includes(search.toLowerCase())), [businesses,search,viewedIds]);
  const compatible = useMemo(() => subcategories.filter(s => String(s.category_id) === String(categoryChoice) && s.is_active !== false), [subcategories,categoryChoice]);

  async function openBusiness(b) {
    setSelected(b);
    try { const {data:{user}}=await supabase.auth.getUser(); if(user){ const {error:viewErr}=await supabase.from('admin_business_profile_views').upsert({business_id:b.id,admin_user_id:user.id,viewed_at:new Date().toISOString()},{onConflict:'business_id,admin_user_id'}); if(!viewErr) setViewedIds(prev=>new Set([...prev,b.id])); } } catch(e) { console.warn('Não foi possível registar visualização administrativa',e); } setCategoryChoice(b.category_id || ''); setSubcategoryChoice(b.subcategory_id || ''); setImages([]); setProducts([]); setError('');
    const [mediaRes, productRes] = await Promise.all([
      supabase.from('business_images').select('id,kind,slot,image_url,storage_path,name,description,price,video_url,media_type,created_at').eq('business_id',b.id).order('kind').order('slot'),
      supabase.from('products').select('id,name,description,price,image_url,is_active,sort_order').eq('business_id',b.id).order('sort_order')
    ]);
    if (mediaRes.error) setError('Não foi possível carregar imagens: '+mediaRes.error.message); else setImages(mediaRes.data || []);
    if (productRes.error) setError(prev => (prev ? prev+'\n' : '')+'Não foi possível carregar produtos: '+productRes.error.message); else setProducts(productRes.data || []);
  }

  async function applyBoost() {
    const amount=Number(boostInput);
    if(!selected||boostBusy||!Number.isInteger(amount)||amount<=0){alert('Introduza uma quantidade inteira maior que zero.');return;}
    setBoostBusy(true);
    try {
      const {data:{user},error:authErr}=await supabase.auth.getUser(); if(authErr||!user) throw new Error('Sessão administrativa não encontrada.');
      const {error:insertErr}=await supabase.from('admin_saved_business_boosts').insert({business_id:selected.id,amount,admin_user_id:user.id});
      if(insertErr) throw insertErr;
      setBoostTotals(prev=>({...prev,[selected.id]:(prev[selected.id]||0)+amount}));
      setBoostInput('');
      alert('Guardados adicionais registados: +'+amount+'. Total mostrado: '+((savedCounts[selected.id]||0)+(boostTotals[selected.id]||0)+amount)+'.');
    } catch(e){ alert(e.message||'Não foi possível adicionar Guardados.'); }
    finally{setBoostBusy(false);}
  }

  async function saveClassification() {
    if (!selected || saving) return;
    const newCategory = categories.find(c => c.id === categoryChoice);
    const newSubcategory = subcategories.find(s => s.id === subcategoryChoice && String(s.category_id) === String(categoryChoice));
    if (!newCategory || !newSubcategory) { alert('Escolha uma categoria e uma subcategoria compatível.'); return; }
    const oldCategory = relationName(selected.categories), oldSubcategory = relationName(selected.subcategories);
    const catChanged = String(selected.category_id) !== String(categoryChoice), subChanged = String(selected.subcategory_id) !== String(subcategoryChoice);
    if (!catChanged && !subChanged) { alert('Não há alterações para guardar.'); return; }
    setSaving(true);
    try {
      const { data: updated, error: updateError } = await supabase.from('businesses').update({ category_id:categoryChoice, subcategory_id:subcategoryChoice }).eq('id',selected.id).eq('owner_id',selected.owner_id).select('id').maybeSingle();
      if (updateError) throw updateError;
      if (!updated) throw new Error('Não foi possível confirmar a atualização do perfil.');
      const title = catChanged && subChanged ? 'Categoria e subcategoria atualizadas' : catChanged ? 'Categoria atualizada' : 'Subcategoria atualizada';
      const content = catChanged && subChanged
        ? 'A Administração alterou a classificação do seu negócio. Categoria: '+oldCategory+' → '+newCategory.name+'. Subcategoria: '+oldSubcategory+' → '+newSubcategory.name+'.'
        : catChanged
          ? 'A Administração alterou a categoria do seu negócio: '+oldCategory+' → '+newCategory.name+'.'
          : 'A Administração alterou a subcategoria do seu negócio: '+oldSubcategory+' → '+newSubcategory.name+'.';
      const { error: notificationError } = await supabase.from('notifications').insert({ user_id:selected.owner_id, title, content, type:'admin_profile_classification', audience:'seller', link:'/seller', reference_id:selected.id });
      if (notificationError) {
        await supabase.from('businesses').update({category_id:selected.category_id,subcategory_id:selected.subcategory_id}).eq('id',selected.id).eq('owner_id',selected.owner_id);
        throw new Error('Não foi possível enviar a notificação. A classificação anterior foi reposta. '+notificationError.message);
      }
      const updatedBusiness = {...selected,category_id:categoryChoice,subcategory_id:subcategoryChoice,categories:{name:newCategory.name},subcategories:{name:newSubcategory.name}};
      setSelected(updatedBusiness); setBusinesses(prev => prev.map(b => b.id === selected.id ? updatedBusiness : b));
      alert('Classificação atualizada e notificação enviada ao vendedor.');
    } catch(e) { alert(e?.message || 'Não foi possível guardar as alterações.'); }
    finally { setSaving(false); }
  }

  if (loading) return <main style={s.page}><p>Carregando Gestão de Perfis…</p></main>;
  return <main style={s.page}>
    <header style={s.header}><button type="button" onClick={() => router.push('/admin')} style={s.back}>← Administração Normal</button><div><h1>Gestão de Perfis</h1><p>Vendedores normais — consulta dos media e correção de categoria/subcategoria. Perfis criados pela Administração ficam excluídos.</p></div></header>
    {error && <div style={s.error}>{error}</div>}
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar negócio…" style={s.search}/>
    <p style={s.count}>{filtered.length} perfis normais</p>
    <div style={s.grid}>{filtered.map(b=>{const h=hosting[b.id]||{days:0,active:false,label:'Sem dados'};return <button key={b.id} type="button" style={s.card} onClick={()=>openBusiness(b)}>
      <div style={s.cover}>{b.cover_url?<img src={b.cover_url} alt="" style={s.coverImg}/>:<span style={s.emptyCover}>Sem capa</span>}</div>
      <div style={s.cardHead}><div style={s.logo}>{b.logo_url?<img src={b.logo_url} alt="" style={s.logoImg}/>:String(b.name||'N').slice(0,1)}</div><div style={{minWidth:0}}><h3>{b.name||'Negócio'}</h3><small>{relationName(b.provinces)} · {relationName(b.countries)}</small></div></div>
      <div style={s.meta}>{relationName(b.categories)||'Categoria —'} · {relationName(b.subcategories)||'Subcategoria —'}</div>
      <div style={s.metrics}><span>♡ {(savedCounts[b.id]||0)+(boostTotals[b.id]||0)} Guardados (reais + adicionais)</span><span style={{color:h.active?'#16744C':'#AF4C38'}}>{h.label} · {h.days} dias restantes</span></div>
    </button>})}</div>
    {selected && <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}><section style={s.modal} role="dialog" aria-modal="true" aria-label="Perfil do negócio">
      <button type="button" style={s.close} onClick={()=>setSelected(null)}>Fechar ✕</button><h2>{selected.name}</h2>
      <div style={s.hero}>{selected.cover_url?<img src={selected.cover_url} alt="Capa" style={s.heroImage}/>:<span>Sem capa</span>}<div style={s.heroLogo}>{selected.logo_url?<img src={selected.logo_url} alt="Logo" style={s.logoImg}/>:<span>Logo</span>}</div></div>
      <p style={s.location}>{relationName(selected.provinces)} · {relationName(selected.countries)}</p><p>{selected.description||'Sem descrição.'}</p>
      <div style={{margin:'14px 0',padding:14,background:'#F0F7F4',border:'1px solid #D7E7DF',borderRadius:12}}><strong>Guardados / estado de hospedagem</strong><p style={{margin:'6px 0'}}>Guardados reais: {savedCounts[selected.id]||0} · Adicionados pela Administração: {boostTotals[selected.id]||0} · Total apresentado: {(savedCounts[selected.id]||0)+(boostTotals[selected.id]||0}</p><label style={s.label}>Quantidade para adicionar</label><input type="number" min="1" step="1" value={boostInput} onChange={e=>setBoostInput(e.target.value)} style={s.search} placeholder="Ex.: 50"/><button type="button" disabled={boostBusy} onClick={applyBoost} style={s.save}>{boostBusy?'A aplicar…':'+ Aumentar Guardados / Aplicar'}</button><p style={s.hint}>Cada adição fica registada no histórico administrativo.</p><button type="button" onClick={()=>router.push('/admin/vistos')} style={s.back}>Abrir Vistos da Administração</button></div><h3>Imagens principais</h3><div style={s.mediaGrid}>{[0,1,2].map(slot=>{const item=images.find(i=>i.kind==='main'&&Number(i.slot)===slot);return <div key={slot} style={s.mediaCell}>{item?.image_url?<img src={item.image_url} alt={'Imagem principal '+(slot+1)} style={s.mediaImage}/>:<span>Imagem {slot+1} não definida</span>}</div>})}</div>
      <h3>Galeria / área de media</h3><div style={s.mediaGrid}>{images.filter(i=>i.kind!=='main').map(i=><div key={i.id} style={s.mediaCell}>{i.video_url?<video src={i.video_url} controls playsInline style={s.mediaImage}/>:i.image_url?<img src={i.image_url} alt={i.name||'Media do negócio'} style={s.mediaImage}/>:<span>Media</span>}<small>{i.name||i.kind||'Galeria'}</small></div>)}</div>
      <h3>Produtos ({products.length})</h3><div style={s.mediaGrid}>{products.map(p=><div key={p.id} style={s.mediaCell}>{p.image_url?<img src={p.image_url} alt={p.name||'Produto'} style={s.mediaImage}/>:<span>Sem imagem</span>}<small>{p.name||'Produto'}{p.price!=null?' · '+p.price+' Kz':''}</small></div>)}</div>
      <div style={s.classification}><h3>Classificação atual e alteração</h3><label style={s.label}>Categoria atual: {relationName(selected.categories)||'—'}</label><select style={s.select} value={categoryChoice} onChange={e=>{setCategoryChoice(e.target.value);setSubcategoryChoice('');}}><option value="">Selecione categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label style={s.label}>Subcategoria atual: {relationName(selected.subcategories)||'—'}</label><select style={s.select} disabled={!categoryChoice} value={subcategoryChoice} onChange={e=>setSubcategoryChoice(e.target.value)}><option value="">Selecione subcategoria</option>{compatible.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <p style={s.hint}>A lista de subcategorias é filtrada pela categoria selecionada. O vendedor receberá uma notificação com o nome da classificação alterada.</p><button type="button" disabled={saving} onClick={saveClassification} style={s.save}>{saving?'A guardar…':'Guardar alterações e notificar'}</button></div>
    </section></div>}
  </main>;
}

const s={
 page:{minHeight:'100vh',background:'#F3F7F5',padding:'22px clamp(12px,3vw,34px)',color:'#173B35',fontFamily:'system-ui,sans-serif'},
 header:{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap',marginBottom:18},
 back:{border:'1px solid #C9DAD4',background:'#fff',borderRadius:12,padding:'10px 14px',fontWeight:800,color:'#075B4E',cursor:'pointer'},
 search:{width:'100%',maxWidth:520,padding:13,borderRadius:12,border:'1px solid #CCDAD5',background:'#fff',fontSize:15,boxSizing:'border-box'},
 count:{fontWeight:800,color:'#5B6D66'},
 grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14},
 card:{textAlign:'left',border:'1px solid #D6E2DD',borderRadius:16,padding:0,overflow:'hidden',background:'#fff',cursor:'pointer',color:'#173B35',boxShadow:'0 3px 12px rgba(12,52,40,.05)'},
 cover:{height:110,background:'#E4EFEB',overflow:'hidden'},
 coverImg:{width:'100%',height:'100%',objectFit:'cover'},
 emptyCover:{display:'grid',placeItems:'center',height:'100%',color:'#82958D'},
 cardHead:{display:'flex',gap:10,alignItems:'center',padding:'12px 12px 4px'},
 logo:{width:44,height:44,flexShrink:0,overflow:'hidden',borderRadius:12,background:'#DDECE6',display:'grid',placeItems:'center',fontWeight:900},
 logoImg:{width:'100%',height:'100%',objectFit:'cover'},
 meta:{padding:'8px 12px',fontSize:12,color:'#66766F'},
 metrics:{display:'flex',flexDirection:'column',gap:5,padding:'0 12px 14px',fontSize:12,fontWeight:800},
 overlay:{position:'fixed',inset:0,zIndex:1000,background:'rgba(5,25,20,.62)',display:'flex',justifyContent:'center',alignItems:'flex-start',overflowY:'auto',padding:16},
 modal:{width:'min(100%,850px)',background:'#fff',borderRadius:20,padding:20,margin:'auto',boxShadow:'0 15px 55px rgba(0,0,0,.2)'},
 close:{display:'block',marginLeft:'auto',border:0,background:'#E6F0EB',borderRadius:10,padding:'9px 12px',fontWeight:800,color:'#075B4E',cursor:'pointer'},
 hero:{position:'relative',height:210,borderRadius:16,overflow:'hidden',background:'#E4EFEB',marginTop:10,display:'grid',placeItems:'center',color:'#7C8F87'},
 heroImage:{width:'100%',height:'100%',objectFit:'cover'},
 heroLogo:{position:'absolute',left:15,bottom:12,width:70,height:70,borderRadius:18,overflow:'hidden',background:'#fff',border:'3px solid white',display:'grid',placeItems:'center',boxShadow:'0 2px 10px #0002'},
 location:{fontWeight:800,color:'#597168'},
 mediaGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,margin:'10px 0 18px'},
 mediaCell:{minHeight:115,background:'#F0F4F2',borderRadius:12,overflow:'hidden',display:'flex',flexDirection:'column',gap:5,alignItems:'center',justifyContent:'center',padding:8,fontSize:12,color:'#65756F'},
 mediaImage:{width:'100%',height:145,objectFit:'contain',background:'#E7ECE9'},
 classification:{marginTop:20,borderTop:'1px solid #DDE6E1',paddingTop:16,display:'grid',gap:10},
 label:{fontWeight:800,fontSize:13},
 select:{width:'100%',padding:12,border:'1px solid #C7D7D1',borderRadius:12,background:'#fff',fontSize:15},
 hint:{fontSize:13,color:'#64766F',lineHeight:1.5},
 save:{border:0,borderRadius:12,padding:'13px 18px',background:'linear-gradient(135deg,#075B4E,#173B35)',color:'#fff',fontWeight:900,cursor:'pointer'},
 error:{padding:12,background:'#FFF1F0',color:'#A52C22',borderRadius:12,marginBottom:12,whiteSpace:'pre-wrap'}
};
