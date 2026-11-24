import {useEffect,useState} from 'react';
import {useRouter} from 'next/router';
import {supabase} from '../../lib/supabaseClient';

const labelDate=(v)=>v?new Date(v).toLocaleString('pt-AO'):'Data indisponível';
const ageMonths=(v)=>{const d=new Date(v);return (Date.now()-d.getTime())/(1000*60*60*24*30.4375);};
export default function AdminVistos(){
 const router=useRouter(); const [loading,setLoading]=useState(true),[error,setError]=useState(''),[items,setItems]=useState([]);
 useEffect(()=>{(async()=>{
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser(); if(authError||!user){router.replace('/admin/login');return;}
   const {data:admin,error:adminError}=await supabase.from('admin_users').select('id').eq('id',user.id).maybeSingle(); if(adminError||!admin){router.replace('/');return;}
   const {data,error:loadError}=await supabase.from('admin_business_profile_views').select('business_id,admin_user_id,viewed_at,businesses(id,name,logo_url,cover_url,province_id,provinces(name),countries(name),categories(name),subcategories(name))').order('viewed_at',{ascending:false});
   if(loadError)throw loadError;
   const {data:subs,error:subsError}=await supabase.from('business_subscriptions').select('business_id,starts_at,created_at').order('starts_at',{ascending:false}).order('created_at',{ascending:false}); if(subsError)throw subsError;
   const subscriptionMap={}; (subs||[]).forEach(s=>{if(!subscriptionMap[s.business_id])subscriptionMap[s.business_id]=s;});
   const {data:storeIds,error:storesError}=await supabase.from('admin_stores').select('business_id').not('business_id','is',null); if(storesError)throw storesError;
   const excluded=new Set((storeIds||[]).map(x=>x.business_id));
   const dedup=new Map();
   (data||[]).filter(v=>v.businesses&&!excluded.has(v.business_id)).forEach(v=>{if(!dedup.has(v.business_id))dedup.set(v.business_id,v);});
   setItems([...dedup.values()].map(v=>({...v,payment_started_at:subscriptionMap[v.business_id]?.starts_at||subscriptionMap[v.business_id]?.created_at||null})));
  }catch(e){setError(e.message||'Falha ao carregar vistos.');}
  finally{setLoading(false);}
 })();},[router]);
 const groups=[{title:'Vistos recentes',sub:'Pagamento com menos de 3 meses',filter:x=>!x.payment_started_at||ageMonths(x.payment_started_at)<3},{title:'Vistos há mais de 3 meses',sub:'Pagamento entre 3 meses e 1 ano',filter:x=>x.payment_started_at&&ageMonths(x.payment_started_at)>=3&&ageMonths(x.payment_started_at)<12},{title:'Vistos há mais de 1 ano',sub:'Pagamento há 12 meses ou mais',filter:x=>x.payment_started_at&&ageMonths(x.payment_started_at)>=12}];
 return <main style={{minHeight:'100vh',padding:'22px clamp(12px,3vw,34px)',background:'#F3F7F5',color:'#173B35',fontFamily:'system-ui,sans-serif'}}>
 <button onClick={()=>router.push('/admin')} style={button}>← Administração Normal</button><header style={{margin:'18px 0'}}><h1>Vistos</h1><p>Perfis normais já consultados pela Administração, organizados pela data da última visualização.</p></header>
 {error&&<div style={{background:'#FFF0EE',color:'#9C3027',padding:12,borderRadius:10}}>{error}</div>}
 {loading?<p>Carregando…</p>:groups.map(g=>{const list=items.filter(g.filter);return <section key={g.title} style={{margin:'24px 0'}}><h2>{g.title}</h2><small>{g.sub} · {list.length}</small>{list.length===0?<p style={{color:'#6C7A74'}}>Nenhum perfil nesta faixa.</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12,marginTop:12}}>{list.map(x=>{const b=x.businesses;return <article key={x.business_id} style={card}><div style={{height:90,background:'#E3EEE8',overflow:'hidden'}}>{b.cover_url&&<img src={b.cover_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div style={{display:'flex',gap:10,alignItems:'center',padding:12}}>{b.logo_url?<img src={b.logo_url} alt="" style={{width:44,height:44,objectFit:'cover',borderRadius:10}}/>:<div style={logo}>{(b.name||'N').slice(0,1)}</div>}<div><strong>{b.name}</strong><div style={{fontSize:12,color:'#66766F'}}>{b.provinces?.name||'—'} · {b.countries?.name||'—'}</div></div></div><div style={{padding:'0 12px 14px',fontSize:12,color:'#5C6C65'}}>Visto em: <strong>{labelDate(x.viewed_at)}</strong><p>{b.categories?.name||'—'} · {b.subcategories?.name||'—'}</p><button onClick={()=>router.push('/admin/gestao-perfis')} style={button}>Gestão de Perfis</button></div></article>})}</div>}</section>})}
 </main>;
}
const button={border:'1px solid #C9DAD4',background:'#fff',borderRadius:11,padding:'10px 14px',fontWeight:800,color:'#075B4E',cursor:'pointer'};
const card={border:'1px solid #D6E2DD',borderRadius:15,overflow:'hidden',background:'#fff',boxShadow:'0 3px 12px rgba(12,52,40,.05)'};
const logo={width:44,height:44,display:'grid',placeItems:'center',borderRadius:10,background:'#DDECE6',fontWeight:900};
