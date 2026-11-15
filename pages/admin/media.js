import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

const card = { background:'#FFFFFF', border:'1px solid #E1E6E4', borderRadius:16, padding:18, marginBottom:14 };

export default function AdminMedia() {
  const router = useRouter();
  const [loading,setLoading] = useState(true);
  const [authorized,setAuthorized] = useState(false);
  const [applications,setApplications] = useState([]);
  const [busy,setBusy] = useState('');
  const [filter,setFilter] = useState('all');
  const [message,setMessage] = useState('');

  useEffect(()=>{ checkAdmin(); },[]);

  async function checkAdmin() {
    setLoading(true);
    const {data:authData} = await supabase.auth.getUser();
    if (!authData?.user) { await router.replace('/login?next=/admin/media'); return; }
    const {data:admin,error} = await supabase.from('admin_users').select('id').eq('id',authData.user.id).maybeSingle();
    if (error || !admin) { setAuthorized(false); setLoading(false); return; }
    setAuthorized(true);
    await loadAll();
    setLoading(false);
  }

  async function loadAll() {
    setMessage('');
    const {data,error} = await supabase.from('media_applications')
      .select('id,user_id,display_name,country_id,content_category,languages,bio,social_links,application_status,review_notes,created_at,countries(name)')
      .order('created_at',{ascending:false});
    if (error) { setMessage('Não foi possível carregar as candidaturas MÍDIA: '+error.message); return; }
    setApplications(data || []);
  }

  async function reviewApplication(app,approve) {
    const reason = approve ? '' : window.prompt('Indique o motivo da recusa da candidatura:');
    if (!approve && !reason?.trim()) return;
    if (approve && !window.confirm('Aprovar a candidatura gratuita e ativar o perfil de Criador?')) return;
    setBusy(app.id);
    const {data:authData} = await supabase.auth.getUser();
    const reviewedAt = new Date().toISOString();
    const patch = {
      application_status:approve?'approved':'rejected',
      review_notes:approve?null:reason.trim(),
      reviewed_at:reviewedAt,
      reviewed_by:authData?.user?.id,
      updated_at:reviewedAt,
    };
    const {data:updated,error:updateError} = await supabase.from('media_applications')
      .update(patch).eq('id',app.id).in('application_status',['submitted','under_review']).select('id').maybeSingle();
    if (updateError || !updated) {
      setBusy('');
      alert('Não foi possível atualizar a candidatura: '+(updateError?.message || 'A candidatura já foi analisada.'));
      return;
    }

    if (approve) {
      const {error:profileError} = await supabase.from('media_profiles').upsert({
        user_id:app.user_id,
        application_id:app.id,
        display_name:app.display_name,
        country_id:app.country_id,
        content_category:app.content_category,
        languages:app.languages || [],
        bio:app.bio,
        social_links:app.social_links || {},
        status:'active',
        activated_at:reviewedAt,
      },{onConflict:'user_id'});
      if (profileError) {
        await supabase.from('media_applications').update({application_status:'submitted',reviewed_at:null,reviewed_by:null,updated_at:new Date().toISOString()}).eq('id',app.id);
        setBusy('');
        alert('A candidatura foi guardada, mas não foi possível ativar o perfil: '+profileError.message);
        return;
      }
    } else {
      await supabase.from('media_profiles').update({status:'inactive'}).eq('user_id',app.user_id);
    }

    const {error:notificationError} = await supabase.from('notifications').insert({
      user_id:app.user_id,
      type:'media_creator_application',
      title:approve?'Candidatura de Criador aprovada — Talaza':'Candidatura de Criador recusada — Talaza',
      content:approve
        ? 'A tua candidatura foi aprovada. O teu perfil de Criador está ativo. Já podes abrir e usar a MÍDIA TALAZA. A criação da conta é gratuita.'
        : 'A tua candidatura foi recusada. Motivo: '+reason.trim()+'. Podes contactar o suporte Talaza para esclarecer a situação.',
      reference_id:app.id,
    });
    setBusy('');
    await loadAll();
    if (notificationError) alert('A decisão foi guardada, mas não foi possível criar a notificação: '+notificationError.message);
    else alert(approve?'Criador aprovado e perfil gratuito ativado.':'Candidatura recusada e motivo enviado.');
  }

  const filteredApps = applications.filter(app=>filter==='all' || app.application_status===filter);
  if (loading) return <main style={{padding:30,color:'#243'}}>A carregar administração MÍDIA TALAZA…</main>;
  if (!authorized) return <main style={{padding:30,fontFamily:'system-ui'}}><h1>Acesso reservado</h1><p>Esta área é exclusiva da administração Talaza.</p><Link href="/">Voltar</Link></main>;

  return <>
    <Head><title>Administração MÍDIA | TALAZA</title></Head>
    <main style={{minHeight:'100vh',background:'#F2F4F7',padding:'24px 16px 60px',fontFamily:'system-ui,sans-serif'}}>
      <div style={{maxWidth:1050,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div><div style={{color:'#9A741D',fontWeight:900,letterSpacing:1,fontSize:12}}>TALAZA · ADMINISTRAÇÃO</div><h1 style={{margin:'6px 0',color:'#1C2945'}}>MÍDIA TALAZA</h1><p style={{margin:0,color:'#667080',fontSize:13}}>Gestão e moderação de candidaturas de Criadores. A criação da conta é gratuita; não há pagamentos nesta área.</p></div>
          <Link href="/admin" style={{color:'#174F45',fontWeight:800,textDecoration:'none'}}>← Administração Comercial</Link>
        </div>
        <section style={{...card,marginTop:22}}>
          <h2 style={{margin:'0 0 12px',color:'#1C2945',fontSize:19}}>Candidaturas de Criadores</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
            {['all','submitted','under_review','approved','rejected'].map(value=><button key={value} onClick={()=>setFilter(value)} style={{border:filter===value?'1px solid #1B3158':'1px solid #D7DFE5',borderRadius:99,padding:'8px 12px',background:filter===value?'#1B3158':'#FFF',color:filter===value?'#FFF':'#35445A',fontWeight:800,fontSize:12}}>{value==='all'?'Todas':value}</button>)}
            <button onClick={loadAll} style={{marginLeft:'auto',border:'1px solid #D7DFE5',borderRadius:99,padding:'8px 12px',background:'#FFF',color:'#35445A',fontWeight:800}}>Atualizar</button>
          </div>
          {filteredApps.length===0 && <p style={{color:'#697586'}}>Não há candidaturas nesta categoria.</p>}
          {filteredApps.map(app=><article key={app.id} style={{border:'1px solid #E4E8EC',borderRadius:14,padding:15,marginTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div><h3 style={{margin:0,color:'#1C2945'}}>{app.display_name}</h3><p style={{margin:'5px 0',color:'#657080',fontSize:13}}>{app.countries?.name || 'País não indicado'} · {app.content_category} · {(app.languages||[]).join(', ')}</p><p style={{margin:'5px 0',color:'#657080',fontSize:12}}>Criado em {new Date(app.created_at).toLocaleString('pt-PT')} · Estado: <b>{app.application_status}</b></p></div>
              <div style={{color:'#17664F',fontWeight:900,fontSize:12}}>Cadastro gratuito</div>
            </div>
            {app.bio && <p style={{color:'#455366',fontSize:13,lineHeight:1.5}}>{app.bio}</p>}
            <div style={{display:'flex',gap:10,flexWrap:'wrap',fontSize:13}}>
              {Object.entries(app.social_links||{}).filter(([,url])=>/^https?:\/\//i.test(String(url||''))).map(([network,url])=><a key={network} href={url} target="_blank" rel="noopener noreferrer" style={{color:'#175B4D',fontWeight:800}}>{network}</a>)}
            </div>
            {(app.application_status==='submitted'||app.application_status==='under_review') && <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:13}}>
              <button disabled={!!busy} onClick={()=>reviewApplication(app,true)} style={{border:0,borderRadius:9,padding:'10px 14px',background:'#1B3158',color:'#FFF',fontWeight:900}}>Aprovar candidatura e ativar</button>
              <button disabled={!!busy} onClick={()=>reviewApplication(app,false)} style={{border:0,borderRadius:9,padding:'10px 14px',background:'#FFF',color:'#A12B36',border:'1px solid #E2BFC3',fontWeight:900}}>Recusar candidatura</button>
            </div>}
            {app.review_notes && <p style={{color:'#A12B36',fontSize:13}}>Nota administrativa: {app.review_notes}</p>}
          </article>)}
        </section>
        {message && <p role="alert" style={{color:'#A12B36'}}>{message}</p>}
      </div>
    </main>
  </>;
}
