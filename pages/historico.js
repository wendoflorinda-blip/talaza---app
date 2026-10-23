import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function HistoricoTalaza() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const type = String(router.query.type || 'vitrine');
  const key = typeof router.query.key === 'string' ? router.query.key : '';
  const returnTo = typeof router.query.returnTo === 'string' ? router.query.returnTo : '/explore';

  useEffect(() => {
    if (!router.isReady) return;
    try {
      const storageKey = type === 'eventos' ? 'talaza_event_history' : key;
      const value = storageKey ? localStorage.getItem(storageKey) : null;
      setItems(value ? JSON.parse(value).slice(0, 100) : []);
    } catch { setItems([]); }
  }, [router.isReady, type, key]);

  function openItem(item) {
    if (type === 'eventos') router.push('/eventos?eventId=' + encodeURIComponent(item.id));
    else if (item.href) router.push(item.href);
    else router.push(returnTo);
  }

  function clearHistory() {
    const storageKey = type === 'eventos' ? 'talaza_event_history' : key;
    try { if (storageKey) localStorage.removeItem(storageKey); } catch {}
    setItems([]);
  }

  return <main style={{minHeight:'100vh',background:'#F6F7F5',padding:'24px 16px',color:'#17211F'}}>
    <div style={{maxWidth:820,margin:'0 auto'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:24}}>
        <Link href={type==='eventos'?'/eventos':returnTo} style={{color:'#0F6E5C',fontWeight:800,textDecoration:'none'}}>← Voltar</Link>
        <strong style={{fontSize:19,letterSpacing:'.04em'}}>TALAZA</strong>
      </header>
      <h1 style={{fontSize:30,margin:'0 0 8px'}}>O teu histórico</h1>
      <p style={{color:'#596560',lineHeight:1.6,margin:'0 0 20px'}}>{type==='eventos'?'Eventos que consultaste. Seleciona um para voltar diretamente à publicação.': 'Negócios que consultaste nesta subcategoria. Seleciona um para abrir novamente o perfil.'}</p>
      {items.length===0 ? <section style={{background:'#fff',border:'1px solid #E2E7E4',borderRadius:16,padding:24}}><h2 style={{fontSize:18}}>Ainda não há histórico</h2><p style={{color:'#596560'}}>Quando consultares publicações ou perfis, eles aparecerão aqui.</p></section> :
      <div style={{display:'grid',gap:12}}>{items.map(item=><button key={item.id} type="button" onClick={()=>openItem(item)} style={{display:'flex',alignItems:'center',gap:14,textAlign:'left',width:'100%',border:'1px solid #E0E6E2',borderRadius:15,padding:12,background:'#fff',color:'#17211F',cursor:'pointer'}}>
        {item.image_url||item.logo_url||item.cover_url ? <img src={item.image_url||item.logo_url||item.cover_url} alt="" style={{width:76,height:76,objectFit:'cover',borderRadius:11,flexShrink:0}}/> : <span style={{width:76,height:76,display:'grid',placeItems:'center',background:'#E7F0EC',color:'#0F6E5C',borderRadius:11,fontSize:24,flexShrink:0}}>▣</span>}
        <span style={{display:'grid',gap:5,minWidth:0}}><strong style={{fontSize:16}}>{item.title||item.name||'Publicação Talaza'}</strong><span style={{fontSize:12,color:'#64716B'}}>{item.event_type||'Perfil de negócio'}</span><span style={{fontSize:12,color:'#0F6E5C',fontWeight:800}}>Abrir novamente →</span></span>
      </button>)}</div>}
      {items.length>0&&<button type="button" onClick={clearHistory} style={{marginTop:20,padding:'10px 14px',border:'1px solid #E1B7B7',borderRadius:10,background:'#fff',color:'#9B2C2C',fontWeight:800,cursor:'pointer'}}>Limpar este histórico</button>}
    </div>
  </main>;
}
