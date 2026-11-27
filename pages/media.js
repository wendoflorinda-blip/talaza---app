import { useEffect, useRef, useState } from 'react';
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
  const [discoveryLanguage, setDiscoveryLanguage] = useState('Français');
  const [discoveryLiked, setDiscoveryLiked] = useState(false);
  const [messagesTab, setMessagesTab] = useState('Notificações');
  const [communityFilter, setCommunityFilter] = useState('Sugestões');
  const [fanclubScreen, setFanclubScreen] = useState('overview');
  const [fanclubAccessMode, setFanclubAccessMode] = useState('request');
  const [hideFanCount, setHideFanCount] = useState(true);
  const [restrictMessages, setRestrictMessages] = useState(true);
  const [fanclubRequests, setFanclubRequests] = useState([{name:'Toni B.',handle:'@tonib',gradient:'linear-gradient(135deg,#ff9a35,#287d42)'},{name:'Dalva N.',handle:'@dalvan',gradient:'linear-gradient(135deg,#77c8ff,#2250b9)'},{name:'Kota Bantu',handle:'@kotabantu',gradient:'linear-gradient(135deg,#853bd8,#b45bff)'}]);
  const [fanclubFeedback, setFanclubFeedback] = useState('');
  const [approvedFanclubMembers, setApprovedFanclubMembers] = useState([]);
  const [ownerFanclubScreen, setOwnerFanclubScreen] = useState(null);
  const [createStep, setCreateStep] = useState(1);
  const [captureMode, setCaptureMode] = useState('Foto');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [captionText, setCaptionText] = useState('');
  const [hashtagText, setHashtagText] = useState('');
  const [publishedMedia, setPublishedMedia] = useState([]);
  const [explorePublishOpen, setExplorePublishOpen] = useState(false);
  const [explorePhotos, setExplorePhotos] = useState([]);
  const [exploreCaption, setExploreCaption] = useState('');
  const explorePhotoInputRef = useRef(null);

  const [profileEditing, setProfileEditing] = useState(false);
  const [profileName, setProfileName] = useState('Mara Kiala');
  const [profileUsername, setProfileUsername] = useState('marakiala');
  const [profileBio, setProfileBio] = useState('Bastidores, ensaios e música nova toda semana. Entre no meu fã clube.');
  const [profileLinks, setProfileLinks] = useState(['marakiala.com/links']);
  const [profileEmail, setProfileEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [profileCoverColor, setProfileCoverColor] = useState('#E84A8A');
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
  const profileAvatarInputRef = useRef(null);
  const coverColorInputRef = useRef(null);
  const coverPalette = ['#E84A8A','#FF2E7A','#FF5FA8','#FF8A3D','#FFD966','#D6E83D','#63C653','#19A875','#36C6C9','#45A5F5','#5C6DFF','#8A3DFF','#B44AFF','#D94AFF','#FF4A58','#914D36','#222222','#F2F2F2'];

  const [cameraFacing, setCameraFacing] = useState('environment');
  const galleryInputRef = useRef(null);
  const captureInputRef = useRef(null);


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
    if (item === 'Fã clube') { setNotice('Os conteúdos dos criadores que segue aparecerão aqui.'); setFanclubScreen('overview'); setFanclubFeedback(''); }
    if (item === 'Explorar') { setNotice(''); setExploreTab('Explorar'); return; }
    if (item === 'Mensagens') { setNotice(''); setMessagesTab('Notificações'); setCommunityFilter('Sugestões'); }
    if (item === 'Perfil') { setNotice(''); setProfileTab('Fotos'); return; }
  }

  if (loading) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050706', color: '#fff', fontFamily: 'system-ui' }}>A preparar a MÍDIA TALAZA…</main>;

  if (profileEditing) {
    return (
      <main style={{height:'100dvh',minHeight:540,width:'100%',background:'#fff',color:'#000',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",overflowY:'auto'}}>
        <style>{' * { box-sizing:border-box; } button { font:inherit; }'}</style>
        <div style={{maxWidth:520,margin:'0 auto',padding:'max(12px,env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <button type="button" onClick={()=>setProfileEditing(false)} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:22,display:'grid',placeItems:'center'}}>‹</button>
            <div style={{fontSize:28,fontWeight:900,color:'#000'}}>Editar perfil</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
            <button type="button" onClick={()=>profileAvatarInputRef.current?.click()} style={{width:110,height:110,flexShrink:0,border:0,borderRadius:24,background:'linear-gradient(180deg,#FF5FA8,#8A3DFF)',color:'#fff',fontSize:44,fontWeight:900,display:'grid',placeItems:'center',overflow:'hidden'}}>
              {profileAvatarPreview ? <img src={profileAvatarPreview} alt="Pré-visualização" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : 'MA'}
            </button>
            <input ref={profileAvatarInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=()=>setProfileAvatarPreview(String(reader.result||''));reader.readAsDataURL(file);}}}/>
            <button type="button" onClick={()=>profileAvatarInputRef.current?.click()} style={{height:60,flex:1,border:0,borderRadius:20,background:'#F2F2F2',color:'#000',fontSize:19,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>📷 Alterar foto</button>
          </div>
          <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Nome</label>
            <input value={profileName} onChange={e=>setProfileName(e.target.value)} style={{height:64,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#000',fontSize:20}}/>
          </div>
          <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Nome de utilizador</label>
            <div style={{height:64,borderRadius:20,background:'#F2F2F2',padding:'0 16px',display:'flex',alignItems:'center',gap:10}}>
              <input value={'@'+profileUsername.replace(/^@+/,'')} onChange={e=>setProfileUsername(e.target.value.replace(/^@+/,''))} style={{flex:1,minWidth:0,border:0,outline:0,background:'transparent',color:'#000',fontSize:20,fontWeight:900}}/>
              <span style={{color:'#FF2E7A',fontSize:19,fontWeight:900}}>Alterar</span>
            </div>
          </div>
          <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Descrição</label>
            <textarea value={profileBio} maxLength={150} onChange={e=>setProfileBio(e.target.value)} style={{height:150,resize:'vertical',border:0,borderRadius:20,padding:16,background:'#F2F2F2',color:'#000',fontSize:20,lineHeight:1.45}}/>
            <div style={{fontSize:17,color:'#888'}}>{profileBio.length}/150</div>
          </div>
          <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Links (máximo 2)</label>
            {profileLinks.map((link,i)=><div key={'profile-link-'+i} style={{display:'flex',gap:10,alignItems:'center'}}>
              <input value={link} onChange={e=>setProfileLinks(prev=>prev.map((v,j)=>j===i?e.target.value:v))} placeholder="Link" style={{height:64,flex:1,minWidth:0,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#000',fontSize:20}}/>
              <button type="button" aria-label="Apagar link" onClick={()=>setProfileLinks(prev=>prev.filter((_,j)=>j!==i))} style={{width:64,height:64,border:0,borderRadius:20,background:'#F2F2F2',color:'#000',fontSize:20}}>⌫</button>
            </div>)}
            {profileLinks.length<2&&<button type="button" onClick={()=>setProfileLinks(prev=>[...prev,''])} style={{height:64,border:0,borderRadius:20,background:'#F2F2F2',color:'#000',fontSize:20,fontWeight:900}}>＋ Adicionar link ({profileLinks.length}/2)</button>}
          </div>
          <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>E-mail</label>
            <input type="email" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} placeholder="seuemail@exemplo.com" style={{height:64,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#000',fontSize:20}}/>
            <div style={{height:90,borderRadius:20,background:'#F2F2F2',padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div><div style={{fontSize:20,fontWeight:900,color:'#000'}}>Mostrar no perfil</div><div style={{fontSize:17,color:'#888',marginTop:3}}>Quem visitar o perfil vê o e-mail.</div></div>
              <button type="button" aria-label="Mostrar e-mail" onClick={()=>setShowEmail(v=>!v)} style={{width:60,height:36,border:0,borderRadius:20,background:showEmail?'#FF2E7A':'#CCCCCC',padding:2,display:'flex',alignItems:'center',justifyContent:showEmail?'flex-end':'flex-start',flexShrink:0}}><span style={{width:32,height:32,borderRadius:50,background:'#fff'}}/></button>
            </div>
          </div>
          <div style={{display:'grid',gap:12,marginBottom:24}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Cor da capa</label>
            <div style={{height:110,borderRadius:20,background:profileCoverColor}}/>
            <div style={{display:'flex',alignItems:'center',gap:12}}><input type="color" ref={coverColorInputRef} value={profileCoverColor} onChange={e=>setProfileCoverColor(e.target.value)} style={{width:80,height:48,padding:0,border:'1px solid #aaa',background:'transparent'}}/><span style={{fontSize:18,color:'#666'}}>Toque para escolher qualquer cor</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:7}}>{coverPalette.map(color=><button key={color} type="button" aria-label={'Selecionar '+color} onClick={()=>setProfileCoverColor(color)} style={{aspectRatio:'1/1',border:profileCoverColor===color?'2px solid #222':'1px solid #ddd',borderRadius:8,background:color,padding:0}}/>)}</div>
          </div>
          <button type="button" onClick={async()=>{
            const cleanUsername=profileUsername.trim().replace(/^@+/,'');
            const cleanLinks=profileLinks.map(v=>v.trim()).filter(Boolean).slice(0,2);
            const {data,error}=await supabase.auth.updateUser({data:{media_display_name:profileName.trim(),media_username:cleanUsername,media_bio:profileBio,media_links:cleanLinks,media_email:profileEmail.trim(),media_email_visible:showEmail,media_cover_color:profileCoverColor}});
            if(error){setNotice('Não foi possível guardar as alterações. Tenta novamente.');return;}
            setUser(data.user||user);setProfileEditing(false);setNotice('Perfil atualizado.');
          }} style={{width:'100%',height:64,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:900,marginBottom:8}}>Guardar alterações</button>
          {profileAvatarPreview&&<div style={{fontSize:13,color:'#777',textAlign:'center'}}>A foto escolhida está apenas em pré-visualização nesta versão.</div>}
        </div>
      </main>
    );
  }

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
            {ownerFanclubScreen === 'menu' ? (
              <div style={{ position: 'absolute', inset: 0, background: '#fff', color: '#111', overflowY: 'auto', padding: 'max(14px,env(safe-area-inset-top)) 14px 24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <button type="button" onClick={() => { setOwnerFanclubScreen(null); setActiveNav('Perfil'); }} style={{ width: 46, height: 46, border: 0, borderRadius: 50, background: '#F2F2F2', color: '#111', display: 'grid', placeItems: 'center', fontSize: 24 }}>‹</button>
                  <div style={{ fontSize: 26, fontWeight: 950, color: '#111' }}>Meu fã clube</div>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button type="button" onClick={() => setOwnerFanclubScreen('sendPost')} style={{ width: '100%', padding: 16, border: '1px solid #E5E5E5', borderRadius: 20, background: '#fff', color: '#111', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 15, background: '#FFE5F0', color: '#FF2E7A', display: 'grid', placeItems: 'center' }}><Icon name="photo" size={24}/></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 950, color: '#111' }}>Enviar post</div>
                      <div style={{ fontSize: 13, color: '#777', marginTop: 5 }}>Publicar fotos, vídeo e descrição</div>
                    </div>
                    <span style={{ fontSize: 23, color: '#999' }}>›</span>
                  </button>
                  <button type="button" onClick={() => setOwnerFanclubScreen('myFanclub')} style={{ width: '100%', padding: 16, border: '1px solid #E5E5E5', borderRadius: 20, background: '#fff', color: '#111', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 15, background: '#FFE5F0', color: '#FF2E7A', display: 'grid', placeItems: 'center' }}><Icon name="heart" size={24}/></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 950, color: '#111' }}>Ver meu fã clube</div>
                      <div style={{ fontSize: 13, color: '#777', marginTop: 5 }}>Posts, reações, comentários e enquetes</div>
                    </div>
                    <span style={{ fontSize: 23, color: '#999' }}>›</span>
                  </button>
                  <button type="button" onClick={() => setOwnerFanclubScreen('createPoll')} style={{ width: '100%', padding: 16, border: '1px solid #E5E5E5', borderRadius: 20, background: '#fff', color: '#111', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 15, background: '#FFE5F0', color: '#FF2E7A', display: 'grid', placeItems: 'center' }}><Icon name="sparkle" size={24}/></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 950, color: '#111' }}>Fazer enquete</div>
                      <div style={{ fontSize: 13, color: '#777', marginTop: 5 }}>Criar uma votação para os meus fãs</div>
                    </div>
                    <span style={{ fontSize: 23, color: '#999' }}>›</span>
                  </button>
                </div>
              </div>
            ) : activeNav === 'Perfil' ? (
              <div style={{ position: 'absolute', inset: 0, background: '#ffffff', overflowY: 'auto', padding: 'max(12px,env(safe-area-inset-top)) 14px calc(88px + env(safe-area-inset-bottom))', color: '#fff', textAlign: 'left' }}>
                <div style={{ position: 'relative', height: 156, borderRadius: 19, background: metadata.media_cover_color || 'linear-gradient(115deg,#c9f33a 0%,#68bb38 45%,#11643b 100%)', marginBottom: 64, overflow: 'visible' }}>
                  <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 9 }}>
                    <button aria-label="Adicionar pessoa" type="button" onClick={() => setNotice('Convidar pessoas para o perfil.')} style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid rgba(0,0,0,.25)', background: 'rgba(20,30,24,.65)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="people" size={18}/></button>
                    <button aria-label="Configurações do perfil" type="button" onClick={() => setNotice('Configurações de aparência do perfil.')} style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid rgba(0,0,0,.25)', background: 'rgba(20,30,24,.65)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="sparkle" size={18}/></button>
                  </div>
                  <div style={{ position: 'absolute', left: 14, bottom: -51, width: 104, height: 104, borderRadius: 22, padding: 3, background: 'linear-gradient(135deg,#ff4da9,#a83bfa)', boxShadow: '0 0 17px rgba(229,61,202,.3)' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 19, background: 'linear-gradient(140deg,#ff74bb,#8d42e7)', display: 'grid', placeItems: 'center', fontSize: 29, fontWeight: 950, letterSpacing: 1 }}>MK</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6, padding: 0, borderRadius: 0, background: 'transparent', border: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -.4, color: '#111111' }}>{metadata.media_display_name || 'Mara Kiala'}</div>
                  <div style={{ fontSize: 12, color: '#555555' }}>@{metadata.media_username || 'marakiala'} · fala Português</div>
                  <div style={{ fontSize: 12, color: '#555555', display: 'flex', alignItems: 'center', gap: 5 }}>⌖ Luanda, Angola</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 5, color: '#111111' }}>{metadata.media_bio || 'Bastidores, ensaios e música nova toda semana. Entre no meu fã clube.'}</div>
                  <button type="button" onClick={() => { setProfileEditing(true); setProfileName(metadata.media_display_name || 'Mara Kiala'); setProfileUsername(metadata.media_username || 'marakiala'); setProfileBio(metadata.media_bio || 'Bastidores, ensaios e música nova toda semana. Entre no meu fã clube.'); setProfileLinks(metadata.media_links || ['marakiala.com/links']); setProfileEmail(metadata.media_email || user?.email || ''); setShowEmail(!!metadata.media_email_visible); setProfileCoverColor(metadata.media_cover_color || '#E84A8A'); setProfileAvatarPreview(''); }} style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(0,0,0,.06)', background: 'rgba(255,255,255,.5)', color: '#1674c4', fontSize: 12, fontWeight: 800, textAlign: 'left' }}><Icon name="link" size={16}/> {(metadata.media_links && metadata.media_links[0]) || 'marakiala.com/links'} <span style={{ marginLeft: 'auto', color: '#555555' }}><Icon name="edit" size={15}/></span></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 19, marginBottom: 18, textAlign: 'center' }}>
                  {[['18,4 mil','seguidores'],['312','seguindo'],['2.310','no fã clube']].map(([count,label]) => <div key={label}><div style={{ fontSize: 17, fontWeight: 950, color: '#111111' }}>{count}</div><div style={{ color: '#666666', fontSize: 11, marginTop: 3 }}>{label}</div></div>)}
                </div>
                <div style={{ display: 'grid', gap: 9, marginBottom: 19 }}>
                  <button type="button" onClick={() => { setExplorePublishOpen(true); setExplorePhotos([]); setExploreCaption(''); }} style={{ width: '100%', border: 0, borderRadius: 13, padding: 13, background: '#f4df83', color: '#241b10', fontSize: 13, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}><Icon name="globe" size={18}/>Publicar no explore</button>
                  <button type="button" onClick={() => setNotice('Planos do fã clube.')} style={{ width: '100%', border: 0, borderRadius: 13, padding: 13, background: '#ff3fa3', color: '#fff', fontSize: 13, fontWeight: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}><Icon name="sparkle" size={18}/>Ver planos</button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    <button type="button" onClick={() => selectNav('Mensagens')} style={{ border: '1px solid #4a2a5c', borderRadius: 12, padding: 11, background: '#2b103b', color: '#fff', fontSize: 12, fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="message" size={16}/>Mensagens</button>
                    <button type="button" onClick={() => { setProfileEditing(true); setProfileName(user?.user_metadata?.media_display_name || 'Mara Kiala'); setProfileUsername(user?.user_metadata?.media_username || 'marakiala'); setProfileBio(user?.user_metadata?.media_bio || 'Bastidores, ensaios e música nova toda semana. Entre no meu fã clube.'); setProfileLinks(user?.user_metadata?.media_links || ['marakiala.com/links']); setProfileEmail(user?.user_metadata?.media_email || user?.email || ''); setShowEmail(!!user?.user_metadata?.media_email_visible); setProfileCoverColor(user?.user_metadata?.media_cover_color || '#E84A8A'); setProfileAvatarPreview(''); }} style={{ border: '1px solid #4a2a5c', borderRadius: 12, padding: 11, background: '#2b103b', color: '#fff', fontSize: 12, fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="edit" size={16}/>Editar perfil</button>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 950, marginBottom: 10, color: '#111' }}>Gerir o meu fã clube</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <button type="button" onClick={() => setOwnerFanclubScreen('menu')} style={{ padding: 12, border: '1px solid #E5E5E5', borderRadius: 15, background: '#fff', textAlign: 'left', color: '#111' }}>
                    <div style={{ width: 37, height: 37, borderRadius: 11, background: '#FFE5F0', color: '#FF2E7A', display: 'grid', placeItems: 'center', marginBottom: 9 }}><Icon name="people" size={20}/></div>
                    <div style={{ fontSize: 12, fontWeight: 950, color: '#111' }}>Meu fã clube</div><div style={{ fontSize: 10, color: '#777', lineHeight: 1.5, marginTop: 4 }}>Publicar, lives e enquetes</div>
                  </button>
                  <button type="button" onClick={() => { setOwnerFanclubScreen(null); setFanclubScreen('settings'); setActiveNav('Fã clube'); }} style={{ padding: 12, border: '1px solid #E5E5E5', borderRadius: 15, background: '#fff', textAlign: 'left', color: '#111' }}>
                    <div style={{ width: 37, height: 37, borderRadius: 11, background: '#FFE5F0', color: '#FF2E7A', display: 'grid', placeItems: 'center', marginBottom: 9 }}><Icon name="sparkle" size={20}/></div>
                    <div style={{ fontSize: 12, fontWeight: 950, color: '#111' }}>Configurar fã clube</div><div style={{ fontSize: 10, color: '#777', lineHeight: 1.5, marginTop: 4 }}>Como os fãs interagem</div>
                  </button>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #45245b', marginBottom: 10 }}>
                  {['Fotos','Vídeos'].map(tab => <button key={tab} type="button" onClick={() => setProfileTab(tab)} style={{ flex: 1, padding: '11px 8px', border: 0, borderBottom: profileTab === tab ? '2px solid #ff4fa9' : '2px solid transparent', background: 'transparent', color: profileTab === tab ? '#fff' : '#b9a8c8', fontSize: 12, fontWeight: 900 }}>{tab}</button>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                  {publishedMedia.map(pub=><div key={'profilepub-'+pub.id} style={{aspectRatio:'1/1',borderRadius:9,overflow:'hidden',background:'#eee'}}>{pub.type==='video'?<video src={pub.url} muted playsInline style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<img src={pub.url} alt={pub.caption||'Publicação'} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>)}
                  {['linear-gradient(145deg,#ff68ad,#8a36ce)','linear-gradient(145deg,#ffab43,#d83f56)','linear-gradient(145deg,#44d6a0,#1a8465)','linear-gradient(145deg,#53a8ff,#4545bb)','linear-gradient(145deg,#b879ff,#6434ae)','linear-gradient(145deg,#ff586c,#9e315c)','linear-gradient(145deg,#d9e73f,#569e39)','linear-gradient(145deg,#37d5e4,#356aa8)','linear-gradient(145deg,#ed81d0,#6b42c8)'].map((gradient,i) => <div key={'tile-'+profileTab+'-'+i} style={{ aspectRatio: '1/1', borderRadius: 9, background: gradient, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>{i%3===1 && <Icon name="lock" size={21}/>}</div>)}
                </div>
              </div>
            ) : activeNav === 'Explorar' ? (

              <div style={{ position: 'absolute', inset: 0, background: '#ffffff', overflowY: 'auto', padding: 'max(62px, env(safe-area-inset-top)) 12px calc(90px + env(safe-area-inset-bottom))', textAlign: 'left', color: '#fff' }}>
                {exploreTab === 'Explorar' && <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', gap: 8, padding: '9px 0 13px', background: '#ffffff', opacity: 1, boxShadow: '0 5px 12px rgba(0,0,0,.12)' }}>
                  <button type="button" onClick={() => setExploreTab('Explorar')} style={{ padding: '9px 17px', border: 0, borderRadius: 22, background: exploreTab === 'Explorar' ? '#fff' : '#2b103b', color: exploreTab === 'Explorar' ? '#19121d' : '#d3c6dc', fontSize: 13, fontWeight: 900 }}>Explorar</button>
                  <button type="button" onClick={() => setExploreTab('Descoberta')} style={{ padding: '9px 17px', border: 0, borderRadius: 22, background: exploreTab === 'Descoberta' ? '#fff' : '#2b103b', color: exploreTab === 'Descoberta' ? '#19121d' : '#d3c6dc', fontSize: 13, fontWeight: 900 }}>Descoberta</button>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button aria-label="Mensagens" type="button" onClick={() => selectNav('Mensagens')} style={{ width: 37, height: 37, borderRadius: 50, border: '1px solid #4b2a5c', background: '#2b103b', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="message" size={19}/></button>
                    <button aria-label="Notificações" type="button" onClick={() => setNotice('As notificações serão mostradas aqui.')} style={{ position: 'relative', width: 37, height: 37, borderRadius: 50, border: '1px solid #4b2a5c', background: '#2b103b', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="bell" size={19}/><span style={{ position: 'absolute', right: -2, top: -2, width: 9, height: 9, borderRadius: 50, background: '#ff4fa9', boxShadow: '0 0 8px #ff4fa9' }}/></button>
                  </div>
                </div>}
                {exploreTab === 'Explorar' ? (
                  <div style={{ display: 'grid', gap: 18 }}>
                    {publishedMedia.map(pub=><article key={'feedpub-'+pub.id} style={{padding:12,borderRadius:16,background:'#2b103b',border:'1px solid #45245b',display:'grid',gap:10}}><div style={{fontSize:13,fontWeight:900,color:'#fff'}}>Mara Kiala · agora</div>{pub.caption&&<div style={{fontSize:12,lineHeight:1.55,color:'#fff'}}>{pub.caption}</div>}{pub.tags&&<div style={{fontSize:12,color:'#f08ac5'}}>{pub.tags}</div>}<div style={{aspectRatio:'1/1',width:'100%',borderRadius:12,overflow:'hidden',background:'#fff',display:'grid',placeItems:'center'}}>{pub.type==='video'?<video src={pub.url} controls playsInline style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<img src={pub.url} alt={pub.caption||'Publicação'} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}</div><div style={{display:'flex',justifyContent:'space-around',color:'#c5b4d1',fontSize:11}}><span>♡ Gosto</span><span>Comentar</span><span>Partilhar</span></div></article>)}
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
                      <div style={{ aspectRatio: '1/1', width: '100%', borderRadius: 12, background: 'linear-gradient(135deg,#3c2d8d 0%,#7743a7 40%,#20285b 100%)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
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
                          {name:'Yuri Estúdio',detail:'640 membros · English',color:'linear-gradient(135deg,#2368d6,#543b9e)',button:'Aderir'},
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
                    <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                      {['Mais conteúdos da Ana Bela','Novo vídeo · Luanda','Momentos da comunidade'].map((label,i) => <article key={label} style={{ padding: 12, borderRadius: 16, background: '#2b103b', border: '1px solid #45245b', display: 'grid', gap: 9 }}>
                        <div style={{ fontSize: 12, fontWeight: 900 }}>{label}</div>
                        <div style={{ aspectRatio: '1/1', width: '100%', borderRadius: 12, background: ['linear-gradient(135deg,#5730a2,#1d4e82)','linear-gradient(135deg,#e95f9f,#9c3d6f)','linear-gradient(135deg,#44b89c,#275a9c)'][i], display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 20%,rgba(255,255,255,.25),transparent 38%)' }}/>
                          <div style={{ zIndex: 1, fontSize: 13, fontWeight: 950 }}>TALAZA · EXPLORE</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', color: '#c5b4d1', fontSize: 11 }}>
                          <button type="button" onClick={() => setPostLiked(v => !v)} style={{ border: 0, background: 'transparent', color: postLiked ? '#ff64b5' : '#c5b4d1' }}>♡ Gosto</button>
                          <button type="button" onClick={() => setNotice('Comentários desta publicação.')} style={{ border: 0, background: 'transparent', color: '#c5b4d1' }}>Comentar</button>
                          <button type="button" onClick={() => setNotice('Partilhar esta publicação.')} style={{ border: 0, background: 'transparent', color: '#c5b4d1' }}>Partilhar</button>
                        </div>
                      </article>)}
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', overflow: 'hidden', background: 'linear-gradient(150deg,#c9f33a 0%,#5eb73c 38%,#155d3c 100%)', textAlign: 'left' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 15%,rgba(222,255,118,.4),transparent 40%),linear-gradient(180deg,rgba(8,22,13,.38) 0%,transparent 30%,rgba(5,18,11,.35) 55%,rgba(3,14,9,.8) 100%)' }} />
                    <div style={{ position: 'absolute', zIndex: 2, top: 'max(14px,env(safe-area-inset-top))', left: 12, right: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 24, background: 'rgba(25,17,38,.72)', backdropFilter: 'blur(12px)' }}>
                          <button type="button" onClick={() => setExploreTab('Explorar')} style={{ border: 0, borderRadius: 20, padding: '8px 13px', background: 'transparent', color: 'rgba(255,255,255,.72)', fontSize: 12, fontWeight: 850 }}>Explorar</button>
                          <button type="button" onClick={() => setExploreTab('Descoberta')} style={{ border: 0, borderRadius: 20, padding: '8px 13px', background: '#fff', color: '#15121b', fontSize: 12, fontWeight: 950 }}>Descoberta</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button aria-label="Mensagens" type="button" onClick={() => setNotice('Mensagens da Mídia Talaza.')} style={{ width: 36, height: 36, position: 'relative', border: '1px solid rgba(255,255,255,.18)', borderRadius: 50, background: 'rgba(30,15,43,.7)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="message" size={17}/><span style={{ position: 'absolute', top: 3, right: 2, width: 8, height: 8, borderRadius: 50, background: '#ff4aa8' }}/></button>
                          <button aria-label="Notificações" type="button" onClick={() => setNotice('Notificações da Mídia Talaza.')} style={{ width: 36, height: 36, position: 'relative', border: '1px solid rgba(255,255,255,.18)', borderRadius: 50, background: 'rgba(30,15,43,.7)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="bell" size={17}/><span style={{ position: 'absolute', top: 3, right: 2, width: 8, height: 8, borderRadius: 50, background: '#ff4aa8' }}/></button>
                        </div>
                      </div>
                      <div className="media-tabs" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginTop: 10, paddingBottom: 2 }}>
                        {['Todos','Português','English','Français','Español','Kiswahili'].map(lang => <button key={lang} type="button" onClick={() => setDiscoveryLanguage(lang)} style={{ flexShrink: 0, border: discoveryLanguage === lang ? '1px solid #ff55aa' : '1px solid rgba(255,255,255,.24)', borderRadius: 20, padding: '7px 12px', background: discoveryLanguage === lang ? '#ff3fa3' : 'rgba(30,15,43,.58)', color: '#fff', fontSize: 11, fontWeight: 850 }}>{lang}</button>)}
                      </div>
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: .25, pointerEvents: 'none' }}>
                      <div style={{ width: 180, height: 180, borderRadius: 90, border: '2px solid rgba(255,255,255,.55)', background: 'radial-gradient(circle at 35% 25%,rgba(255,255,255,.5),transparent 42%),linear-gradient(135deg,#a5e83b,#12653f)', boxShadow: '0 0 60px rgba(226,255,128,.35)' }} />
                    </div>
                    <div style={{ position: 'absolute', zIndex: 2, right: 12, bottom: 190, display: 'grid', justifyItems: 'center', gap: 13 }}>
                      <div style={{ position: 'relative', marginBottom: 4 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 50, border: '2px solid #fff', background: 'linear-gradient(135deg,#55aaff,#3546aa)', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 950 }}>LM</div>
                        <button type="button" aria-label="Seguir Lucie" onClick={() => setFollowed(v => ({...v, luciem: !v.luciem}))} style={{ position: 'absolute', bottom: -4, right: -4, width: 19, height: 19, borderRadius: 50, border: 0, background: '#ff3fa3', color: '#fff', fontSize: 13, fontWeight: 950, display: 'grid', placeItems: 'center' }}>{followed.luciem ? '✓' : '+'}</button>
                      </div>
                      <button type="button" onClick={() => setDiscoveryLiked(v => !v)} style={{ border: 0, background: 'transparent', color: discoveryLiked ? '#ff5cab' : '#fff', display: 'grid', justifyItems: 'center', gap: 3, textShadow: '0 2px 8px rgba(0,0,0,.4)' }}><Icon name="heart" size={28}/><span style={{ fontSize: 11, fontWeight: 850 }}>15 mil</span></button>
                      <button type="button" onClick={() => setNotice('Comentários do vídeo de Lucie.')} style={{ border: 0, background: 'transparent', color: '#fff', display: 'grid', justifyItems: 'center', gap: 3, textShadow: '0 2px 8px rgba(0,0,0,.4)' }}><Icon name="comment" size={27}/><span style={{ fontSize: 11, fontWeight: 850 }}>530</span></button>
                      <button type="button" onClick={() => setNotice('Partilhar vídeo de Lucie.')} style={{ border: 0, background: 'transparent', color: '#fff', display: 'grid', justifyItems: 'center', gap: 3, textShadow: '0 2px 8px rgba(0,0,0,.4)' }}><Icon name="share" size={27}/><span style={{ fontSize: 11, fontWeight: 850 }}>Enviar</span></button>
                    </div>
                    <div style={{ position: 'absolute', zIndex: 2, left: 13, right: 78, bottom: 'calc(94px + env(safe-area-inset-bottom))', display: 'grid', gap: 9, textShadow: '0 2px 7px rgba(0,0,0,.45)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 17, fontWeight: 950 }}>@luciem</div>
                        <span style={{ padding: '5px 9px', borderRadius: 18, background: 'rgba(14,70,42,.85)', fontSize: 10, fontWeight: 850 }}>Français</span>
                        <button type="button" onClick={() => setFollowed(v => ({...v, luciem: !v.luciem}))} style={{ border: '1px solid #fff', borderRadius: 18, padding: '5px 12px', background: '#fff', color: '#17121b', fontSize: 11, fontWeight: 900, textShadow: 'none' }}>{followed.luciem ? 'Seguindo' : 'Seguir'}</button>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 650, lineHeight: 1.45 }}>Chorégraphie du week-end, essayez avec moi</div>
                      <button type="button" onClick={() => setNotice('Planos e benefícios do fã clube de Lucie.')} style={{ width: 'fit-content', border: 0, borderRadius: 14, padding: '12px 17px', background: '#f4df83', color: '#241b10', fontSize: 12, fontWeight: 950, display: 'flex', alignItems: 'center', gap: 8, textShadow: 'none' }}><Icon name="sparkle" size={17}/>Entrar no fã clube</button>
                    </div>
                  </div>
                )}
              </div>
            ) : activeNav === 'Fã clube' ? (
              <div style={{ position:'absolute', inset:0, background:'#ffffff', overflowY:'auto', padding:'max(14px,env(safe-area-inset-top)) 14px calc(92px + env(safe-area-inset-bottom))', textAlign:'left', color:'#111' }}>
                {fanclubScreen === 'settings' ? (
                  <div style={{maxWidth:520,margin:'0 auto',paddingTop:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
                      <button type="button" aria-label="Voltar" onClick={()=>{setFanclubScreen('overview');setFanclubFeedback('');}} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:22,display:'grid',placeItems:'center'}}>‹</button>
                      <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Configurar fã clube</div>
                    </div>
                    <div style={{display:'grid',gap:22}}>
                      <div>
                        <div style={{fontSize:17,fontWeight:900,color:'#666',marginBottom:10}}>Como as pessoas entram no seu fã clube</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                          {[
                            {value:'automatic',title:'Automática',description:'Quem quiser entra na hora.'},
                            {value:'request',title:'Com pedido',description:'Você aprova cada pessoa.'}
                          ].map(option=><button key={option.value} type="button" onClick={()=>setFanclubAccessMode(option.value)} style={{height:130,padding:16,borderRadius:20,border:fanclubAccessMode===option.value?'3px solid #FF2E7A':'3px solid transparent',background:'#F2F2F2',textAlign:'left',display:'flex',flexDirection:'column',justifyContent:'center',gap:8}}>
                            <div style={{fontSize:20,fontWeight:950,color:'#000'}}>{option.title}</div><div style={{fontSize:15,color:'#666',lineHeight:1.4}}>{option.description}</div>
                          </button>)}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:17,fontWeight:900,color:'#666',marginBottom:10}}>Vitrine</div>
                        <div style={{padding:18,borderRadius:20,background:'#F2F2F2',display:'flex',alignItems:'center',gap:12}}>
                          <div style={{flex:1,minWidth:0}}><div style={{fontSize:20,fontWeight:950,color:'#000'}}>Ocultar número de fãs</div><div style={{fontSize:15,color:'#666',lineHeight:1.45,marginTop:8}}>No perfil, em vez do número aparece só um ícone mostrando que você tem fã clube.</div></div>
                          <button type="button" aria-label="Alternar ocultar número de fãs" onClick={()=>setHideFanCount(v=>!v)} style={{width:56,height:32,flexShrink:0,border:0,borderRadius:20,background:hideFanCount?'#FF2E7A':'#D9D9D9',padding:2,display:'flex',alignItems:'center',justifyContent:hideFanCount?'flex-end':'flex-start'}}><span style={{width:28,height:28,borderRadius:50,background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/></button>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,fontSize:16,color:'#888'}}><span>Pré-visualização:</span><span style={{fontSize:20,fontWeight:950,color:'#000'}}>2.310</span><span>fã clube</span></div>
                      </div>
                      <div>
                        <div style={{fontSize:17,fontWeight:900,color:'#666',marginBottom:10}}>Mensagens</div>
                        <div style={{padding:18,borderRadius:20,background:'#F2F2F2',display:'flex',alignItems:'center',gap:12}}>
                          <div style={{flex:1,minWidth:0}}><div style={{fontSize:20,fontWeight:950,color:'#000'}}>Restringir envio de mensagens</div><div style={{fontSize:15,color:'#666',lineHeight:1.45,marginTop:8}}>Os fãs só poderão comentar, reagir e votar.</div></div>
                          <button type="button" aria-label="Alternar restrição de mensagens" onClick={()=>setRestrictMessages(v=>!v)} style={{width:56,height:32,flexShrink:0,border:0,borderRadius:20,background:restrictMessages?'#FF2E7A':'#D9D9D9',padding:2,display:'flex',alignItems:'center',justifyContent:restrictMessages?'flex-end':'flex-start'}}><span style={{width:28,height:28,borderRadius:50,background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/></button>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:17,fontWeight:900,color:'#666',marginBottom:10}}>Pedidos</div>
                        <button type="button" aria-label={'Pedidos de adesão: '+fanclubRequests.length+' pendentes, '+approvedFanclubMembers.length+' aprovados nesta sessão'} onClick={()=>setFanclubScreen('requests')} style={{width:'100%',padding:18,border:0,borderRadius:20,background:'#F2F2F2',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}>
                          <div style={{flex:1,minWidth:0}}><div style={{fontSize:20,fontWeight:950,color:'#000'}}>Pedidos de adesão</div><div style={{fontSize:15,color:'#666',lineHeight:1.45,marginTop:8}}>Ver, aprovar ou rejeitar quem quer entrar.</div></div>
                          <span style={{width:56,height:48,borderRadius:14,background:'#FF2E7A',color:'#fff',fontSize:20,fontWeight:950,display:'grid',placeItems:'center',flexShrink:0}}>{fanclubRequests.length}</span><span style={{fontSize:24,color:'#000'}}>›</span>
                        </button>
                      </div>
                    </div>
                    {fanclubFeedback && <div role="status" style={{marginTop:18,padding:12,borderRadius:14,background:'#fce8f2',color:'#8a164e',fontSize:14,fontWeight:800}}>{fanclubFeedback}</div>}
                  </div>
                ) : fanclubScreen === 'requests' ? (
                  <div style={{maxWidth:520,margin:'0 auto',paddingTop:4}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
                      <button type="button" aria-label="Voltar" onClick={()=>{setFanclubScreen('settings');setFanclubFeedback('');}} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:22,display:'grid',placeItems:'center'}}>‹</button>
                      <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Pedidos de adesão</div>
                    </div>
                    <div style={{display:'grid',gap:24}}>
                      {fanclubRequests.map(person=><div key={person.handle} style={{display:'flex',alignItems:'center',gap:10,minHeight:56}}>
                        <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:person.gradient}}/>
                        <div style={{flex:1,minWidth:0}}><div style={{fontSize:18,fontWeight:950,color:'#000'}}>{person.name}</div><div style={{fontSize:16,color:'#888',marginTop:3}}>{person.handle}</div></div>
                        <div style={{display:'flex',gap:8,flexShrink:0}}>
                          <button type="button" onClick={()=>{setFanclubRequests(prev=>prev.filter(p=>p.handle!==person.handle));setFanclubFeedback(person.name+': pedido rejeitado.');}} style={{height:44,border:0,borderRadius:20,padding:'0 12px',background:'#F2F2F2',color:'#666',fontSize:16,fontWeight:900}}>Rejeitar</button>
                          <button type="button" onClick={()=>{setFanclubRequests(prev=>prev.filter(p=>p.handle!==person.handle));setApprovedFanclubMembers(prev=>prev.includes(person.handle)?prev:[...prev,person.handle]);setFanclubFeedback(person.name+' entrou no teu fã clube.');}} style={{height:44,border:0,borderRadius:20,padding:'0 12px',background:'#FF2E7A',color:'#fff',fontSize:16,fontWeight:900}}>Aprovar</button>
                        </div>
                      </div>)}
                      {fanclubRequests.length===0 && <div style={{padding:20,textAlign:'center',color:'#666',background:'#F2F2F2',borderRadius:18}}>Não há pedidos pendentes.</div>}
                    </div>
                    {fanclubFeedback && <div role="status" style={{marginTop:18,padding:12,borderRadius:14,background:'#fce8f2',color:'#8a164e',fontSize:14,fontWeight:800}}>{fanclubFeedback}</div>}
                  </div>
                ) : (
                <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>

                  <div style={{ fontSize:28, fontWeight:950, letterSpacing:-.5 }}><span style={{color:'#000'}}>fã</span><span style={{color:'#FF2E7A'}}>.</span><span style={{color:'#000'}}>clube</span></div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={() => setNotice('Mensagens do fã clube.')} style={{width:44,height:44,borderRadius:50,border:0,background:'#F2F2F2',color:'#000',position:'relative',display:'grid',placeItems:'center'}}><Icon name="message" size={22}/><span style={{position:'absolute',right:2,top:2,width:8,height:8,borderRadius:50,background:'#FF2E7A'}}/></button>
                    <button type="button" onClick={() => setNotice('Notificações do fã clube.')} style={{width:44,height:44,borderRadius:50,border:0,background:'#F2F2F2',color:'#000',position:'relative',display:'grid',placeItems:'center'}}><Icon name="bell" size={22}/><span style={{position:'absolute',right:2,top:2,width:8,height:8,borderRadius:50,background:'#FF2E7A'}}/></button>
                  </div>
                </div>
                <div style={{ borderRadius:24, padding:20, background:'linear-gradient(135deg,#FF5FA8 0%,#E94EC8 50%,#7A3DFF 100%)', color:'#fff', marginBottom:22, boxShadow:'0 7px 18px rgba(130,45,180,.18)' }}>
                  <div style={{fontSize:26,fontWeight:950,marginBottom:8}}>Quer ter um fã clube?</div>
                  <div style={{fontSize:15,lineHeight:1.5,marginBottom:16}}>Crie o seu espaço, defina os planos e receba apoio direto dos seus fãs.</div>
                  <button type="button" onClick={() => setNotice('Criar o meu fã clube.')} style={{background:'#fff',color:'#000',border:0,borderRadius:24,padding:'12px 18px',fontSize:16,fontWeight:950}}>Criar o meu fã clube</button>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:11}}><div style={{fontSize:19,fontWeight:950,color:'#000'}}>Fã-clubes de que faz parte</div><div style={{fontSize:16,color:'#888'}}>2</div></div>
                <div style={{display:'grid',gap:12,marginBottom:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:20,background:'#2A1745',color:'#fff',minHeight:80}}>
                    <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:'linear-gradient(135deg,#873bce,#4a1d8b)'}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:17,fontWeight:950}}>Dj Nelito <span style={{color:'#46aaff',fontSize:12}}>✓</span> <span style={{color:'#f3c449'}}>♛</span></div><div style={{fontSize:12,color:'#b7a6c6',marginTop:4}}>890 fã clube</div></div>
                    <button type="button" onClick={() => setNotice('Abrir fã clube Dj Nelito')} style={{border:0,borderRadius:22,padding:'9px 11px',background:'#1c0a29',color:'#fff',fontSize:11,fontWeight:900}}>Abrir <span style={{marginLeft:5,color:'#FF2E7A'}}>● 3</span></button>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:20,background:'#2A1745',color:'#fff',minHeight:80}}>
                    <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:'linear-gradient(135deg,#28ad70,#126345)'}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:17,fontWeight:950}}>Ana Bela <span style={{color:'#46aaff',fontSize:12}}>✓</span></div><div style={{fontSize:12,color:'#b7a6c6',marginTop:4}}>1.240 fã clube <span style={{color:'#f3c449'}}>◆</span></div></div>
                    <button type="button" onClick={() => setNotice('Abrir fã clube Ana Bela')} style={{border:0,borderRadius:22,padding:'9px 11px',background:'#1c0a29',color:'#fff',fontSize:11,fontWeight:900}}>Abrir <span style={{marginLeft:5,color:'#FF2E7A'}}>● 1</span></button>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:11}}><div style={{fontSize:19,fontWeight:950,color:'#000'}}>Fã-clubes para aderir</div><div style={{fontSize:12,color:'#888'}}>sugestões</div></div>
                <div style={{display:'grid',gap:12,marginBottom:18}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:20,background:'#2A1745',color:'#fff'}}>
                    <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:'linear-gradient(135deg,#ff8a25,#d94b17)'}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:950}}>Yuri Estúdio <span style={{color:'#46aaff',fontSize:12}}>✓</span> <span style={{color:'#f3c449'}}>♛</span></div><div style={{fontSize:12,color:'#b7a6c6',marginTop:4}}>640 fã clube</div></div>
                    <button type="button" onClick={() => setNotice('Aderir ao fã clube Yuri Estúdio')} style={{border:0,borderRadius:22,padding:'9px 13px',background:'#FF2E7A',color:'#fff',fontSize:12,fontWeight:950}}>Aderir</button>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:20,background:'#2A1745',color:'#fff'}}>
                    <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:'linear-gradient(135deg,#4ca5ff,#2348b5)'}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:950}}>Lucie M. <span style={{color:'#46aaff',fontSize:12}}>✓</span></div><div style={{fontSize:12,color:'#b7a6c6',marginTop:4}}>1,5 mil fã clube · com pedido</div></div>
                    <button type="button" onClick={() => setNotice('Aderir ao fã clube Lucie M.')} style={{border:0,borderRadius:22,padding:'9px 13px',background:'#FF2E7A',color:'#fff',fontSize:12,fontWeight:950}}>Aderir</button>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:20,background:'#2A1745',color:'#fff'}}>
                    <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:'linear-gradient(135deg,#ff59b4,#a73bce)'}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:950}}>Kota Creator <span style={{color:'#46aaff',fontSize:12}}>✓</span></div><div style={{fontSize:12,color:'#b7a6c6',marginTop:4}}>980 fã clube</div></div>
                    <button type="button" onClick={() => setNotice('Aderir ao fã clube Kota Creator')} style={{border:0,borderRadius:22,padding:'9px 13px',background:'#FF2E7A',color:'#fff',fontSize:12,fontWeight:950}}>Aderir</button>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:12,borderRadius:20,background:'#2A1745',color:'#fff'}}>
                    <div style={{width:56,height:56,flex:'0 0 56px',borderRadius:50,background:'linear-gradient(135deg,#44bd90,#21735b)'}}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:950}}>Zuri Studio <span style={{color:'#46aaff',fontSize:12}}>✓</span></div><div style={{fontSize:12,color:'#b7a6c6',marginTop:4}}>2,2 mil fã clube</div></div>
                    <button type="button" onClick={() => setNotice('Aderir ao fã clube Zuri Studio')} style={{border:0,borderRadius:22,padding:'9px 13px',background:'#FF2E7A',color:'#fff',fontSize:12,fontWeight:950}}>Aderir</button>
                  </div>
                </div>
                <div style={{fontSize:12,color:'#777',textAlign:'center',padding:10}}>Os fãs não pagam. Os fã clubes permanecem abertos.</div>
                </>
                )}
              </div>
            ) : activeNav === 'Mensagens' ? (
              <div style={{ position:'absolute', inset:0, background:'#FFFFFF', overflowY:'auto', padding:'max(14px,env(safe-area-inset-top)) 16px calc(92px + env(safe-area-inset-bottom))', textAlign:'left', color:'#000' }}>
                <div style={{ position:'sticky', top:0, zIndex:10, background:'#FFFFFF', paddingTop:5, boxShadow:'0 4px 10px rgba(0,0,0,.05)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', alignItems:'end', borderBottom:'1px solid #eeeeee' }}>
                    {['Notificações','Mensagens','Comunidade'].map(tab => <button key={tab} type="button" onClick={() => setMessagesTab(tab)} style={{ border:0, background:'transparent', color:messagesTab===tab?'#000':'#888', fontSize:20, fontWeight:messagesTab===tab?900:500, padding:'13px 2px 12px', position:'relative', whiteSpace:'nowrap' }}>{tab}{messagesTab===tab && <span style={{ position:'absolute', left:0,right:0,bottom:0,height:4,borderRadius:4,background:'#FF2E7A' }}/>}</button>)}
                  </div>
                </div>
                {messagesTab === 'Notificações' && (
                  <div style={{ display:'grid', gap:20, paddingTop:18 }}>
                    {[
                      {text:'Lucie M. começou a seguir você', gradient:'linear-gradient(135deg,#8d40d8,#ff5aab)',action:'Seguir de volta'},
                      {text:'Dj Nelito publicou no clube',gradient:'linear-gradient(135deg,#3487ff,#35d89a)',time:'1 h'},
                      {text:'Yuri Estúdio começou a seguir você',gradient:'linear-gradient(135deg,#123cba,#29a36e)',action:'Seguir de volta'},
                      {text:'Dj Nelito Live na sexta às 20h',gradient:'linear-gradient(135deg,#6939d9,#ad50ff)',time:'3 h'},
                      {text:'Toni B. pediu para entrar no seu fã clube',gradient:'linear-gradient(135deg,#9a633e,#e778a8)',action:'Ver'}
                    ].map((item,i) => <div key={'notification-'+i} style={{ display:'flex', alignItems:'center', gap:12, minHeight:56 }}>
                      <div style={{ width:56,height:56,flex:'0 0 56px',borderRadius:50,background:item.gradient }}/>
                      <div style={{ flex:1,minWidth:0,fontSize:17,color:'#000',lineHeight:1.35 }}>{item.text}</div>
                      {item.action ? (
                        <button
                          type="button"
                          onClick={() => setFollowed(prev => ({ ...prev, ['notif-' + i]: !prev['notif-' + i] }))}
                          style={{
                            border: 0,
                            borderRadius: 22,
                            height: 38,
                            padding: '0 12px',
                            background: '#FF2E7A',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {i === 4 ? 'Ver' : (followed['notif-' + i] ? 'Seguindo' : 'Seguir de volta')}
                        </button>
                      ) : (
                        <div style={{ color: '#888', fontSize: 14, whiteSpace: 'nowrap' }}>{item.time}</div>
                      )}
                    </div>)}
                  </div>
                )}
                {messagesTab === 'Mensagens' && (
                  <div style={{ display:'grid', gap:16, paddingTop:18 }}>
                    {[
                      {name:'Lucie M.',last:'Enviou uma mensagem',time:'10:42',gradient:'linear-gradient(135deg,#ff5ba9,#7938d0)'},
                      {name:'Dj Nelito',last:'Vamos conversar mais tarde?',time:'09:18',gradient:'linear-gradient(135deg,#3689ff,#30b990)'},
                      {name:'Yuri Estúdio',last:'Obrigado por seguir!',time:'Ontem',gradient:'linear-gradient(135deg,#ff9b32,#b74723)'},
                      {name:'Ana Bela',last:'Olá! Tudo bem?',time:'Ontem',gradient:'linear-gradient(135deg,#54b4ff,#5841c2)'},
                      {name:'Toni B.',last:'Viu a minha publicação?',time:'Seg',gradient:'linear-gradient(135deg,#ed73b4,#8243ca)'}
                    ].map((chat,i)=><button key={'chat-'+i} type="button" onClick={()=>setNotice('Conversa de exemplo: '+chat.name)} style={{ display:'flex',alignItems:'center',gap:12,width:'100%',border:0,background:'transparent',padding:0,textAlign:'left',color:'#000' }}>
                      <div style={{ width:56,height:56,flex:'0 0 56px',borderRadius:50,background:chat.gradient }}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:17,fontWeight:900,color:'#000' }}>{chat.name}</div>
                        <div style={{ fontSize:14,color:'#888',marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{chat.last}</div>
                      </div>
                      <span style={{ fontSize:13,color:'#888',whiteSpace:'nowrap' }}>{chat.time}</span>
                    </button>)}
                  </div>
                )}
                {messagesTab === 'Comunidade' && (
                  <div style={{ paddingTop:14 }}>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                      {['Sugestões','Seguir de volta','Seguidores','Seguindo'].map((filter,i)=>{const counts=[3,4,5,2];return <button key={filter} type="button" onClick={()=>setCommunityFilter(filter)} style={{ border:communityFilter===filter?'1px solid #dddddd':'0',borderRadius:12,background:communityFilter===filter?'#FFFFFF':'#F2F2F2',color:communityFilter===filter?'#000':'#666',fontSize:15,fontWeight:communityFilter===filter?800:500,padding:'12px 7px',whiteSpace:'nowrap' }}>{filter} · {counts[i]}</button>})}
                    </div>
                    <div style={{ display:'grid',gap:17,paddingTop:19 }}>
                      {[
                        {name:'Zuri',handle:'@zuri · Kimbundu',gradient:'linear-gradient(135deg,#ff9c30,#88512a)',badge:''},
                        {name:'Fidèle',handle:'@fidele · Lingala',gradient:'linear-gradient(135deg,#358eff,#6735c9)',badge:'♛'},
                        {name:'Toni B.',handle:'@tonib · Português',gradient:'linear-gradient(135deg,#ff65ac,#96512f)',badge:''},
                        {name:'Lucie M.',handle:'@luciem · Français',gradient:'linear-gradient(135deg,#36b6ee,#7645ce)',badge:''},
                        {name:'Dj Nelito',handle:'@djnelito · Português',gradient:'linear-gradient(135deg,#9a48d4,#e84c83)',badge:'♛'}
                      ].filter((person,i)=> communityFilter==='Sugestões'?i<3:communityFilter==='Seguir de volta'?i<4:communityFilter==='Seguidores'?i<5:i<2).map((person,i)=><div key={'community-'+communityFilter+'-'+person.name} style={{ display:'flex',alignItems:'center',gap:12,minHeight:56 }}>
                        <div style={{ width:56,height:56,flex:'0 0 56px',borderRadius:50,background:person.gradient }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:17,fontWeight:900,color:'#000' }}>{person.name} {person.badge && <span style={{ color:'#d9a72e',fontSize:13 }}>{person.badge}</span>}</div>
                          <div style={{ fontSize:14,color:'#888',marginTop:3 }}>{person.handle}</div>
                        </div>
                        <button type="button" onClick={()=>setFollowed(v=>({...v,[person.name]:!v[person.name]}))} style={{ border:0,borderRadius:22,padding:'0 16px',height:38,background:'#FF2E7A',color:'#fff',fontSize:14,fontWeight:900 }}>{followed[person.name]?'Seguindo':'Seguir'}</button>
                      </div>)}
                    </div>
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

          {activeNav === 'Início' && <div style={{ position: 'absolute', zIndex: 2, left: 18, right: 82, bottom: 'calc(94px + env(safe-area-inset-bottom))', textAlign: 'left', pointerEvents: 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 900, textShadow: '0 2px 8px #000' }}>{displayName}</div>
            {username && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.72)', marginTop: 3 }}>{username}</div>}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.82)', marginTop: 7 }}>Descubra conteúdos de Angola e de todo o mundo.</div>
          </div>}

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

        {explorePublishOpen && <div role="dialog" aria-modal="true" aria-label="Publicar no explore" style={{position:'fixed',inset:0,zIndex:35,background:'#fff',color:'#000',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",overflowY:'auto',padding:'max(12px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom))'}}>
          <input ref={explorePhotoInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>{const files=Array.from(e.target.files||[]).filter(f=>f.type.startsWith('image/'));const remaining=Math.max(0,10-explorePhotos.length);setExplorePhotos(prev=>[...prev,...files.slice(0,remaining).map(file=>({file,url:URL.createObjectURL(file)}))]);e.target.value='';}}/>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <button type="button" aria-label="Voltar" onClick={()=>setExplorePublishOpen(false)} style={{width:48,height:48,flexShrink:0,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',display:'grid',placeItems:'center',fontSize:22}}>‹</button>
            <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Publicar no explore</div>
          </div>
          <div style={{fontSize:17,color:'#666',marginBottom:12}}>Até 10 fotos · {explorePhotos.length}/10</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {explorePhotos.map((photo,i)=><div key={'explore-photo-'+i} style={{width:140,height:140,position:'relative',borderRadius:20,overflow:'hidden',background:'#f2f2f2'}}><img src={photo.url} alt={'Foto '+(i+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}/><button type="button" aria-label="Remover foto" onClick={()=>setExplorePhotos(prev=>prev.filter((_,j)=>j!==i))} style={{position:'absolute',top:6,right:6,width:24,height:24,border:0,borderRadius:50,background:'rgba(0,0,0,.65)',color:'#fff'}}>×</button></div>)}
            {explorePhotos.length<10&&<button type="button" onClick={()=>explorePhotoInputRef.current?.click()} style={{width:140,height:140,borderRadius:20,borderWidth:2,borderStyle:'dotted',borderColor:'rgb(255,46,122)',background:'#fff',color:'#666',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}><span style={{fontSize:32,lineHeight:1}}>+</span><span style={{fontSize:18,fontWeight:900}}>Adicionar</span></button>}
          </div>
          <div style={{marginTop:24}}>
            <div style={{fontSize:19,fontWeight:950,color:'#000',marginBottom:10}}>Legenda</div>
            <textarea value={exploreCaption} onChange={e=>setExploreCaption(e.target.value)} placeholder="Escreva uma legenda" style={{width:'100%',boxSizing:'border-box',height:140,resize:'vertical',border:0,borderRadius:20,padding:16,background:'#F2F2F2',color:'#000',fontSize:18,outline:'none'}}/>
          </div>
          <button type="button" disabled={!explorePhotos.length} onClick={()=>{const posts=explorePhotos.map((photo,i)=>({id:Date.now()+i,url:photo.url,type:'image',caption:exploreCaption}));setPublishedMedia(prev=>[...posts,...prev]);setExplorePublishOpen(false);setExplorePhotos([]);setExploreCaption('');setActiveNav('Explorar');setExploreTab('Explorar');setNotice('Fotos publicadas no Explorar.');}} style={{marginTop:24,width:'100%',height:64,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:950,opacity:explorePhotos.length?1:.5,cursor:explorePhotos.length?'pointer':'not-allowed'}}>Publicar</button>
        </div>}
        {createOpen && <div role="dialog" aria-modal="true" aria-label="Criar publicação" style={{ position:'fixed',inset:0,zIndex:30,background:'#000',color:'#fff',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
          <input ref={galleryInputRef} type="file" accept={captureMode==='Foto'?'image/*':'video/*'} style={{display:'none'}} onChange={e=>{const file=e.target.files?.[0];if(file){setSelectedMedia({file,url:URL.createObjectURL(file),type:file.type.startsWith('video/')?'video':'image'});setCreateStep(2);}e.target.value='';}}/>
          <input ref={captureInputRef} type="file" accept={captureMode==='Foto'?'image/*':'video/*'} capture={cameraFacing} style={{display:'none'}} onChange={e=>{const file=e.target.files?.[0];if(file){setSelectedMedia({file,url:URL.createObjectURL(file),type:file.type.startsWith('video/')?'video':'image'});setCreateStep(2);}e.target.value='';}}/>
          {createStep===1 && <div style={{position:'absolute',inset:0,background:'#000',display:'flex',flexDirection:'column',padding:'max(12px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom))'}}>
            <div style={{height:52,display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center'}}><button type="button" aria-label="Fechar" onClick={()=>{setCreateOpen(false);setCreateStep(1);setSelectedMedia(null);}} style={{width:40,height:40,borderRadius:50,border:0,background:'#171717',color:'#fff',fontSize:24}}>×</button><div style={{display:'flex',gap:3,padding:4,borderRadius:28,background:'#1A0B2E'}}>{['Foto','Vídeo'].map(m=><button key={m} type="button" onClick={()=>setCaptureMode(m)} style={{padding:'9px 17px',border:0,borderRadius:22,background:captureMode===m?'#fff':'transparent',color:captureMode===m?'#000':'#aaa',fontWeight:captureMode===m?900:600,fontSize:18}}>{m}</button>)}</div><span/></div>
            <div style={{flex:1,minHeight:0,position:'relative',margin:'18px 0',background:'#000',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'repeat(3,1fr)'}}>{Array.from({length:9},(_,i)=><div key={i} style={{borderRight:i%3!==2?'1px solid #292929':'none',borderBottom:i<6?'1px solid #292929':'none'}}/>)}<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#444',fontSize:12,pointerEvents:'none'}}>{captureMode==='Foto'?'Câmara · Foto':'Câmara · Vídeo'}</div></div>
            <div style={{height:126,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',alignItems:'center',justifyItems:'center'}}><button type="button" onClick={()=>galleryInputRef.current?.click()} style={{display:'grid',justifyItems:'center',gap:7,border:0,background:'transparent',color:'#fff'}}><span style={{width:56,height:56,borderRadius:14,background:'linear-gradient(135deg,#ff55b8,#843cff)',display:'grid',placeItems:'center'}}><Icon name="photo" size={25}/></span><span style={{fontSize:15}}>Galeria</span></button><button type="button" aria-label="Capturar" onClick={()=>captureInputRef.current?.click()} style={{width:82,height:82,borderRadius:50,border:'8px solid #fff',background:'#FF2E7A'}}/><button type="button" aria-label="Trocar câmara" onClick={()=>setCameraFacing(v=>v==='environment'?'user':'environment')} style={{display:'grid',justifyItems:'center',gap:6,border:0,background:'transparent',color:'#fff'}}><span style={{fontSize:28}}>⇄</span><span style={{fontSize:12}}>Trocar câmara</span></button></div>
          </div>}
          {createStep===2 && selectedMedia && <div style={{position:'absolute',inset:0,display:'grid',gridTemplateRows:'80px 1fr 300px',background:'#000'}}><div style={{display:'flex',alignItems:'center',padding:'max(12px,env(safe-area-inset-top)) 16px 0'}}><button type="button" onClick={()=>{setCreateOpen(false);setCreateStep(1);setSelectedMedia(null);}} style={{width:40,height:40,borderRadius:50,border:0,background:'#111',color:'#fff',fontSize:24}}>×</button></div><div style={{background:'#fff',display:'grid',placeItems:'center',overflow:'hidden'}}>{selectedMedia.type==='video'?<video src={selectedMedia.url} controls playsInline style={{width:'80%',maxHeight:'100%',objectFit:'contain'}}/>:<img src={selectedMedia.url} alt="Pré-visualização" style={{width:'80%',maxHeight:'100%',objectFit:'contain'}}/>}</div><div style={{background:'#000',display:'flex',alignItems:'flex-end',gap:10,padding:'16px 16px max(18px,env(safe-area-inset-bottom))'}}><button type="button" onClick={()=>{setCreateStep(1);galleryInputRef.current?.click();}} style={{width:'48%',height:60,border:0,borderRadius:20,background:'#2A1A4A',color:'#fff',fontSize:20,fontWeight:900}}>Trocar</button><button type="button" onClick={()=>setCreateStep(3)} style={{width:'48%',height:60,border:0,borderRadius:20,background:'#FFD966',color:'#000',fontSize:20,fontWeight:900}}>Seguinte</button></div></div>}
          {createStep===3 && selectedMedia && <div style={{position:'absolute',inset:0,overflowY:'auto',background:'#1A0B2E',padding:'max(14px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom))',display:'flex',flexDirection:'column',gap:18}}><div style={{display:'flex',alignItems:'center',gap:12}}><button type="button" onClick={()=>setCreateStep(2)} style={{width:42,height:42,border:0,borderRadius:50,background:'#2A1A4A',color:'#fff',fontSize:23}}>‹</button><div style={{fontSize:26,fontWeight:900}}>Nova publicação</div></div><div style={{height:260,borderRadius:'0 0 24px 24px',background:'#fff',display:'grid',placeItems:'center',overflow:'hidden'}}>{selectedMedia.type==='video'?<video src={selectedMedia.url} controls playsInline style={{width:'80%',maxHeight:'100%',objectFit:'contain'}}/>:<img src={selectedMedia.url} alt="Mídia escolhida" style={{width:'80%',maxHeight:'100%',objectFit:'contain'}}/>}</div><div style={{display:'grid',gap:8}}><label style={{color:'#aaa',fontSize:18,fontWeight:900}}>Legenda</label><textarea value={captionText} onChange={e=>setCaptionText(e.target.value)} placeholder="Escreva uma legenda" style={{height:120,resize:'vertical',border:0,borderRadius:20,padding:16,background:'#2A1A4A',color:'#fff',fontSize:18,outline:'none'}}/></div><div style={{display:'grid',gap:9}}><label style={{color:'#aaa',fontSize:18,fontWeight:900}}>Hashtags</label><input value={hashtagText} onChange={e=>setHashtagText(e.target.value)} placeholder="#fãclube #angola" style={{height:60,border:0,borderRadius:20,padding:'0 16px',background:'#2A1A4A',color:'#fff',fontSize:18,outline:'none'}}/><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{['#fãclube','#angola','#música'].map(tag=><button key={tag} type="button" onClick={()=>setHashtagText(v=>(v.trim()+' '+tag).trim())} style={{border:0,borderRadius:22,padding:'9px 4px',background:'#2A1A4A',color:'#fff',fontSize:14}}>{tag}</button>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>{['#novo','#bastidores'].map(tag=><button key={tag} type="button" onClick={()=>setHashtagText(v=>(v.trim()+' '+tag).trim())} style={{border:0,borderRadius:22,padding:'9px 4px',background:'#2A1A4A',color:'#fff',fontSize:14}}>{tag}</button>)}</div></div><button type="button" onClick={()=>{const post={id:Date.now(),url:selectedMedia.url,type:selectedMedia.type,caption:captionText,tags:hashtagText};setPublishedMedia(prev=>[post,...prev]);setCreateOpen(false);setCreateStep(1);setActiveNav('Explorar');setExploreTab('Explorar');setCaptionText('');setHashtagText('');setSelectedMedia(null);setNotice('Publicação adicionada ao feed e ao perfil.');}} style={{marginTop:'auto',width:'100%',height:64,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:900}}>Publicar</button></div>}
        </div>}
      </main>
    </>
  );
}
