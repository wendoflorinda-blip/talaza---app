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
  const [menuOpen, setMenuOpen] = useState(false);

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

  function openCommercial() {
    setMenuOpen(false);
    router.push('/explore');
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
              <button type="button" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)} style={{display:'flex',alignItems:'center',gap:9,border:'1px solid rgba(255,255,255,.28)',background:'rgba(255,255,255,.08)',color:'#fff',borderRadius:11,padding:'10px 13px',fontWeight:800,cursor:'pointer'}}>
                <span aria-hidden="true" style={{display:'grid',gap:4,width:17}}><span style={{height:2,borderRadius:2,background:'currentColor'}}/><span style={{height:2,borderRadius:2,background:'currentColor'}}/><span style={{height:2,width:12,borderRadius:2,background:'currentColor'}}/></span>
                Menu
              </button>
            </div>
            <nav aria-label="Navegação do feed" style={{display:'flex',gap:8,overflowX:'auto'}}>
              {tabs.map(tab=><button key={tab} type="button" onClick={()=>setActiveTab(tab)} style={{whiteSpace:'nowrap',border:0,borderBottom:activeTab===tab?'3px solid #E8C66A':'3px solid transparent',background:'transparent',color:activeTab===tab?'#E8C66A':'#D6DCE8',padding:'13px 16px',fontWeight:900,cursor:'pointer'}}>{tab}</button>)}
            </nav>
          </div>
        </header>

        {menuOpen && <div role="dialog" aria-modal="true" aria-label="Menu MÍDIA TALAZA" style={{position:'fixed',inset:0,zIndex:1000,display:'flex',justifyContent:'flex-end'}}>
          <button type="button" aria-label="Fechar menu" onClick={()=>setMenuOpen(false)} style={{position:'absolute',inset:0,border:0,background:'rgba(5,12,27,.58)',cursor:'pointer'}}/>
          <aside style={{position:'relative',width:'min(360px,88vw)',height:'100%',background:'#fff',boxShadow:'-12px 0 36px rgba(0,0,0,.22)',padding:22,display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:26}}>
              <div><div style={{fontSize:10,letterSpacing:2,fontWeight:900,color:'#A77B20'}}>MENU PRINCIPAL</div><div style={{fontSize:22,fontWeight:950,color:'#17233F',marginTop:4}}>MÍDIA TALAZA</div></div>
              <button type="button" aria-label="Fechar menu" onClick={()=>setMenuOpen(false)} style={{width:38,height:38,border:'1px solid #E5E9F0',borderRadius:11,background:'#fff',fontSize:22,color:'#17233F',cursor:'pointer'}}>×</button>
            </div>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#8A94A5',marginBottom:10}}>ÁREAS TALAZA</div>
            <button type="button" onClick={()=>setMenuOpen(false)} style={{width:'100%',display:'flex',alignItems:'center',gap:13,padding:15,border:'1px solid #E7EAF0',borderRadius:14,background:'#F7F8FB',textAlign:'left',cursor:'default',marginBottom:10}}>
              <span style={{width:42,height:42,display:'grid',placeItems:'center',borderRadius:12,background:'#17233F',color:'#E8C66A',fontSize:18}}>▶</span>
              <span><strong style={{display:'block',fontSize:14,color:'#17233F'}}>MÍDIA TALAZA</strong><small style={{color:'#758095'}}>Área atual</small></span>
            </button>
            <button type="button" onClick={openCommercial} style={{width:'100%',display:'flex',alignItems:'center',gap:13,padding:15,border:'1px solid #DDEBE6',borderRadius:14,background:'#F0F7F4',textAlign:'left',cursor:'pointer'}}>
              <span style={{width:42,height:42,display:'grid',placeItems:'center',borderRadius:12,background:'#0F6E5C',color:'#fff',fontSize:20,fontWeight:900}}>T</span>
              <span style={{flex:1}}><strong style={{display:'block',fontSize:14,color:'#083F35'}}>TALAZA Comercial</strong><small style={{color:'#596560'}}>Entrar na vitrine comercial</small></span>
              <span aria-hidden="true" style={{fontSize:22,color:'#0F6E5C'}}>›</span>
            </button>
            <div style={{flex:1}}/>
            <button type="button" onClick={()=>{setMenuOpen(false);signOut();}} style={{width:'100%',padding:14,border:'1px solid #F1D9D9',borderRadius:13,background:'#FFF7F7',color:'#A43E46',fontWeight:850,textAlign:'left',cursor:'pointer'}}>Terminar sessão</button>
            <div style={{textAlign:'center',fontSize:11,color:'#9AA3B1',marginTop:14}}>Talaza — Tudo num só lugar.</div>
          </aside>
        </div>}
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
