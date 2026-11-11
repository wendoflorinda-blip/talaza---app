import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const feedTabs = ['Para você', 'Descoberta', 'Agendados', 'Publicidade', 'Desafio'];

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5.5 9v11h13V9M9.5 20v-6h5v6" /></>,
    people: <><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20c.3-3.5 2.4-5.5 6.2-5.5s5.9 2 6.2 5.5" /><path d="M16 5.2a3.1 3.1 0 0 1 0 6M17 14.8c2.4.4 3.8 2.1 4.2 4.7" /></>,
    message: <><path d="M20.5 11.5a8.3 8.3 0 0 1-8.5 8.1 9.6 9.6 0 0 1-4-.8L3 20l1.3-4.2a7.8 7.8 0 0 1-1.3-4.3A8.3 8.3 0 0 1 11.5 3h.5a8.2 8.2 0 0 1 8.5 8.1z" /></>,
    user: <><circle cx="12" cy="7.5" r="4" /><path d="M4 21c.4-4.2 3.1-6.5 8-6.5s7.6 2.3 8 6.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h11" /></>
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function MediaHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Para você');
  const [activeNav, setActiveNav] = useState('Início');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');

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

  async function openCommercial() {
    setMenuOpen(false);
    try {
      // Primeiro reutiliza o contexto enviado pelo Menu Comercial.
      let country = Array.isArray(router.query.country) ? router.query.country[0] : router.query.country;
      let province = Array.isArray(router.query.province) ? router.query.province[0] : router.query.province;
      let homeCountry = Array.isArray(router.query.homeCountry) ? router.query.homeCountry[0] : router.query.homeCountry;
      let homeProvince = Array.isArray(router.query.homeProvince) ? router.query.homeProvince[0] : router.query.homeProvince;

      // Acesso direto à MÍDIA TALAZA: recupera a localização principal da conta.
      if (!country || !province) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = authData?.user?.id;
        if (userId) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('country_id,province_id')
            .eq('id', userId)
            .maybeSingle();
          if (profileError) throw profileError;
          homeCountry = homeCountry || profile?.country_id || '';
          homeProvince = homeProvince || profile?.province_id || '';
          country = country || homeCountry;
          province = province || homeProvince;

          // Se a conta for de vendedor e não tiver localização pessoal,
          // usa a localização do negócio associado à conta.
          if (!country || !province) {
            const { data: business, error: businessError } = await supabase
              .from('businesses')
              .select('country_id,province_id')
              .eq('owner_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (businessError) throw businessError;
            country = country || business?.country_id || '';
            province = province || business?.province_id || '';
          }
        }
      }

      await router.push({
        pathname: '/explore',
        query: {
          ...(country ? { country } : {}),
          ...(province ? { province } : {}),
          ...(homeCountry ? { homeCountry } : {}),
          ...(homeProvince ? { homeProvince } : {}),
        },
      });
    } catch (error) {
      console.error('Não foi possível recuperar a localização ao regressar à TALAZA Comercial:', error);
      // Não perde o acesso à Vitrine se o serviço de localização estiver temporariamente indisponível.
      await router.push('/explore');
    }
  }

  function selectNav(item) {
    setActiveNav(item);
    if (item === 'Início') return;
    if (item === 'Seguindo') setNotice('Os conteúdos dos criadores que segue aparecerão aqui.');
    if (item === 'Mensagens') setNotice('A área de mensagens da MÍDIA TALAZA está a ser preparada.');
    if (item === 'Perfil') setNotice('As definições e o seu perfil estarão disponíveis nesta área.');
  }

  if (loading) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050706', color: '#fff', fontFamily: 'system-ui' }}>A preparar a MÍDIA TALAZA…</main>;

  return (
    <>
      <Head>
        <title>MÍDIA TALAZA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#050706" />
      </Head>
      <main style={{ height: '100dvh', minHeight: 540, width: '100%', overflow: 'hidden', position: 'relative', background: '#050706', color: '#fff', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
        <style>{' * { box-sizing: border-box; } button { font: inherit; } button:focus-visible { outline: 2px solid #19A875; outline-offset: 3px; } .media-tabs::-webkit-scrollbar { display:none; } .media-tabs { scrollbar-width:none; } @media (min-width:700px) { .media-shell { max-width:520px; margin:0 auto; border-left:1px solid #17221d; border-right:1px solid #17221d; } }'}</style>
        <div className="media-shell" style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', background: '#050706' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.42) 0%,transparent 22%,transparent 58%,rgba(0,0,0,.76) 100%)', pointerEvents: 'none' }} />

          <header style={{ position: 'absolute', zIndex: 3, top: 0, left: 0, right: 0, padding: 'max(12px, env(safe-area-inset-top)) 13px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 34 }}>
              <button type="button" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(0,0,0,.24)', color: '#fff', borderRadius: 20, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                <Icon name="menu" size={16} /> Menu
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <nav className="media-tabs" aria-label="Navegação do feed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 17, overflowX: 'auto', flex: 1, whiteSpace: 'nowrap', padding: '0 0 8px' }}>
                {feedTabs.map(tab => (
                  <button key={tab} type="button" onClick={() => { setActiveTab(tab); setActiveNav('Início'); setNotice(''); }} style={{ position: 'relative', flex: '0 0 auto', border: 0, borderBottom: activeTab === tab ? '2px solid #fff' : '2px solid transparent', padding: '6px 0 8px', background: 'transparent', color: activeTab === tab ? '#fff' : 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: activeTab === tab ? 900 : 700, cursor: 'pointer', textShadow: '0 1px 5px #000' }}>{tab}</button>
                ))}
              </nav>
              <button type="button" aria-label="Pesquisar" onClick={() => setSearchOpen(v => !v)} style={{ flex: '0 0 auto', width: 31, height: 31, display: 'grid', placeItems: 'center', border: 0, borderRadius: 50, color: '#fff', background: 'rgba(0,0,0,.25)', cursor: 'pointer' }}><Icon name="search" size={19} /></button>
            </div>
            {searchOpen && <input autoFocus value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Pesquisar criadores e conteúdos" aria-label="Pesquisar criadores e conteúdos" style={{ width: '100%', marginTop: 5, padding: '10px 13px', border: '1px solid rgba(32,180,122,.8)', borderRadius: 12, background: 'rgba(0,0,0,.88)', color: '#fff', outline: 'none', fontSize: 13 }} />}
          </header>

          <section aria-label="Feed vertical de vídeos" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 18px 96px', textAlign: 'center' }}>
            {notice ? (
              <div style={{ maxWidth: 300 }}>
                <div style={{ width: 58, height: 58, borderRadius: 50, margin: '0 auto 15px', display: 'grid', placeItems: 'center', border: '1px solid rgba(32,180,122,.6)', color: '#20B47A', background: 'rgba(10,40,27,.5)' }}><Icon name={activeNav === 'Mensagens' ? 'message' : activeNav === 'Perfil' ? 'user' : 'people'} size={26} /></div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{activeNav}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.68)', lineHeight: 1.6 }}>{notice}</p>
                <button type="button" onClick={() => { setActiveNav('Início'); setNotice(''); }} style={{ border: '1px solid #20B47A', borderRadius: 22, background: 'rgba(32,180,122,.12)', color: '#fff', padding: '9px 18px', fontWeight: 800, cursor: 'pointer' }}>Voltar ao feed</button>
              </div>
            ) : (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(94px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                <span style={{ padding: '7px 12px', borderRadius: 20, background: 'rgba(0,0,0,.28)', color: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: 600 }}>Os vídeos aparecerão aqui</span>
              </div>
            )}
          </section>

          <div style={{ position: 'absolute', zIndex: 2, left: 18, right: 82, bottom: 'calc(78px + env(safe-area-inset-bottom))', textAlign: 'left', pointerEvents: 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 900, textShadow: '0 2px 8px #000' }}>{displayName}</div>
            {username && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', marginTop: 3 }}>{username}</div>}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)', marginTop: 7 }}>Descubra conteúdos de Angola e de todo o mundo.</div>
          </div>

          <nav aria-label="Navegação principal" style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, bottom: 0, minHeight: 'calc(65px + env(safe-area-inset-bottom))', padding: '8px 7px max(8px, env(safe-area-inset-bottom))', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center', background: 'rgba(0,0,0,.94)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
            <button type="button" onClick={() => selectNav('Início')} style={{ display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Início' ? '#fff' : 'rgba(255,255,255,.58)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="home" size={22} />Início</button>
            <button type="button" onClick={() => selectNav('Seguindo')} style={{ display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Seguindo' ? '#20B47A' : 'rgba(255,255,255,.58)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="people" size={22} />Seguindo</button>
            <button type="button" aria-label="Criar publicação" onClick={() => setCreateOpen(true)} style={{ justifySelf: 'center', width: 39, height: 31, display: 'grid', placeItems: 'center', border: '1px solid #20B47A', borderRadius: 8, background: '#fff', color: '#07110c', boxShadow: '3px 0 0 rgba(32,180,122,.55)', cursor: 'pointer' }}><Icon name="plus" size={23} /></button>
            <button type="button" onClick={() => selectNav('Mensagens')} style={{ position: 'relative', display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Mensagens' ? '#20B47A' : 'rgba(255,255,255,.58)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="message" size={22} /><span style={{ position: 'absolute', top: -3, left: 'calc(50% + 5px)', minWidth: 15, height: 15, display: 'grid', placeItems: 'center', borderRadius: 50, background: '#E53D4D', color: '#fff', fontSize: 9, fontWeight: 900 }}>2</span>Mensagens</button>
            <button type="button" onClick={() => selectNav('Perfil')} style={{ display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Perfil' ? '#20B47A' : 'rgba(255,255,255,.58)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="user" size={22} />Perfil</button>
          </nav>
        </div>

        {menuOpen && <div role="dialog" aria-modal="true" aria-label="Menu MÍDIA TALAZA" style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(0,0,0,.7)' }} />
          <aside style={{ position: 'relative', width: 'min(350px,88vw)', height: '100%', background: '#0b100d', borderLeft: '1px solid #1d4934', padding: 22, display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 36px rgba(0,0,0,.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 27 }}>
              <div><div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 900, color: '#20B47A' }}>MENU PRINCIPAL</div><div style={{ fontSize: 21, fontWeight: 950, marginTop: 5 }}>MÍDIA TALAZA</div></div>
              <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} style={{ width: 38, height: 38, border: '1px solid #294638', borderRadius: 11, background: '#101a14', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: '#82978a', marginBottom: 10 }}>ÁREAS TALAZA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, border: '1px solid #24543c', borderRadius: 14, background: '#10251a', marginBottom: 10 }}>
              <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#176b48', color: '#fff', fontSize: 18 }}>▶</span>
              <span><strong style={{ display: 'block', fontSize: 14 }}>MÍDIA TALAZA</strong><small style={{ color: '#9aafa2' }}>Área atual</small></span>
            </div>
            <button type="button" onClick={openCommercial} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: 14, border: '1px solid #294638', borderRadius: 14, background: '#101a14', color: '#fff', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#176b48', color: '#fff', fontSize: 20, fontWeight: 900 }}>T</span>
              <span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 14 }}>TALAZA Comercial</strong><small style={{ color: '#9aafa2' }}>Entrar na vitrine comercial</small></span>
              <span style={{ fontSize: 22, color: '#20B47A' }}>›</span>
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => { setMenuOpen(false); signOut(); }} style={{ width: '100%', padding: 14, border: '1px solid #63343a', borderRadius: 13, background: '#211214', color: '#ff9ba4', fontWeight: 850, textAlign: 'left', cursor: 'pointer' }}>Terminar sessão</button>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#718078', marginTop: 14 }}>Talaza — Tudo num só lugar.</div>
          </aside>
        </div>}

        {createOpen && <div role="dialog" aria-modal="true" aria-label="Criar publicação" style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', padding: 22, background: 'rgba(0,0,0,.76)' }}>
          <div style={{ width: '100%', maxWidth: 340, padding: 22, borderRadius: 18, border: '1px solid #24543c', background: '#0b100d', textAlign: 'center' }}>
            <div style={{ color: '#20B47A', marginBottom: 10 }}><Icon name="plus" size={30} /></div>
            <div style={{ fontWeight: 900, fontSize: 17 }}>Criar publicação</div>
            <p style={{ color: '#a9b7ae', fontSize: 13, lineHeight: 1.6 }}>A publicação de vídeos e fotografias será ativada quando a área de conteúdos estiver ligada.</p>
            <button type="button" onClick={() => setCreateOpen(false)} style={{ border: 0, borderRadius: 22, padding: '10px 22px', background: '#176b48', color: '#fff', fontWeight: 850, cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>}
      </main>
    </>
  );
}
