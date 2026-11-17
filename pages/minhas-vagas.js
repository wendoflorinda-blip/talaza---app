import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function MinhasVagas() {
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [rows,setRows] = useState([]);
  const [reasons,setReasons] = useState({});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data:{user:currentUser}, error:authError } = await supabase.auth.getUser();
      if (authError || !currentUser) { router.replace('/login?redirect=%2Fminhas-vagas'); return; }
      if (cancelled) return;
      setUser(currentUser);
      const { data:posts,error:postsError } = await supabase.from('job_posts')
        .select('id,title,description,profession,province_id,created_at,status,expires_at,image_url')
        .eq('user_id',currentUser.id).order('created_at',{ascending:false});
      if (postsError) { setError('Não foi possível carregar as suas vagas.'); setLoading(false); return; }
      const items=posts||[];
      setRows(items);
      const ids=items.map(item=>item.id);
      if(ids.length) {
        const { data:notes,error:notesError } = await supabase.from('notifications')
          .select('reference_id,content,created_at,type')
          .eq('user_id',currentUser.id).eq('type','opportunity_review')
          .in('reference_id',ids).order('created_at',{ascending:false});
        if(notesError) console.warn('Não foi possível carregar motivos das vagas:',notesError.message);
        const map={};
        (notes||[]).forEach(note=>{if(note.reference_id&&!map[note.reference_id])map[note.reference_id]=note.content;});
        setReasons(map);
      }
      if(!cancelled)setLoading(false);
    }
    load();
    return ()=>{cancelled=true;};
  },[]);

  function statusLabel(value) {
    const s=String(value||'').toLowerCase();
    if(['pending','pending_review'].includes(s))return 'Pendente - Por aprovar';
    if(['approved','published'].includes(s))return 'Aprovada';
    if(s==='rejected')return 'Rejeitada';
    if(s==='expired')return 'Expirada';
    return value||'Em análise';
  }
  const home='/explore';
  return <main style={{minHeight:'100vh',background:'#F5F7F6',color:'#17211F',padding:'24px 16px 60px',fontFamily:'Arial, sans-serif'}}>
    <Head><title>Minhas vagas | Talaza</title></Head>
    <div style={{maxWidth:900,margin:'0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:24}}>
        <Link href={home} style={{color:'#0F6E5C',fontWeight:800,textDecoration:'none'}}>← Voltar ao início</Link>
        <strong style={{letterSpacing:2,color:'#0F6E5C'}}>TALAZA</strong>
      </header>
      <h1 style={{fontSize:30,margin:'0 0 8px'}}>Minhas vagas</h1>
      <p style={{color:'#596560',lineHeight:1.6}}>Acompanhe a análise, aprovação ou rejeição das suas publicações.</p>
      {error&&<p role="alert" style={{padding:14,background:'#FFF0F0',color:'#9B2525',borderRadius:12}}>{error}</p>}
      {loading?<p>A carregar as suas vagas…</p>:rows.length===0?<section style={{padding:24,background:'#fff',border:'1px solid #E2E7E4',borderRadius:16}}><h2>Ainda não publicou vagas</h2><Link href="/contratar">Publicar uma vaga</Link></section>:
        <div style={{display:'grid',gap:14}}>{rows.map(item=>{
          const status=String(item.status||'').toLowerCase();
          const rejected=status==='rejected';
          return <article key={item.id} style={{padding:20,background:'#fff',border:'1px solid #E2E7E4',borderRadius:16}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <h2 style={{fontSize:19,margin:0}}>{item.title||item.profession||'Vaga sem título'}</h2>
              <span style={{fontSize:12,fontWeight:800,color:rejected?'#A12626':status==='approved'||status==='published'?'#0F6E5C':'#8A6500'}}>{statusLabel(item.status)}</span>
            </div>
            <p style={{color:'#596560',lineHeight:1.6}}>{item.description||'Sem descrição'}</p>
            <p style={{fontSize:12,color:'#64716B'}}>Enviada em {new Date(item.created_at).toLocaleString('pt-AO')}</p>
            {rejected&&<div style={{padding:13,background:'#FFF0F0',border:'1px solid #F1CACA',borderRadius:12,color:'#8D2424'}}><strong>Motivo da rejeição</strong><p style={{margin:'7px 0 0'}}>{reasons[item.id]||'Consulte as notificações da Talaza para ver o motivo enviado pela equipa.'}</p></div>}
          </article>;
        })}</div>}
    </div>
  </main>;
}
