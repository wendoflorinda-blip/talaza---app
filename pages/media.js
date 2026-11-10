import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const tabs = ['Para si', 'Seguindo', 'Descobrir'];

export default function MediaHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Para si');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) {
        await router.replace('/login?next=/media');
        return;
      }
      setUser(data.user);
      setLoading(false);
    }
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.replace('/login?next=/media');
      else setUser(session.user);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  const metadata = user?.user_metadata || {};
  const displayName = metadata.media_display_name || metadata.display_name || 'Criador';
  const username = metadata.media_username ? '@' + String(metadata.media_username).replace(/^@+/, '') : '';

  async function signOut() {
    await supabase.auth.signOut();
    await router.replace('/login');
  }

  if (loading) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#10172A',color:'#fff',fontFamily:'system-ui'}}>A preparar o seu Feed MÍDIA TALAZA…</main>;

  return (
    <>
      <Head>
        <title>Feed | MÍDIA TALAZA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>
      <main style={{minHeight:'100vh',background:'#F4F6FA',color:'#182238',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
        <header style={{background:'linear-gradient(120deg,#10172A,#24395D)',color:'#fff',padding:'18px 18px 0'}}>
          <div style={{maxWidth:1120,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,paddingBottom:18}}>
              <div>
                <div style={{fontSize:11,letterSpacing:2.5,fontWeight:900,color:'#E8C66A'}}>PLATAFORMA INTERNACIONAL DE CRIADORES</div>
                <div style={{fontSize:25,fontWeight:950,letterSpacing:-.7,marginTop:4}}>MÍDIA <span style={{color:'#E8C66A'}}>TALAZA</span></div>
              </div>
              <button type="button" onClick={signOut} style={{border:'1px solid rgba(255,255,255,.28)',background:'rgba(255,255,255,.08)',color:'#fff',borderRadius:11,padding:'10px 13px',fontWeight:800,cursor:'pointer'}}>Terminar sessão</button>
            </div>
            <nav aria-label="Navegação do feed" style={{display:'flex',gap:8,overflowX:'auto'}}>
              {tabs.map(tab=><button key={tab} type="button" onClick={()=>setActiveTab(tab)} style={{whiteSpace:'nowrap',border:0,borderBottom:activeTab===tab?'3px solid #E8C66A':'3px solid transparent',background:'transparent',color:activeTab===tab?'#E8C66A':'#D6DCE8',padding:'13px 16px',fontWeight:900,cursor:'pointer'}}>{tab}</button>)}
            </nav>
          </div>
        </header>

        <div style={{maxWidth:1120,margin:'0 auto',padding:'24px 16px 60px',display:'grid',gridTemplateColumns:'minmax(0,1fr) 290px',gap:20}}>
          <section>
            <div style={{background:'#fff',border:'1px solid #E5E9F0',borderRadius:18,padding:18,marginBottom:16}}>
              <div style={{fontSize:12,color:'#758095',fontWeight:800}}>BEM-VINDO À MÍDIA TALAZA</div>
              <h1 style={{fontSize:25,margin:'6px 0 3px',color:'#17233F'}}>Olá, {displayName}!</h1>
              <div style={{fontSize:13,color:'#758095'}}>{username} {metadata.media_country ? '· '+metadata.media_country : ''}</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #E5E9F0',borderRadius:18,padding:22,minHeight:300}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                <h2 style={{fontSize:19,margin:0,color:'#17233F'}}>{activeTab}</h2>
                <span style={{fontSize:11,fontWeight:900,color:'#9A762A',background:'#FBF4E3',padding:'6px 9px',borderRadius:99}}>FEED MÍDIA</span>
              </div>
              <div style={{minHeight:230,display:'grid',placeItems:'center',textAlign:'center',padding:20}}>
                <div style={{maxWidth:420}}>
                  <div style={{width:58,height:58,borderRadius:18,margin:'0 auto 14px',display:'grid',placeItems:'center',background:'#F7F0DF',color:'#A77B20',fontSize:28}}>✦</div>
                  <h3 style={{margin:'0 0 8px',fontSize:18,color:'#17233F'}}>O seu feed está a ser preparado</h3>
                  <p style={{margin:0,color:'#758095',fontSize:14,lineHeight:1.7}}>A estrutura de navegação da MÍDIA TALAZA já está pronta. As publicações, vídeos e recomendações serão apresentados aqui quando a camada de conteúdos estiver ligada.</p>
                </div>
              </div>
            </div>
          </section>

          <aside style={{background:'#fff',border:'1px solid #E5E9F0',borderRadius:18,padding:18,height:'fit-content'}}>
            <div style={{fontSize:11,letterSpacing:1.5,fontWeight:900,color:'#A77B20'}}>A SUA CONTA</div>
            <h2 style={{fontSize:18,margin:'8px 0 4px',color:'#17233F'}}>{displayName}</h2>
            {username && <div style={{fontSize:13,color:'#758095'}}>{username}</div>}
            <div style={{height:1,background:'#E9EDF3',margin:'16px 0'}}/>
            <div style={{fontSize:13,color:'#687386',lineHeight:1.7}}>Explore conteúdos de diferentes países, descubra criadores e acompanhe os perfis de que gosta.</div>
            <div style={{marginTop:16,padding:12,borderRadius:12,background:'#F7F8FB',fontSize:12,color:'#687386'}}>Algumas ferramentas ainda estão em preparação. A conta já está ligada à área MÍDIA.</div>
          </aside>
        </div>
      </main>
    </>
  );
}
