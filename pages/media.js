import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    heart: <><path d="M20.8 8.8c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11A4.8 4.8 0 0 1 12 7.1a4.8 4.8 0 0 1 8.8 1.7Z" fill="currentColor" stroke="none" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5.5 9v11h13V9M9.5 20v-6h5v6" /></>,
    people: <><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20c.3-3.5 2.4-5.5 6.2-5.5s5.9 2 6.2 5.5" /><path d="M16 5.2a3.1 3.1 0 0 1 0 6M17 14.8c2.4.4 3.8 2.1 4.2 4.7" /></>,
    message: <><path d="M20.5 11.5a8.3 8.3 0 0 1-8.5 8.1 9.6 9.6 0 0 1-4-.8L3 20l1.3-4.2a7.8 7.8 0 0 1-1.3-4.3A8.3 8.3 0 0 1 11.5 3h.5a8.2 8.2 0 0 1 8.5 8.1z" /></>,
    user: <><circle cx="12" cy="7.5" r="4" /><path d="M4 21c.4-4.2 3.1-6.5 8-6.5s7.6 2.3 8 6.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="m4 16.5 11.8-11.8 3.5 3.5L7.5 19.3 4 20z"/><path d="m14.5 6 3.5 3.5"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    sparkle: <><path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 10 20.1l1.2-1.2"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    photo: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5-8 8"/></>,
    comment: <><path d="M20.5 11.5a8.3 8.3 0 0 1-8.5 8.1 9.6 9.6 0 0 1-4-.8L3 20l1.3-4.2a7.8 7.8 0 0 1-1.3-4.3A8.3 8.3 0 0 1 11.5 3h.5a8.2 8.2 0 0 1 8.5 8.1z"/></>,
    share: <><path d="M12 16V3M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h11" /></>
  };
  if (name === 'compass') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 5px rgba(255,91,160,.85)) drop-shadow(0 0 7px rgba(255,153,55,.5))' }}><defs><linearGradient id="mediaExploreGradient" x1="2" y1="3" x2="22" y2="21"><stop stopColor="#FF55B8"/><stop offset="1" stopColor="#FF9B38"/></linearGradient></defs><circle cx="12" cy="12" r="9.2" stroke="url(#mediaExploreGradient)" strokeWidth="1.8"/><path d="m15.9 8.1-2.8 6-5 1.8 2.8-6 5-1.8Z" fill="url(#mediaExploreGradient)" stroke="url(#mediaExploreGradient)" strokeWidth="1.4"/><circle cx="12" cy="12" r="1.1" fill="#fff"/></svg>;
  return <svg {...common}>{paths[name]}</svg>;
}

export default function MediaHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeNav, setActiveNav] = useState('Início');
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [exploreTab, setExploreTab] = useState('Explorar');
  const [followed, setFollowed] = useState({});
  const [postLiked, setPostLiked] = useState(false);
  const [profileTab, setProfileTab] = useState('Fotos');

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
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.push('/login?next=/explore');
        return;
      }
      const { data: profile, error } = await supabase.from('profiles')
        .select('country_id,province_id').eq('id', user.id).maybeSingle();
      if (error) throw error;
      let countryId = profile?.country_id || '';
      let provinceId = profile?.province_id || '';
      const mediaCountryId = user.user_metadata?.media_country_id || '';
      const mediaProvinceId = user.user_metadata?.media_province_id || '';
      if (mediaCountryId) countryId = mediaCountryId;
      if (mediaProvinceId) provinceId = mediaProvinceId;
      if (!countryId || !provinceId) {
        const { data: sync, error: syncError } = await supabase.rpc('sync_media_creator_commercial_profile');
        if (syncError) throw syncError;
        countryId = sync?.country_id || countryId;
        provinceId = sync?.province_id || provinceId;
      }
      if (!countryId || !provinceId) throw new Error('LOCALIZACAO_COMERCIAL_INCOMPLETA');
      const [{ data: countryRow }, { data: provinceRow }] = await Promise.all([
        supabase.from('countries').select('id,name').eq('id', countryId).maybeSingle(),
        supabase.from('provinces').select('id,name,country_id').eq('id', provinceId).eq('country_id', countryId).maybeSingle(),
      ]);
      if (!provinceRow?.id) throw new Error('PROVINCIA_COMERCIAL_INVALIDA');
      router.push({ pathname: '/explore', query: { country: countryRow?.id || countryId, province: provinceRow.id, homeCountry: countryRow?.id || countryId, homeProvince: provinceRow.id } });
    } catch (err) {
      console.error('Não foi possível abrir Talaza Comercial com a localização da Mídia:', err);
      setNotice('Não foi possível sincronizar o país e a província do teu perfil. Tenta novamente.');
    }
  }

  function selectNav(item) {
    setActiveNav(item);
    if (item === 'Início') return;
    if (item === 'Fã clube') setNotice('Os conteúdos dos criadores que segue aparecerão aqui.');
    if (item === 'Explorar') { setNotice(''); setExploreTab('Explorar'); return; }
    if (item === 'Mensagens') setNotice('A área de mensagens da MÍDIA TALAZA está a ser preparada.');
    if (item === 'Perfil') { setNotice(''); setProfileTab('Fotos'); return; }
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

          {activeNav === 'Início' && (          <header style={{ position: 'absolute', zIndex: 3, top: 0, left: 0, right: 0, padding: 'max(12px, env(safe-area-inset-top)) 13px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 34 }}>
              <button type="button" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(0,0,0,.24)', color: '#fff', borderRadius: 20, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                <Icon name="menu" size={16} /> Menu
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 9, paddingBottom: 7 }}><div style={{ color: '#fff', fontSize: 16, fontWeight: 950 }}>Pra você</div></div>
          </header>)}


          <section aria-label="Feed vertical de vídeos" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 18px 96px', textAlign: 'center' }}>
            {activeNav === 'Perfil' ? (
              <div style={{ position: 'absolute', inset: 0, background: '#1b0629', overflowY: 'auto', padding: 'max(12px,env(safe-area-inset-top)) 14px calc(88px + env(safe-area-inset-bottom))', color: '#fff', textAlign: 'left' }}>
                <div style={{ position: 'relative', height: 156, borderRadius: 19, background: 'linear-gradient(115deg,#c9f33a 0%,#68bb38 45%,#11643b 100%)', marginBottom: 64, overflow: 'visible' }}>
                  <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 9 }}>
                    <button aria-label="Adicionar pessoa" type="button" onClick={() => setNotice('Convidar pessoas para o perfil.')} style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid rgba(0,0,0,.25)', background: 'rgba(20,30,24,.65)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="people" size={18}/></button>
                    <button aria-label="Configurações do perfil" type="button" onClick={() => setNotice('Configurações de aparência do perfil.')} style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid rgba(0,0,0,.25)', background: 'rgba(20,30,24,.65)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="sparkle" size={18}/></button>
                  </div>
                  <div style={{ position: 'absolute', left: 14, bottom: -51, width: 104, height: 104, borderRadius: 22, padding: 3, background: 'linear-gradient(135deg,#ff4da9,#a83bfa)', boxShadow: '0 0 17px rgba(229,61,202,.3)' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 19, background: 'linear-gradient(140deg,#ff74bb,#8d42e7)', display: 'grid', placeItems: 'center', fontSize: 29, fontWeight: 950, letterSpacing: 1 }}>MK</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -.4 }}>Mara Kiala</div>
                  <div style={{ fontSize: 12, color: '#b9a8c8' }}>@marakiala · fala Português</div>
                  <div style={{ fontSize: 12, color: '#b9a8c8', display: 'flex', alignItems: 'center', gap: 5 }}>⌖ Luanda, Angola</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 5 }}>Bastidores, ensaios e música nova toda semana. Entre no meu fã clube.</div>
                  <button type="button" onClick={() => setNotice('Editar o link do perfil.')} style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #45245b', background: '#2b103b', color: '#9ed9ff', fontSize: 12, fontWeight: 800, textAlign: 'left' }}><Icon name="link" size={16}/> marakiala.com/links <span style={{ marginLeft: 'auto', color: '#c4b4d2' }}><Icon name="edit" size={15}/></span></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 19, marginBottom: 18, textAlign: 'center' }}>
                  {[['18,4 mil','seguidores'],['312','seguindo'],['2.310','no fã clube']].map(([count,label]) => <div key={label}><div style={{ fontSize: 17, fontWeight: 950 }}>{count}</div><div style={{ color: '#b9a8c8', fontSize: 11, marginTop: 3 }}>{label}</div></div>)}
                </div>
                <div style={{ display: 'grid', gap: 9, marginBottom: 19 }}>
                  <button type="button" onClick={() => setNotice('Criar uma publicação no Explore.')} style={{ width: '100%', border: 0, borderRadius: 13, padding: 13, background: '#f4df83', color: '#241b10', fontSize: 13, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}><Icon name="globe" size={18}/>Publicar no explore</button>
                  <button type="button" onClick={() => setNotice('Planos do fã clube.')} style={{ width: '100%', border: 0, borderRadius: 13, padding: 13, background: '#ff3fa3', color: '#fff', fontSize: 13, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}><Icon name="sparkle" size={18}/>Ver planos</button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    <button type="button" onClick={() => selectNav('Mensagens')} style={{ border: '1px solid #4a2a5c', borderRadius: 12, padding: 11, background: '#2b103b', color: '#fff', fontSize: 12, fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="message" size={16}/>Mensagens</button>
                    <button type="button" onClick={() => setNotice('Editar perfil.')} style={{ border: '1px solid #4a2a5c', borderRadius: 12, padding: 11, background: '#2b103b', color: '#fff', fontSize: 12, fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="edit" size={16}/>Editar perfil</button>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 950, marginBottom: 10 }}>Gerir o meu fã clube</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <button type="button" onClick={() => setNotice('Gerir publicações, lives e enquetes do fã clube.')} style={{ padding: 12, border: '1px solid #45245b', borderRadius: 15, background: '#2b103b', textAlign: 'left', color: '#fff' }}>
                    <div style={{ width: 37, height: 37, borderRadius: 11, background: '#ff3fa3', display: 'grid', placeItems: 'center', marginBottom: 9 }}><Icon name="people" size={20}/></div>
                    <div style={{ fontSize: 12, fontWeight: 950 }}>Meu fã clube</div><div style={{ fontSize: 10, color: '#b9a8c8', lineHeight: 1.5, marginTop: 4 }}>Publicar, lives e enquetes</div>
                  </button>
                  <button type="button" onClick={() => setNotice('Configurar como os fãs interagem.')} style={{ padding: 12, border: '1px solid #45245b', borderRadius: 15, background: '#2b103b', textAlign: 'left', color: '#fff' }}>
                    <div style={{ width: 37, height: 37, borderRadius: 11, background: '#ff3fa3', display: 'grid', placeItems: 'center', marginBottom: 9 }}><Icon name="sparkle" size={20}/></div>
                    <div style={{ fontSize: 12, fontWeight: 950 }}>Configurar</div><div style={{ fontSize: 10, color: '#b9a8c8', lineHeight: 1.5, marginTop: 4 }}>Como os fãs interagem</div>
                  </button>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #45245b', marginBottom: 10 }}>
                  {['Fotos','Vídeos'].map(tab => <button key={tab} type="button" onClick={() => setProfileTab(tab)} style={{ flex: 1, padding: '11px 8px', border: 0, borderBottom: profileTab === tab ? '2px solid #ff4fa9' : '2px solid transparent', background: 'transparent', color: profileTab === tab ? '#fff' : '#b9a8c8', fontSize: 12, fontWeight: 900 }}>{tab}</button>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                  {['linear-gradient(145deg,#ff68ad,#8a36ce)','linear-gradient(145deg,#ffab43,#d83f56)','linear-gradient(145deg,#44d6a0,#1a8465)','linear-gradient(145deg,#53a8ff,#4545bb)','linear-gradient(145deg,#b879ff,#6434ae)','linear-gradient(145deg,#ff586c,#9e315c)','linear-gradient(145deg,#d9e73f,#569e39)','linear-gradient(145deg,#37d5e4,#356aa8)','linear-gradient(145deg,#ed81d0,#6b42c8)'].map((gradient,i) => <div key={'tile-'+profileTab+'-'+i} style={{ aspectRatio: '1/1', borderRadius: 9, background: gradient, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>{i%3===1 && <Icon name="lock" size={21}/>}</div>)}
                </div>
              </div>
            ) : activeNav === 'Explorar' ? (

              <div style={{ position: 'absolute', inset: 0, background: '#1b0629', overflowY: 'auto', padding: 'max(62px, env(safe-area-inset-top)) 12px calc(90px + env(safe-area-inset-bottom))', textAlign: 'left', color: '#fff' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 3, display: 'flex', gap: 8, padding: '9px 0 13px', background: '#1b0629' }}>
                  <button type="button" onClick={() => setExploreTab('Explorar')} style={{ padding: '9px 17px', border: 0, borderRadius: 22, background: exploreTab === 'Explorar' ? '#fff' : '#2b103b', color: exploreTab === 'Explorar' ? '#19121d' : '#d3c6dc', fontSize: 13, fontWeight: 900 }}>Explorar</button>
                  <button type="button" onClick={() => setExploreTab('Descoberta')} style={{ padding: '9px 17px', border: 0, borderRadius: 22, background: exploreTab === 'Descoberta' ? '#fff' : '#2b103b', color: exploreTab === 'Descoberta' ? '#19121d' : '#d3c6dc', fontSize: 13, fontWeight: 900 }}>Descoberta</button>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button aria-label="Mensagens" type="button" onClick={() => selectNav('Mensagens')} style={{ width: 37, height: 37, borderRadius: 50, border: '1px solid #4b2a5c', background: '#2b103b', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="message" size={19}/></button>
                    <button aria-label="Notificações" type="button" onClick={() => setNotice('As notificações serão mostradas aqui.')} style={{ position: 'relative', width: 37, height: 37, borderRadius: 50, border: '1px solid #4b2a5c', background: '#2b103b', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="bell" size={19}/><span style={{ position: 'absolute', right: -2, top: -2, width: 9, height: 9, borderRadius: 50, background: '#ff4fa9', boxShadow: '0 0 8px #ff4fa9' }}/></button>
                  </div>
                </div>
                {exploreTab === 'Explorar' ? (
                  <div style={{ display: 'grid', gap: 18 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Sugestões de pessoas</div>
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                        {['Yuri','Zuri','Lucie','Kota'].map((name,i) => (
                          <div key={name} style={{ flex: '0 0 82px', display: 'grid', justifyItems: 'center', gap: 6 }}>
                            <div style={{ width: 62, height: 62, borderRadius: 50, padding: 3, background: 'linear-gradient(135deg,#ff4fa9,#ff9a37)', boxShadow: '0 0 12px rgba(255,86,164,.35)' }}><div style={{ width: '100%', height: '100%', borderRadius: 50, background: ['linear-gradient(145deg,#48c5ff,#3154bd)','linear-gradient(145deg,#ff85b5,#9b4bca)','linear-gradient(145deg,#54d8c1,#2374a2)','linear-gradient(145deg,#ffd15e,#e55e47)'][i], display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 20 }}>{name[0]}</div></div>
                            <div style={{ fontSize: 12, fontWeight: 800 }}>{name}</div>
                            <button type="button" onClick={() => setFollowed(v => ({...v,[name]:!v[name]}))} style={{ width: 76, padding: '6px 0', border: 0, borderRadius: 18, background: followed[name] ? '#482451' : '#ff3fa3', color: '#fff', fontSize: 10, fontWeight: 900 }}>{followed[name] ? 'Seguindo' : 'Seguir'}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 12, borderRadius: 15, background: '#2b103b', border: '1px solid #45245b' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 50, background: 'linear-gradient(135deg,#45c5ff,#8753d9)', display: 'grid', placeItems: 'center', fontWeight: 900 }}>A</div>
                      <div style={{ flex: 1, padding: '9px 11px', borderRadius: 20, background: '#3a1b4a', color: '#cdbed7', fontSize: 12 }}>No que está a pensar?</div>
                      <button aria-label="Adicionar imagem" type="button" style={{ border: 0, background: 'transparent', color: '#ff75bb', display: 'grid', placeItems: 'center' }}><Icon name="photo" size={22}/></button>
                    </div>
                    <article style={{ padding: 12, borderRadius: 16, background: '#2b103b', border: '1px solid #45245b', display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 39, height: 39, borderRadius: 50, background: 'linear-gradient(135deg,#59a9ff,#4060c8)', display: 'grid', placeItems: 'center', fontWeight: 900 }}>A</div>
                        <div><div style={{ fontSize: 13, fontWeight: 900 }}>Ana Bela</div><div style={{ fontSize: 10, color: '#b7a6c6', marginTop: 2 }}>há 20 min · Português</div></div>
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.55 }}>Quem vem à live de sábado? Vou mostrar os bastidores do novo clipe.</div>
                      <div style={{ height: 180, borderRadius: 12, background: 'linear-gradient(135deg,#3c2d8d 0%,#7743a7 40%,#20285b 100%)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%,rgba(255,112,193,.55),transparent 42%),linear-gradient(150deg,transparent,rgba(9,9,38,.55))' }}/>
                        <div style={{ zIndex: 1, fontSize: 13, fontWeight: 950, letterSpacing: 2, textShadow: '0 2px 9px #190c39' }}>BASTIDORES · LIVE</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', color: '#c5b4d1', fontSize: 11 }}>
                        <button type="button" onClick={() => setPostLiked(v => !v)} style={{ border: 0, background: 'transparent', color: postLiked ? '#ff64b5' : '#c5b4d1', display: 'flex', gap: 5, alignItems: 'center' }}><Icon name="heart" size={17}/> {postLiked ? 'Gostei' : 'Gosto'}</button>
                        <button type="button" onClick={() => setNotice('Comentários do post de Ana Bela.')} style={{ border: 0, background: 'transparent', color: '#c5b4d1', display: 'flex', gap: 5, alignItems: 'center' }}><Icon name="comment" size={17}/>Comentar</button>
                        <button type="button" onClick={() => setNotice('Partilha do post de Ana Bela.')} style={{ border: 0, background: 'transparent', color: '#c5b4d1', display: 'flex', gap: 5, alignItems: 'center' }}><Icon name="share" size={17}/>Partilhar</button>
                      </div>
                    </article>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div style={{ fontSize: 14, fontWeight: 900 }}>Fã-clubes para aderir</div><div style={{ color: '#b7a6c6', fontSize: 11 }}>sugestões</div></div>
                      <div style={{ display: 'flex', gap: 11, overflowX: 'auto', paddingBottom: 5 }}>
                        {[
                          {name:'Yuri Estúdio',detail:'640 membros · English',color:'linear-gradient(135deg,#2368d6,#543b9e)',button:'Aderir desde…'},
                          {name:'Lucie M.',detail:'1,5 mil membros · França',color:'linear-gradient(135deg,#238b68,#2364a8)',button:'Aderir'}
                        ].map(club => (
                          <div key={club.name} style={{ flex: '0 0 174px', borderRadius: 14, overflow: 'hidden', background: '#2b103b', border: '1px solid #45245b' }}>
                            <div style={{ height: 90, background: club.color, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 950, letterSpacing: 1 }}>{club.name.toUpperCase()}</div>
                            <div style={{ padding: 10, display: 'grid', gap: 5 }}>
                              <div style={{ fontSize: 12, fontWeight: 900 }}>{club.name}</div><div style={{ fontSize: 10, color: '#b7a6c6' }}>{club.detail}</div>
                              <button type="button" onClick={() => setNotice('A adesão ao fã-clube estará disponível em breve.')} style={{ marginTop: 3, border: 0, borderRadius: 18, padding: '7px 5px', background: '#ff3fa3', color: '#fff', fontSize: 10, fontWeight: 900 }}>{club.button}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ minHeight: 240, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 8, textAlign: 'center', padding: 20, borderRadius: 18, background: '#2b103b', border: '1px solid #45245b' }}>
                    <div style={{ fontSize: 22 }}>✨</div><div style={{ fontWeight: 900 }}>Descoberta</div><div style={{ fontSize: 12, color: '#c8b8d4' }}>Novos criadores, vídeos e comunidades aparecerão aqui.</div>
                  </div>
                )}
              </div>
            ) : notice ? (
              <div style={{ maxWidth: 300 }}>
                <div style={{ width: 58, height: 58, borderRadius: 50, margin: '0 auto 15px', display: 'grid', placeItems: 'center', border: '1px solid rgba(32,180,122,.6)', color: '#20B47A', background: 'rgba(10,40,27,.5)' }}><Icon name={activeNav === 'Mensagens' ? 'message' : activeNav === 'Perfil' ? 'user' : 'people'} size={26} /></div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{activeNav}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.68)', lineHeight: 1.6 }}>{notice}</p>
                <button type="button" onClick={() => { setActiveNav('Início'); setNotice(''); }} style={{ border: '1px solid #20B47A', borderRadius: 22, background: 'rgba(32,180,122,.12)', color: '#fff', padding: '9px 18px', fontWeight: 800, cursor: 'pointer' }}>Voltar ao feed</button>
              </div>
            ) : (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(102px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                <span style={{ padding: '7px 12px', borderRadius: 20, background: 'rgba(0,0,0,.28)', color: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: 600 }}>Os vídeos aparecerão aqui</span>
              </div>
            )}
          </section>

          <div style={{ position: 'absolute', zIndex: 2, left: 18, right: 82, bottom: 'calc(94px + env(safe-area-inset-bottom))', textAlign: 'left', pointerEvents: 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 900, textShadow: '0 2px 8px #000' }}>{displayName}</div>
            {username && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', marginTop: 3 }}>{username}</div>}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)', marginTop: 7 }}>Descubra conteúdos de Angola e de todo o mundo.</div>
          </div>

          <nav aria-label="Navegação principal" style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, bottom: 0, minHeight: 'calc(65px + env(safe-area-inset-bottom))', padding: '8px 7px max(8px, env(safe-area-inset-bottom))', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center', background: 'linear-gradient(180deg,#321047 0%,#260834 55%,#1d062c 100%)', borderTop: '1px solid rgba(255,117,196,.25)', boxShadow: '0 -5px 24px rgba(27,4,39,.35)' }}>
            <button type="button" onClick={() => selectNav('Fã clube')} style={{ display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Fã clube' ? '#ff62b8' : 'rgba(255,255,255,.78)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="heart" size={23} />Fã clube</button>
            <button type="button" onClick={() => selectNav('Explorar')} style={{ display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Explorar' ? '#ff72c4' : 'rgba(255,255,255,.85)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="compass" size={29} />Explorar</button>
            <button type="button" aria-label="Criar publicação" onClick={() => setCreateOpen(true)} style={{ justifySelf: 'center', width: 48, height: 44, display: 'grid', placeItems: 'center', border: '1px solid rgba(255,186,225,.65)', borderRadius: 13, background: 'linear-gradient(145deg,#ff54b1,#f7258f 65%,#df1378)', color: '#fff', boxShadow: '0 0 14px rgba(255,56,160,.55),0 4px 12px rgba(0,0,0,.32)', cursor: 'pointer' }}><Icon name="plus" size={29} /></button>
            <button type="button" onClick={() => selectNav('Mensagens')} style={{ position: 'relative', display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Mensagens' ? '#ff62b8' : 'rgba(255,255,255,.78)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="message" size={23} /><span style={{ position: 'absolute', top: -3, left: 'calc(50% + 5px)', minWidth: 15, height: 15, display: 'grid', placeItems: 'center', borderRadius: 50, background: '#ff4aa8', color: '#fff', fontSize: 9, fontWeight: 900, boxShadow: '0 0 8px rgba(255,74,168,.55)' }}>2</span>Mensagens</button>
            <button type="button" onClick={() => selectNav('Perfil')} style={{ display: 'grid', justifyItems: 'center', gap: 3, border: 0, background: 'transparent', color: activeNav === 'Perfil' ? '#ff62b8' : 'rgba(255,255,255,.78)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}><Icon name="user" size={23} />Perfil</button>
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
