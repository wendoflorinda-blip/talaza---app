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
  const [mediaProfile, setMediaProfile] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [activeNav, setActiveNav] = useState('Início');
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [exploreTab, setExploreTab] = useState('Explorar');
  const [followed, setFollowed] = useState({});
  const [postLiked, setPostLiked] = useState(false);
  const [profileTab, setProfileTab] = useState('Publicações');
  const [discoveryLanguage, setDiscoveryLanguage] = useState('Todos');
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
  const [fanclubPostMedia, setFanclubPostMedia] = useState([]);
  const [fanclubPostDescription, setFanclubPostDescription] = useState('');
  const [fanclubPollQuestion, setFanclubPollQuestion] = useState('');
  const [fanclubPollMedia, setFanclubPollMedia] = useState(null);
  const [fanclubPollOptions, setFanclubPollOptions] = useState(['','']);
  const [publishedPolls, setPublishedPolls] = useState([]);
  const [fanclubViewTab, setFanclubViewTab] = useState('Publicações');
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
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLinks, setProfileLinks] = useState([]);
  const [profileEmail, setProfileEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [profileLanguageDraft, setProfileLanguageDraft] = useState('');
  const [profileLanguageOptions, setProfileLanguageOptions] = useState([]);
  const [profileCoverColor, setProfileCoverColor] = useState('#E84A8A');
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [mediaPlan, setMediaPlan] = useState(null);
  const [mediaPlanLoading, setMediaPlanLoading] = useState(false);
  const [mediaSuggestions, setMediaSuggestions] = useState([]);
  const [mediaPosts, setMediaPosts] = useState([]);
  const [mediaFollowIds, setMediaFollowIds] = useState([]);
  const [discoveryLanguages, setDiscoveryLanguages] = useState([]);
  const [mediaDataLoading, setMediaDataLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const profileAvatarInputRef = useRef(null);
  const coverColorInputRef = useRef(null);
  const coverPalette = ['#E84A8A','#FF2E7A','#FF5FA8','#FF8A3D','#FFD966','#D6E83D','#63C653','#19A875','#36C6C9','#45A5F5','#5C6DFF','#8A3DFF','#B44AFF','#D94AFF','#FF4A58','#914D36','#222222','#F2F2F2'];

  const [cameraFacing, setCameraFacing] = useState('environment');
  const galleryInputRef = useRef(null);
  const captureInputRef = useRef(null);


  useEffect(() => {
    let mounted = true;
    setMediaPlanLoading(true);
    supabase.from('plans').select('id,name,price,duration_days,plan_type,is_active')
      .eq('id','f8dae010-62c6-439c-985f-8053bf168dfd').eq('plan_type','talaza_midia').eq('is_active',true).maybeSingle()
      .then(({data,error})=>{if(!mounted)return;if(error)console.error('Erro ao carregar plano Perfil Profissional:',error);setMediaPlan(data||null);setMediaPlanLoading(false);});
    async function loadProfile(authUser) {
      if (!authUser) {
        setMediaProfile(null);
        setProfileAvatarUrl('');
        setProfileName('');
        setProfileUsername('');
        setProfileLocation('');
        return;
      }
      const [{ data: mediaData, error: mediaError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.from('media_profiles').select('display_name,username,email,bio,social_links,country_id,province_id,interface_language,is_professional,professional_status,plan_id,plan_paid_at,plan_expires_at,approved_by,approved_at').eq('user_id', authUser.id).maybeSingle(),
        supabase.from('profiles').select('name,username,avatar_url,country_id,province_id,show_email').eq('id', authUser.id).maybeSingle(),
      ]);
      if (mediaError) console.error('Erro ao carregar media_profiles:', mediaError);
      if (profileError) console.error('Erro ao carregar profiles:', profileError);
      const countryId = mediaData?.country_id || profileData?.country_id;
      const provinceId = mediaData?.province_id || profileData?.province_id;
      const [{ data: countryData }, { data: provinceData }] = await Promise.all([
        countryId ? supabase.from('countries').select('name').eq('id', countryId).maybeSingle() : Promise.resolve({data:null}),
        provinceId ? supabase.from('provinces').select('name').eq('id', provinceId).maybeSingle() : Promise.resolve({data:null}),
      ]);
      if (!mounted) return;
      setMediaProfile(mediaData ? {...mediaData,show_email:Boolean(profileData?.show_email)} : null);
      setProfileAvatarUrl(profileData?.avatar_url || authUser.user_metadata?.avatar_url || '');
      setProfileName(mediaData?.display_name || profileData?.name || authUser.user_metadata?.media_display_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || '');
      setProfileUsername(mediaData?.username || authUser.user_metadata?.media_username || '');
      setProfileLocation([provinceData?.name, countryData?.name].filter(Boolean).join(', '));
      setShowEmail(Boolean(profileData?.show_email));
      setProfileCoverColor(authUser.user_metadata?.media_cover_color || '#E84A8A');
    }
    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      const authUser = error ? null : data?.user || null;
      setUser(authUser);
      await loadProfile(authUser);
      if (mounted) setLoading(false);
    }
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      loadProfile(authUser);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const metadata = user?.user_metadata || {};
  const displayName = String(mediaProfile?.display_name || profileName || user?.user_metadata?.media_display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const rawUsername = String(mediaProfile?.username || profileUsername || user?.user_metadata?.media_username || user?.user_metadata?.username || '').trim().replace(/^@+/, '');
  const username = rawUsername ? '@' + rawUsername : '';
  const profileTitle = displayName || username;
  const profileInitials = displayName.split(/[\\s._-]+/).filter(Boolean).slice(0,2).map(part=>part[0].toUpperCase()).join('');
  const profileLanguage = mediaProfile?.interface_language || user?.user_metadata?.media_interface_language || '';
  const fanclubCount = 0;
  const socialLinks = mediaProfile?.social_links || metadata.media_links;
  const profileBioValue = mediaProfile?.bio || metadata.media_bio || '';
  const profileLink = typeof socialLinks === 'string' ? socialLinks : Array.isArray(socialLinks) ? (typeof socialLinks[0] === 'string' ? socialLinks[0] : socialLinks[0]?.url || socialLinks[0]?.link || '') : socialLinks?.url || socialLinks?.website || '';
  const pagouPlano = Boolean(mediaProfile?.plan_id && mediaProfile?.plan_paid_at);
  const aprovadoPelaAdmin = Boolean(mediaProfile?.is_professional && mediaProfile?.professional_status === 'approved' && mediaProfile?.approved_by && mediaProfile?.approved_at);
  const temAcessoPremium = pagouPlano && aprovadoPelaAdmin && Boolean(mediaProfile?.plan_expires_at && new Date(mediaProfile.plan_expires_at).getTime() > Date.now());

  useEffect(() => {
    let cancelled = false;
    async function loadMediaCommunity() {
      if (!user?.id) {
        setMediaSuggestions([]); setMediaPosts([]); setMediaFollowIds([]);
        setFollowerCount(0); setFollowingCount(0); setDiscoveryLanguages([]);
        return;
      }
      setMediaDataLoading(true);
      const [{data:suggestions,error:suggestionsError},{data:posts,error:postsError},{data:follows,error:followsError},{count:followers,error:followersError},{count:following,error:followingError}] = await Promise.all([
        supabase.from('media_discovery_profiles').select('user_id,display_name,username,interface_language,avatar_url,plan_expires_at').neq('user_id',user.id).order('display_name'),
        supabase.from('media_posts').select('id,user_id,media_url,media_type,caption,hashtags,language,created_at').eq('status','published').order('created_at',{ascending:false}),
        supabase.from('media_follows').select('following_id').eq('follower_id',user.id),
        supabase.from('media_follows').select('follower_id',{count:'exact',head:true}).eq('following_id',user.id),
        supabase.from('media_follows').select('following_id',{count:'exact',head:true}).eq('follower_id',user.id)
      ]);
      if(cancelled)return;
      if(suggestionsError)console.error('Erro ao carregar sugestões Mídia:',suggestionsError);
      if(postsError)console.error('Erro ao carregar publicações Mídia:',postsError);
      if(followsError)console.error('Erro ao carregar seguimentos Mídia:',followsError);
      if(followersError)console.error('Erro ao contar seguidores Mídia:',followersError);
      if(followingError)console.error('Erro ao contar seguindo Mídia:',followingError);
      const activeSuggestions=suggestions||[];
      setMediaSuggestions(activeSuggestions);
      setMediaPosts(posts||[]);
      setMediaFollowIds((follows||[]).map(row=>row.following_id));
      setFollowerCount(followers||0);
      setFollowingCount(following||0);
      setDiscoveryLanguages([...new Set(activeSuggestions.map(row=>row.interface_language).filter(Boolean))].sort((a,b)=>a.localeCompare(b)));
      setMediaDataLoading(false);
    }
    loadMediaCommunity();
    return()=>{cancelled=true;};
  },[user?.id]);

  async function toggleMediaFollow(targetId) {
    if(!user?.id)return router.push('/login?next=/media');
    const alreadyFollowing=mediaFollowIds.includes(targetId);
    const result=alreadyFollowing
      ? await supabase.from('media_follows').delete().eq('follower_id',user.id).eq('following_id',targetId)
      : await supabase.from('media_follows').insert({follower_id:user.id,following_id:targetId});
    if(result.error){setNotice('Não foi possível atualizar o seguimento: '+result.error.message);return;}
    setMediaFollowIds(current=>alreadyFollowing?current.filter(id=>id!==targetId):[...current,targetId]);
    setFollowingCount(current=>Math.max(0,current+(alreadyFollowing?-1:1)));
  }

  useEffect(()=>{
    let cancelled=false;
    async function loadCountryLanguages(){
      if(!profileEditing||!temAcessoPremium||!mediaProfile?.country_id){setProfileLanguageOptions([]);return;}
      const {data,error}=await supabase.from('country_languages').select('language_id,languages(name,code)').eq('country_id',mediaProfile.country_id).eq('is_active',true);
      if(error){console.error('Erro ao carregar idiomas do país:',error);return;}
      if(!cancelled)setProfileLanguageOptions((data||[]).map(row=>row.languages).filter(Boolean));
    }
    loadCountryLanguages();
    return()=>{cancelled=true;};
  },[profileEditing,temAcessoPremium,mediaProfile?.country_id]);

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
    if (item === 'Perfil') { setNotice(''); setProfileTab('Publicações'); return; }
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
              {profileAvatarPreview ? <img src={profileAvatarPreview} alt="Pré-visualização" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : profileAvatarUrl ? <img src={profileAvatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : profileInitials || null}
            </button>
            <input ref={profileAvatarInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const file=e.target.files?.[0];if(file){setProfileAvatarFile(file);const reader=new FileReader();reader.onload=()=>setProfileAvatarPreview(String(reader.result||''));reader.readAsDataURL(file);}}}/>
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
          {temAcessoPremium && profileLanguageOptions.length>0 && <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Idioma</label>
            <select value={profileLanguageDraft} onChange={e=>setProfileLanguageDraft(e.target.value)} style={{height:64,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#000',fontSize:20}}>
              {profileLanguageOptions.map(lang=><option key={lang.code} value={lang.name}>{lang.name}</option>)}
            </select>
          </div>}
          {temAcessoPremium && <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>Links (máximo 2)</label>
            {profileLinks.map((link,i)=><div key={'profile-link-'+i} style={{display:'flex',gap:10,alignItems:'center'}}>
              <input value={link} onChange={e=>setProfileLinks(prev=>prev.map((v,j)=>j===i?e.target.value:v))} placeholder="Link" style={{height:64,flex:1,minWidth:0,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#000',fontSize:20}}/>
              <button type="button" aria-label="Apagar link" onClick={()=>setProfileLinks(prev=>prev.filter((_,j)=>j!==i))} style={{width:64,height:64,border:0,borderRadius:20,background:'#F2F2F2',color:'#000',fontSize:20}}>⌫</button>
            </div>)}
            {profileLinks.length<2&&<button type="button" onClick={()=>setProfileLinks(prev=>[...prev,''])} style={{height:64,border:0,borderRadius:20,background:'#F2F2F2',color:'#000',fontSize:20,fontWeight:900}}>＋ Adicionar link ({profileLinks.length}/2)</button>}
          </div>}
          <div style={{display:'grid',gap:8,marginBottom:20}}>
            <label style={{fontSize:19,fontWeight:900,color:'#666'}}>E-mail</label>
            <input type="email" value={user?.email || ''} readOnly disabled style={{height:64,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#666',fontSize:20}}/>
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
          <button type="button" disabled={profileSaving} onClick={async()=>{
            setProfileSaving(true);
            try {
              const cleanUsername=profileUsername.trim().replace(/^@+/,'').toLowerCase();
              const cleanLinks=profileLinks.map(v=>v.trim()).filter(Boolean).slice(0,2);
              let avatarUrl = profileAvatarUrl;
              if (profileAvatarFile) {
                const bitmap = await createImageBitmap(profileAvatarFile);
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width; canvas.height = bitmap.height;
                canvas.getContext('2d').drawImage(bitmap,0,0);
                const jpegBlob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
                bitmap.close?.();
                if (!jpegBlob) throw new Error('Não foi possível preparar a fotografia.');
                const { error: uploadError } = await supabase.storage.from('avatars').upload(user.id + '.jpg', jpegBlob, { upsert:true, contentType:'image/jpeg' });
                if (uploadError) throw uploadError;
                const { data: publicAvatar } = supabase.storage.from('avatars').getPublicUrl(user.id + '.jpg');
                avatarUrl = publicAvatar.publicUrl + '?v=' + Date.now();
                const { error: avatarError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id',user.id);
                if (avatarError) throw avatarError;
              }
              const { data: authData, error: authError } = await supabase.auth.updateUser({data:{media_display_name:profileName.trim(),media_username:cleanUsername,media_bio:profileBio,media_links:temAcessoPremium?cleanLinks:(mediaProfile?.social_links||[]),media_cover_color:profileCoverColor,media_interface_language:temAcessoPremium?profileLanguageDraft:mediaProfile?.interface_language}});
              if (authError) throw authError;
              const { error: profileError } = await supabase.from('profiles').update({
                name:profileName.trim(),username:cleanUsername || null,show_email:showEmail,avatar_url:avatarUrl || null
              }).eq('id',user.id);
              if (profileError) throw profileError;
              const { error: mediaError } = await supabase.from('media_profiles').update({
                display_name:profileName.trim(),username:cleanUsername || null,bio:profileBio.trim() || null,
                social_links:temAcessoPremium?cleanLinks:(mediaProfile?.social_links||[]),interface_language:temAcessoPremium?profileLanguageDraft:mediaProfile?.interface_language,email:user.email || null
              }).eq('user_id',user.id);
              if (mediaError) throw mediaError;
              setUser(authData.user || user);
              setProfileAvatarUrl(avatarUrl || '');
              setMediaProfile(prev=>({...prev,display_name:profileName.trim(),username:cleanUsername || null,bio:profileBio.trim() || null,social_links:temAcessoPremium?cleanLinks:(prev?.social_links||[]),interface_language:temAcessoPremium?profileLanguageDraft:prev?.interface_language,email:user.email || null,show_email:showEmail}));
              setProfileName(profileName.trim());
              setProfileUsername(cleanUsername);
              setProfileAvatarFile(null);setProfileAvatarPreview('');
              setProfileEditing(false);setNotice('Perfil atualizado.');
            } catch(error) {
              console.error('Erro ao guardar perfil da Mídia:',error);
              setNotice('Não foi possível guardar o perfil: ' + (error.message || 'tenta novamente.'));
            } finally { setProfileSaving(false); }
          }} style={{width:'100%',height:64,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:900,marginBottom:8}}>{profileSaving?'A guardar…':'Guardar alterações'}</button>
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
            {activeNav === 'Perfil' && (
              <div style={{ position: 'absolute', inset: 0, background: '#ffffff', overflowY: 'auto', padding: 'max(12px,env(safe-area-inset-top)) 14px calc(88px + env(safe-area-inset-bottom))', color: '#fff', textAlign: 'left' }}>
                {!user ? (
                  <div style={{ minHeight:'calc(100% - 20px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', color:'#111', gap:14 }}>
                    <Icon name="user" size={42}/>
                    <div style={{fontSize:20,fontWeight:900}}>Entra na tua conta para veres o teu perfil</div>
                    <button type="button" onClick={() => router.push('/login?next=/media')} style={{border:0,borderRadius:14,padding:'12px 28px',background:'#FF2E7A',color:'#fff',fontSize:15,fontWeight:900}}>Entrar</button>
                  </div>
                ) : (
                <>
                <div style={{ position: 'relative', height: 156, borderRadius: 19, background: metadata.media_cover_color || 'linear-gradient(115deg,#c9f33a 0%,#68bb38 45%,#11643b 100%)', marginBottom: 64, overflow: 'visible' }}>
                  {temAcessoPremium && <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 9 }}>
                    <button aria-label="Adicionar pessoa" type="button" onClick={() => setNotice('Convidar pessoas para o perfil.')} style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid rgba(0,0,0,.25)', background: 'rgba(20,30,24,.65)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="people" size={18}/></button>
                    <button aria-label="Configurações do perfil" type="button" onClick={() => setNotice('Configurações de aparência do perfil.')} style={{ width: 36, height: 36, borderRadius: 50, border: '1px solid rgba(0,0,0,.25)', background: 'rgba(20,30,24,.65)', color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="sparkle" size={18}/></button>
                  </div>}
                  <div style={{ position: 'absolute', left: 14, bottom: -51, width: 104, height: 104, borderRadius: 22, padding: 3, background: 'linear-gradient(135deg,#ff4da9,#a83bfa)', boxShadow: '0 0 17px rgba(229,61,202,.3)' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 19, background: '#F2F2F2', display: 'grid', placeItems: 'center', overflow:'hidden' }}>{profileAvatarUrl ? <img src={profileAvatarUrl} alt="Foto de perfil" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : profileInitials ? <div style={{fontSize:30,fontWeight:950,color:'#777'}}>{profileInitials}</div> : null}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6, padding: 0, borderRadius: 0, background: 'transparent', border: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -.4, color: '#111111', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    {profileTitle}
                    {temAcessoPremium && <span style={{padding:'4px 8px',borderRadius:12,background:'#f4df83',color:'#5b4210',fontSize:10,fontWeight:950}}>Perfil profissional</span>}
                  </div>
                  {username && <div style={{ fontSize: 12, color: '#555555' }}>{username}{temAcessoPremium && profileLanguage ? ' · ' + profileLanguage : ''}</div>}
                  {profileLocation && <div style={{ fontSize: 12, color: '#555555', marginTop: 4 }}>⌖ {profileLocation}</div>}
                  {profileBioValue?.trim() && <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 5, color: '#111111' }}>{profileBioValue}</div>}
                  {temAcessoPremium && profileLink && <a href={/^https?:\/\//i.test(profileLink) ? profileLink : `https://${profileLink}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1674c4', marginTop: 4, display:'inline-flex', alignItems:'center', gap:6 }}><Icon name="link" size={15}/>{profileLink}</a>}
                  {mediaProfile?.show_email && user?.email && <div style={{fontSize:12,color:'#555',marginTop:4}}>{user.email}</div>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:temAcessoPremium?'repeat(3,1fr)':'repeat(2,1fr)', gap:6, marginTop:19, marginBottom:18, textAlign:'center' }}>
                  <div><div style={{fontSize:17,fontWeight:950,color:'#111'}}>{followerCount}</div><div style={{fontSize:11,color:'#666',marginTop:3}}>Seguidores</div></div>
                  <div><div style={{fontSize:17,fontWeight:950,color:'#111'}}>{followingCount}</div><div style={{fontSize:11,color:'#666',marginTop:3}}>Seguindo</div></div>
                  {temAcessoPremium && <div><div style={{fontSize:17,fontWeight:950,color:'#111'}}>{fanclubCount}</div><div style={{fontSize:11,color:'#666',marginTop:3}}>Fã clube</div></div>}
                </div>
                <button type="button" onClick={()=>setPlansOpen(true)} style={{width:'100%',border:0,borderRadius:13,padding:13,background:'#ff3fa3',color:'#fff',fontSize:13,fontWeight:950,marginTop:8,marginBottom:18}}>Ver planos</button>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:18}}>
                  <button type="button" onClick={()=>selectNav('Mensagens')} style={{border:'1px solid #4a2a5c',borderRadius:12,padding:11,background:'#2b103b',color:'#fff',fontSize:12,fontWeight:850,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Icon name="message" size={16}/>Mensagens</button>
                  <button type="button" onClick={()=>{setProfileEditing(true);setProfileName(displayName);setProfileUsername(rawUsername);setProfileBio(mediaProfile?.bio||metadata.media_bio||'');setProfileLinks(Array.isArray(mediaProfile?.social_links)?mediaProfile.social_links:metadata.media_links||[]);setProfileEmail(user?.email||'');setShowEmail(Boolean(mediaProfile?.show_email));setProfileLanguageDraft(profileLanguage);setProfileCoverColor(metadata.media_cover_color||'#E84A8A');setProfileAvatarPreview('');}} style={{border:'1px solid #4a2a5c',borderRadius:12,padding:11,background:'#2b103b',color:'#fff',fontSize:12,fontWeight:850,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Icon name="edit" size={16}/>Editar perfil</button>
                </div>
                {temAcessoPremium && <div style={{display:'grid',gap:9,marginBottom:19}}>
                  <button type="button" onClick={()=>{setExplorePublishOpen(true);setExplorePhotos([]);setExploreCaption('');}} style={{width:'100%',border:0,borderRadius:13,padding:13,background:'#f4df83',color:'#241b10',fontSize:13,fontWeight:950,display:'flex',alignItems:'center',justifyContent:'center',gap:9}}><Icon name="globe" size={18}/>Publicar no explore</button>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                    <button type="button" onClick={()=>setNotice('Gerir publicações, lives e enquetes do fã clube.')} style={{padding:12,border:'1px solid #45245b',borderRadius:15,background:'#2b103b',textAlign:'left',color:'#fff'}}>
                      <div style={{width:37,height:37,borderRadius:11,background:'#ff3fa3',display:'grid',placeItems:'center',marginBottom:9}}><Icon name="people" size={20}/></div>
                      <div style={{fontSize:12,fontWeight:950}}>Meu fã clube</div><div style={{fontSize:10,color:'#b9a8c8',lineHeight:1.5,marginTop:4}}>Publicar, lives e enquetes</div>
                    </button>
                    <button type="button" onClick={()=>{setFanclubScreen('settings');setFanclubFeedback('');setActiveNav('Fã clube');setNotice('');}} style={{padding:12,border:'1px solid #45245b',borderRadius:15,background:'#2b103b',textAlign:'left',color:'#fff'}}>
                      <div style={{width:37,height:37,borderRadius:11,background:'#ff3fa3',display:'grid',placeItems:'center',marginBottom:9}}><Icon name="sparkle" size={20}/></div>
                      <div style={{fontSize:12,fontWeight:950}}>Configurar fã clube</div><div style={{fontSize:10,color:'#b9a8c8',lineHeight:1.5,marginTop:4}}>Como os fãs interagem</div>
                    </button>
                  </div>
                </div>}
                <div style={{display:'flex',gap:6,overflowX:'auto',borderBottom:'1px solid #45245b',marginBottom:10}}>
                  {(temAcessoPremium?['Publicações','Fotos','Vídeos','Favoritos','Guardados']:['Publicações','Guardados','Favoritos']).map(tab=><button key={tab} type="button" onClick={()=>setProfileTab(tab)} style={{flex:'0 0 auto',padding:'11px 8px',border:0,borderBottom:profileTab===tab?'2px solid #ff4fa9':'2px solid transparent',background:'transparent',color:profileTab===tab?'#222':'#777',fontSize:12,fontWeight:900}}>{tab}</button>)}
                </div>
                {profileTab==='Publicações'||profileTab==='Fotos'||profileTab==='Vídeos' ? (
                  (mediaPosts.filter(post=>post.user_id===user.id && (profileTab==='Publicações'||(profileTab==='Fotos'&&post.media_type==='image')||(profileTab==='Vídeos'&&post.media_type==='video'))).length===0)
                    ? <div style={{minHeight:120,display:'grid',placeItems:'center',padding:18,textAlign:'center',color:'#777',fontSize:13}}>Ainda não tens publicações</div>
                    : <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                      {mediaPosts.filter(post=>post.user_id===user.id && (profileTab==='Publicações'||(profileTab==='Fotos'&&post.media_type==='image')||(profileTab==='Vídeos'&&post.media_type==='video'))).map(post=><div key={post.id} style={{aspectRatio:'1/1',background:'#eee',overflow:'hidden'}}>{post.media_type==='video'?<video src={post.media_url} controls playsInline style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<img src={post.media_url} alt={post.caption||'Publicação'} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div>)}
                    </div>
                ) : <div style={{minHeight:120,display:'grid',placeItems:'center',padding:18,textAlign:'center',color:'#777',fontSize:13}}>{profileTab==='Guardados'?'Ainda não tens publicações guardadas':'Ainda não tens publicações favoritas'}</div>}
                </>
                )}
              </div>
            )}
            {activeNav === 'Explorar' && (

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
                    <div style={{display:'flex',alignItems:'center',gap:9,padding:12,borderRadius:15,background:'#2b103b',border:'1px solid #45245b'}}>
                      <div style={{width:38,height:38,borderRadius:50,background:'#F2F2F2',display:'grid',placeItems:'center',overflow:'hidden',color:'#777',fontWeight:900}}>{profileAvatarUrl?<img src={profileAvatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:profileInitials || null}</div>
                      <button type="button" onClick={()=>{if(!user){router.push('/login?next=/media');return;}setCaptureMode('Foto');setCreateStep(1);setSelectedMedia(null);setCreateOpen(true);}} style={{flex:1,minWidth:0,padding:'11px 13px',border:0,borderRadius:20,background:'#3a1b4a',color:'#cdbed7',fontSize:12,textAlign:'left'}}>{user?'No que estás a pensar?':'Entra para criar uma publicação'}</button>
                      <button aria-label="Adicionar foto ou vídeo" type="button" onClick={()=>{if(!user){router.push('/login?next=/media');return;}setCaptureMode('Foto');setCreateStep(1);setSelectedMedia(null);setCreateOpen(true);}} style={{border:0,background:'transparent',color:'#ff75bb',display:'grid',placeItems:'center'}}><Icon name="photo" size={22}/></button>
                    </div>
                    {mediaSuggestions.length>0 ? <div>
                      <div style={{fontSize:14,fontWeight:900,marginBottom:10}}>Sugestões de pessoas</div>
                      <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:4}}>
                        {mediaSuggestions.map(person=><div key={person.user_id} style={{flex:'0 0 90px',display:'grid',justifyItems:'center',gap:6}}>
                          <div style={{width:62,height:62,borderRadius:50,padding:3,background:'linear-gradient(135deg,#ff4fa9,#ff9a37)'}}><div style={{width:'100%',height:'100%',borderRadius:50,background:'#eee',overflow:'hidden',display:'grid',placeItems:'center',color:'#777',fontWeight:900}}>{person.avatar_url?<img src={person.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:String(person.display_name||'').trim().split(/\\s+/).map(p=>p[0]).join('').slice(0,2)}</div></div>
                          <div style={{fontSize:12,fontWeight:800,color:'#21152a',textAlign:'center'}}>{person.display_name}</div>
                          <div style={{fontSize:10,color:'#777'}}>@{person.username}</div>
                          <button type="button" onClick={()=>toggleMediaFollow(person.user_id)} style={{width:82,padding:'6px 0',border:0,borderRadius:18,background:mediaFollowIds.includes(person.user_id)?'#482451':'#ff3fa3',color:'#fff',fontSize:10,fontWeight:900}}>{mediaFollowIds.includes(person.user_id)?'Seguindo':'Seguir'}</button>
                        </div>)}
                      </div>
                    </div> : <div style={{padding:12,textAlign:'center',color:'#777',fontSize:12}}>Ainda não há sugestões</div>}
                    {mediaPosts.length===0 ? <div style={{padding:24,textAlign:'center',color:'#777',fontSize:13}}>Ainda não há publicações</div> : mediaPosts.map(post=><article key={post.id} style={{padding:12,borderRadius:16,background:'#2b103b',border:'1px solid #45245b',display:'grid',gap:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div style={{width:38,height:38,borderRadius:50,background:'#eee',overflow:'hidden',display:'grid',placeItems:'center',color:'#777',fontWeight:900}}>{mediaSuggestions.find(p=>p.user_id===post.user_id)?.avatar_url?<img src={mediaSuggestions.find(p=>p.user_id===post.user_id).avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:''}</div>
                        <div style={{fontSize:13,fontWeight:900,color:'#fff'}}>{mediaSuggestions.find(p=>p.user_id===post.user_id)?.display_name || (post.user_id===user?.id?displayName:'')}</div>
                      </div>
                      {post.caption&&<div style={{fontSize:12,lineHeight:1.55,color:'#fff'}}>{post.caption}</div>}
                      {post.hashtags&&<div style={{fontSize:12,color:'#f08ac5'}}>{post.hashtags}</div>}
                      <div style={{width:'100%',borderRadius:12,overflow:'hidden',background:'#111',display:'grid',placeItems:'center'}}>{post.media_type==='video'?<video src={post.media_url} controls playsInline style={{width:'100%',maxHeight:520,objectFit:'contain'}}/>:<img src={post.media_url} alt={post.caption||'Publicação'} style={{width:'100%',maxHeight:520,objectFit:'contain'}}/>}</div>
                      <div style={{fontSize:10,color:'#c5b4d1'}}>{new Date(post.created_at).toLocaleString('pt-AO')}</div>
                    </article>)}
                  </div>
                ) : (
                  <div style={{position:'absolute',inset:0,overflowY:'auto',background:'#1A0B2E',padding:'max(14px,env(safe-area-inset-top)) 12px calc(100px + env(safe-area-inset-bottom))',color:'#fff'}}>
                    <div style={{position:'sticky',top:0,zIndex:5,background:'#1A0B2E',paddingBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                        <div style={{display:'flex',gap:6}}>
                          <button type="button" onClick={()=>setExploreTab('Explorar')} style={{border:0,borderRadius:20,padding:'8px 13px',background:'transparent',color:'#ddd',fontSize:12,fontWeight:850}}>Explorar</button>
                          <button type="button" style={{border:0,borderRadius:20,padding:'8px 13px',background:'#fff',color:'#15121b',fontSize:12,fontWeight:950}}>Descoberta</button>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button aria-label="Mensagens" type="button" onClick={()=>selectNav('Mensagens')} style={{width:36,height:36,border:'1px solid rgba(255,255,255,.18)',borderRadius:50,background:'rgba(30,15,43,.7)',color:'#fff'}}><Icon name="message" size={17}/></button>
                          <button aria-label="Notificações" type="button" onClick={()=>setNotice('Notificações da Mídia Talaza.')} style={{width:36,height:36,border:'1px solid rgba(255,255,255,.18)',borderRadius:50,background:'rgba(30,15,43,.7)',color:'#fff'}}><Icon name="bell" size={17}/></button>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:7,overflowX:'auto',marginTop:10}}>
                        {['Todos',...discoveryLanguages].map(lang=><button key={lang} type="button" onClick={()=>setDiscoveryLanguage(lang)} style={{flexShrink:0,border:discoveryLanguage===lang?'1px solid #ff55aa':'1px solid rgba(255,255,255,.24)',borderRadius:20,padding:'7px 12px',background:discoveryLanguage===lang?'#ff3fa3':'rgba(30,15,43,.58)',color:'#fff',fontSize:11,fontWeight:850}}>{lang}</button>)}
                      </div>
                    </div>
                    {mediaPosts.filter(post=>discoveryLanguage==='Todos'||post.language===discoveryLanguage).length===0
                      ? <div style={{padding:'45px 16px',textAlign:'center',color:'#d7c9df'}}>{mediaDataLoading?'A carregar publicações…':'Ainda não há publicações profissionais nesta descoberta'}</div>
                      : mediaPosts.filter(post=>discoveryLanguage==='Todos'||post.language===discoveryLanguage).map(post=>{
                        const author=mediaSuggestions.find(person=>person.user_id===post.user_id);
                        return <article key={'discovery-'+post.id} style={{marginTop:12,padding:12,borderRadius:16,background:'#2b103b',border:'1px solid #45245b',display:'grid',gap:10}}>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            <div style={{width:42,height:42,borderRadius:50,background:'#eee',overflow:'hidden',display:'grid',placeItems:'center',color:'#555'}}>{author?.avatar_url?<img src={author.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:String(author?.display_name||'').trim().split(/\\s+/).map(p=>p[0]).join('').slice(0,2)}</div>
                            <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:900}}>{author?.display_name || (post.user_id===user?.id?displayName:'')}</div><div style={{fontSize:11,color:'#c8b6d2'}}>@{author?.username || (post.user_id===user?.id?rawUsername:'')} · {post.language||''}</div></div>
                            {author&&<button type="button" onClick={()=>toggleMediaFollow(author.user_id)} style={{border:0,borderRadius:18,padding:'7px 12px',background:mediaFollowIds.includes(author.user_id)?'#482451':'#ff3fa3',color:'#fff',fontSize:11,fontWeight:900}}>{mediaFollowIds.includes(author.user_id)?'Seguindo':'Seguir'}</button>}
                          </div>
                          {post.caption&&<div style={{fontSize:13,lineHeight:1.5}}>{post.caption}</div>}
                          {post.media_type==='video'?<video src={post.media_url} controls playsInline style={{width:'100%',maxHeight:'62vh',objectFit:'contain',background:'#000',borderRadius:12}}/>:<img src={post.media_url} alt={post.caption||'Publicação'} style={{width:'100%',maxHeight:'62vh',objectFit:'contain',background:'#000',borderRadius:12}}/>}
                        </article>;
                      })}
                  </div>
                )}
              </div>
            )}
            {activeNav === 'Fã clube' && (
  <div style={{position:'absolute',inset:0,background:'#FFFFFF',color:'#000000',overflowY:'auto',padding:'max(14px,env(safe-area-inset-top)) 16px calc(92px + env(safe-area-inset-bottom))',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",textAlign:'left'}}>
    <div style={{maxWidth:520,margin:'0 auto'}}>
      {fanclubScreen === 'overview' ? (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
            <button type="button" aria-label="Voltar" onClick={()=>setActiveNav('Início')} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:24,display:'grid',placeItems:'center'}}>‹</button>
            <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Meu fã clube</div>
          </div>
          <div style={{fontSize:18,color:'#666666',lineHeight:1.5,marginBottom:16}}>Publique, acompanhe os fãs e ouça a opinião deles.</div>

          <div style={{display:'grid',gap:16}}>
            <button type="button" onClick={()=>{setFanclubScreen('sendPost');setFanclubPostMedia([]);setFanclubPostDescription('');setCaptureMode('Foto');setFanclubFeedback('');}} style={{height:130,padding:20,border:0,borderRadius:24,background:'#F2F2F2',display:'flex',alignItems:'center',gap:16,textAlign:'left',width:'100%'}}>
              <div style={{width:72,height:72,flex:'0 0 72px',borderRadius:20,background:'#FF5FA8',display:'grid',placeItems:'center',color:'#fff'}}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
              </div>
              <div style={{minWidth:0}}><div style={{fontSize:22,fontWeight:950,color:'#000'}}>Enviar post</div><div style={{fontSize:16,color:'#666',lineHeight:1.4,marginTop:5}}>Até 10 imagens ou 1 vídeo, com descrição.</div></div>
            </button>
            <button type="button" onClick={()=>{setFanclubScreen('myFanclub');setFanclubViewTab('Publicações');setFanclubFeedback('');}} style={{height:130,padding:20,border:0,borderRadius:24,background:'#F2F2F2',display:'flex',alignItems:'center',gap:16,textAlign:'left',width:'100%'}}>
              <div style={{width:72,height:72,flex:'0 0 72px',borderRadius:20,background:'#7A3DFF',display:'grid',placeItems:'center',color:'#fff'}}><Icon name="people" size={32}/></div>
              <div style={{minWidth:0}}><div style={{fontSize:22,fontWeight:950,color:'#000'}}>Ver meu fã clube</div><div style={{fontSize:16,color:'#666',lineHeight:1.4,marginTop:5}}>Publicações, reações, comentários e resultados das enquetes.</div></div>
            </button>
            <button type="button" onClick={()=>{setFanclubScreen('poll');setFanclubPollQuestion('');setFanclubPollMedia(null);setFanclubPollOptions(['','']);setFanclubFeedback('');}} style={{height:130,padding:20,border:0,borderRadius:24,background:'#F2F2F2',display:'flex',alignItems:'center',gap:16,textAlign:'left',width:'100%'}}>
              <div style={{width:72,height:72,flex:'0 0 72px',borderRadius:20,background:'#FFD966',display:'grid',placeItems:'center',color:'#000'}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19h16M6 16V9M12 16V5M18 16v-4"/></svg></div>
              <div style={{minWidth:0}}><div style={{fontSize:22,fontWeight:950,color:'#000'}}>Fazer enquete</div><div style={{fontSize:16,color:'#666',lineHeight:1.4,marginTop:5}}>Pergunta, imagem ou vídeo e as opções que quiser.</div></div>
            </button>
          </div>
        </div>
      ) : fanclubScreen === 'sendPost' ? (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <button type="button" aria-label="Voltar" onClick={()=>setFanclubScreen('overview')} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:24,display:'grid',placeItems:'center'}}>‹</button>
            <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Enviar post</div>
          </div>
          <div style={{display:'flex',gap:12,marginBottom:12}}>
            <button type="button" onClick={()=>setCaptureMode('Foto')} style={{flex:1,padding:'12px 10px',border:captureMode==='Foto'?'1px solid #ddd':'0',borderRadius:24,background:captureMode==='Foto'?'#fff':'#F2F2F2',color:captureMode==='Foto'?'#000':'#666',fontSize:18,fontWeight:900}}>Imagens</button>
            <button type="button" onClick={()=>{setCaptureMode('Vídeo');setFanclubPostMedia([]);}} style={{flex:1,padding:'12px 10px',border:captureMode==='Vídeo'?'1px solid #ddd':'0',borderRadius:24,background:captureMode==='Vídeo'?'#fff':'#F2F2F2',color:captureMode==='Vídeo'?'#000':'#666',fontSize:18,fontWeight:900}}>Vídeo</button>
          </div>
          <div style={{fontSize:17,color:'#666',marginBottom:12}}>{captureMode==='Foto'?'Até 10 imagens por post':'1 vídeo por post'} · {fanclubPostMedia.length}/{captureMode==='Foto'?10:1}</div>
          <input type="file" accept={captureMode==='Foto'?'image/*':'video/*'} multiple={captureMode==='Foto'} onChange={e=>{const chosen=Array.from(e.target.files||[]);if(!chosen.length)return;const picked=captureMode==='Foto'?chosen.filter(f=>f.type.startsWith('image/')).slice(0,10-fanclubPostMedia.length):chosen.filter(f=>f.type.startsWith('video/')).slice(0,1);setFanclubPostMedia(prev=>captureMode==='Foto'?[...prev,...picked].slice(0,10):picked);e.target.value='';}} style={{display:'none'}} id="fanclubPostMediaInput"/>
          <button type="button" onClick={()=>document.getElementById('fanclubPostMediaInput')?.click()} style={{width:140,height:140,border:2,borderStyle:'dashed',borderColor:'#FF2E7A',borderRadius:20,background:'#fff',color:'#666',display:'grid',placeContent:'center',gap:6,fontWeight:900,fontSize:18,marginBottom:12}}>
            <span style={{fontSize:32,lineHeight:1}}>＋</span><span>Adicionar</span>
          </button>
          {fanclubPostMedia.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {fanclubPostMedia.map((file,i)=><div key={file.name+'-'+i} style={{aspectRatio:'1/1',borderRadius:12,overflow:'hidden',background:'#eee',position:'relative'}}>
              {file.type.startsWith('video/')?<video src={URL.createObjectURL(file)} muted playsInline style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<img src={URL.createObjectURL(file)} alt={file.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              <button type="button" aria-label="Remover mídia" onClick={()=>setFanclubPostMedia(prev=>prev.filter((_,j)=>j!==i))} style={{position:'absolute',top:5,right:5,width:24,height:24,border:0,borderRadius:50,background:'rgba(0,0,0,.65)',color:'#fff'}}>×</button>
            </div>)}
          </div>}
          <div style={{fontSize:19,fontWeight:950,color:'#000',margin:'24px 0 10px'}}>Descrição</div>
          <textarea value={fanclubPostDescription} onChange={e=>setFanclubPostDescription(e.target.value)} placeholder="Escreva algo para os seus fãs" style={{width:'100%',height:130,resize:'vertical',border:0,borderRadius:20,padding:16,background:'#F2F2F2',color:'#000',fontSize:18,outline:'none'}}/>
          <button type="button" disabled={!fanclubPostMedia.length} onClick={()=>{const timestamp=Date.now();const posts=fanclubPostMedia.map((file,i)=>({id:timestamp+i,url:URL.createObjectURL(file),type:file.type.startsWith('video/')?'video':'image',caption:fanclubPostDescription,tags:'',fanclub:true}));setPublishedMedia(prev=>[...posts,...prev]);setFanclubFeedback('Publicação enviada para o teu fã clube.');setFanclubPostMedia([]);setFanclubPostDescription('');setFanclubScreen('overview');}} style={{width:'100%',height:64,marginTop:24,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:950}}>Publicar</button>
        </div>
      ) : fanclubScreen === 'myFanclub' ? (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
            <button type="button" aria-label="Voltar" onClick={()=>{setFanclubScreen('overview');setFanclubFeedback('');}} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:24,display:'grid',placeItems:'center'}}>‹</button>
            <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Ver meu fã clube</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',borderBottom:'1px solid #eee',marginBottom:16}}>
            {['Publicações','Enquetes'].map(tab=><button key={tab} type="button" onClick={()=>setFanclubViewTab(tab)} style={{position:'relative',border:0,background:'transparent',padding:'12px 4px',fontSize:19,fontWeight:fanclubViewTab===tab?900:500,color:fanclubViewTab===tab?'#000':'#888'}}>{tab} · {tab==='Publicações'?publishedMedia.filter(p=>p.fanclub).length+2:publishedPolls.length+1}{fanclubViewTab===tab&&<span style={{position:'absolute',left:0,right:0,bottom:0,height:4,background:'#FF2E7A',borderRadius:4}}/>}</button>)}
          </div>
          {fanclubViewTab==='Publicações'?(
            <div style={{display:'grid',gap:16}}>
              <article style={{padding:12,borderRadius:24,background:'#F2F2F2',display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:56,height:56,borderRadius:50,background:'linear-gradient(135deg,#8ddc82,#17603a)'}}/>
                  <div><div style={{fontSize:18,fontWeight:950,color:'#000'}}>Mara Kiala <span style={{color:'#46aaff',fontSize:12}}>✓</span> <span style={{color:'#d9a72e'}}>♛</span></div><div style={{fontSize:15,color:'#888'}}>há 3 h</div></div>
                </div>
                <div style={{fontSize:18,color:'#000'}}>Novo refrão: o que acham?</div>
                <div style={{height:280,borderRadius:14,background:'linear-gradient(135deg,#ff9b38,#ff58a8)',position:'relative',display:'grid',placeItems:'center',color:'#fff',fontWeight:900}}><span style={{position:'absolute',top:12,right:12,padding:'6px 10px',borderRadius:20,background:'rgba(0,0,0,.65)',fontSize:15}}>4 fotos</span><span style={{fontSize:30}}>♪</span></div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                  {['♡ 210','♨ 98','☆ 57','◉ 3'].map(label=><button key={label} type="button" onClick={()=>setFanclubFeedback('Reação registada: '+label)} style={{height:40,border:'1px solid #ddd',borderRadius:24,background:'#fff',color:'#000',fontSize:13,fontWeight:800}}>{label}</button>)}
                </div>
                <div style={{fontSize:16,color:'#000'}}>Dalva N. Perfeito!</div>
              </article>
              {publishedMedia.filter(pub=>pub.fanclub).map(pub=><article key={pub.id} style={{padding:12,borderRadius:24,background:'#F2F2F2',display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:56,height:56,borderRadius:50,background:'linear-gradient(135deg,#8ddc82,#17603a)'}}/><div><div style={{fontSize:18,fontWeight:950,color:'#000'}}>Mara Kiala</div><div style={{fontSize:15,color:'#888'}}>agora</div></div></div>
                {pub.caption&&<div style={{fontSize:18,color:'#000'}}>{pub.caption}</div>}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{pub.type==='video'?<video controls src={pub.url} style={{gridColumn:'span 3',width:'100%',maxHeight:360,borderRadius:12}}/>:<img src={pub.url} alt={pub.caption||'Post'} style={{gridColumn:'span 3',width:'100%',maxHeight:360,objectFit:'contain',borderRadius:12}}/>}</div>
                <div style={{display:'flex',justifyContent:'space-around',color:'#777'}}><button type="button" onClick={()=>setFanclubFeedback('Gostaste da publicação.')} style={{border:0,background:'transparent',color:'#333'}}>♡ Gosto</button><button type="button" onClick={()=>setFanclubFeedback('Comentários da publicação.')} style={{border:0,background:'transparent',color:'#333'}}>Comentar</button><button type="button" onClick={()=>setFanclubFeedback('Publicação partilhada.')} style={{border:0,background:'transparent',color:'#333'}}>Partilhar</button></div>
              </article>)}
            </div>
          ):(
            <div style={{display:'grid',gap:16}}>
              <article style={{padding:16,borderRadius:24,background:'#F2F2F2',display:'grid',gap:12}}>
                <div style={{fontSize:18,fontWeight:950,color:'#000'}}>Qual single sai primeiro?</div>
                <div style={{height:140,borderRadius:16,background:'linear-gradient(135deg,#7a3dff,#ff5fa8)',display:'grid',placeItems:'center',color:'#fff',fontSize:28}}>♪</div>
                {['Afrobeat','Kizomba'].map((option,i)=><button key={option} type="button" onClick={()=>setFanclubFeedback('Voto registado em '+option)} style={{padding:13,borderRadius:18,border:'1px solid #ddd',background:'#fff',color:'#000',textAlign:'left',fontSize:16,fontWeight:800}}>{option}<span style={{float:'right',color:'#888'}}>{i===0?'62%':'38%'}</span></button>)}
                <div style={{fontSize:13,color:'#888'}}>Enquete · 1.250 votos</div>
              </article>
              {publishedPolls.map(poll=><article key={poll.id} style={{padding:16,borderRadius:24,background:'#F2F2F2',display:'grid',gap:12}}>
                <div style={{fontSize:18,fontWeight:950,color:'#000'}}>{poll.question}</div>
                {poll.mediaUrl&&<img src={poll.mediaUrl} alt="Mídia da enquete" style={{width:'100%',maxHeight:220,objectFit:'contain',borderRadius:14}}/>}
                {poll.options.map((option,i)=><button key={option} type="button" onClick={()=>setFanclubFeedback('Voto registado: '+option)} style={{padding:13,borderRadius:18,border:'1px solid #ddd',background:'#fff',color:'#000',textAlign:'left',fontSize:16,fontWeight:800}}>{option}</button>)}
                <div style={{fontSize:13,color:'#888'}}>Enquete · votos a aparecerão aqui</div>
              </article>)}
            </div>
          )}
          {fanclubFeedback&&<div role="status" style={{marginTop:16,padding:12,borderRadius:14,background:'#fce8f2',color:'#8a164e',fontSize:14,fontWeight:800}}>{fanclubFeedback}</div>}
        </div>
      ) : (
        <div style={{height:'calc(100dvh - 110px)',display:'flex',flexDirection:'column'}}>
          <div style={{position:'sticky',top:0,zIndex:5,background:'#FFFFFF',display:'flex',alignItems:'center',gap:12,paddingTop:2,paddingBottom:12}}>
            <button type="button" aria-label="Voltar" onClick={()=>setFanclubScreen('overview')} style={{width:48,height:48,border:0,borderRadius:50,background:'#F2F2F2',color:'#000',fontSize:24,display:'grid',placeItems:'center',flexShrink:0}}>‹</button>
            <div style={{fontSize:28,fontWeight:950,color:'#000'}}>Fazer enquete</div>
          </div>
          <div style={{overflowY:'auto',flex:1,paddingBottom:16}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:19,fontWeight:950,color:'#000',marginBottom:8}}>Pergunta principal</div>
              <textarea value={fanclubPollQuestion} onChange={e=>setFanclubPollQuestion(e.target.value)} placeholder="Ex.: Qual single sai primeiro?" style={{width:'100%',height:100,resize:'vertical',border:0,borderRadius:20,padding:16,background:'#F2F2F2',color:'#000',fontSize:18,outline:'none'}}/>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:19,fontWeight:950,color:'#000',marginBottom:10}}>Imagem ou vídeo (opcional)</div>
              <input type="file" accept="image/*,video/*" id="fanclubPollMediaInput" onChange={e=>{const f=e.target.files?.[0];if(f)setFanclubPollMedia({file:f,url:URL.createObjectURL(f)});e.target.value='';}} style={{display:'none'}}/>
              <button type="button" onClick={()=>document.getElementById('fanclubPollMediaInput')?.click()} style={{width:'100%',height:220,border:'2px dashed #7A3DFF',borderRadius:20,background:'#fff',color:'#666',display:'grid',placeContent:'center',gap:8,fontSize:18,fontWeight:900}}>
                {fanclubPollMedia?<img src={fanclubPollMedia.url} alt="Pré-visualização da mídia da enquete" style={{width:'100%',height:180,objectFit:'contain',borderRadius:14}}/>:<><Icon name="photo" size={28}/><span>Escolher imagem ou vídeo</span></>}
              </button>
            </div>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:19,fontWeight:950,color:'#000',marginBottom:12}}>Opções</div>
              <div style={{display:'grid',gap:12}}>
                {fanclubPollOptions.map((option,i)=><div key={'polloption-'+i} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:24,color:'#D9A400',fontSize:22,fontWeight:950}}>{String.fromCharCode(65+i)}</div>
                  <input value={option} onChange={e=>setFanclubPollOptions(prev=>prev.map((v,j)=>j===i?e.target.value:v))} placeholder={'Opção '+String.fromCharCode(65+i)} style={{flex:1,minWidth:0,height:60,border:0,borderRadius:20,padding:'0 16px',background:'#F2F2F2',color:'#000',fontSize:18,outline:'none'}}/>
                </div>)}
                {fanclubPollOptions.length<6&&<button type="button" onClick={()=>setFanclubPollOptions(prev=>[...prev,''])} style={{height:60,border:0,borderRadius:20,background:'#F2F2F2',color:'#000',fontSize:20,fontWeight:950}}>＋ Adicionar opção {String.fromCharCode(65+fanclubPollOptions.length)}</button>}
              </div>
            </div>
            <button type="button" disabled={!fanclubPollQuestion.trim()||fanclubPollOptions.filter(o=>o.trim()).length<2} onClick={()=>{const poll={id:Date.now(),question:fanclubPollQuestion.trim(),mediaUrl:fanclubPollMedia?.url||'',options:fanclubPollOptions.map(o=>o.trim()).filter(Boolean)};setPublishedPolls(prev=>[poll,...prev]);setFanclubPollQuestion('');setFanclubPollMedia(null);setFanclubPollOptions(['','']);setFanclubViewTab('Enquetes');setFanclubScreen('myFanclub');setFanclubFeedback('Enquete publicada no teu fã clube.');}} style={{width:'100%',height:64,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:950,opacity:fanclubPollQuestion.trim()&&fanclubPollOptions.filter(o=>o.trim()).length>=2?1:.55}}>Publicar enquete</button>
          </div>
        </div>
      )}
    </div>
  </div>
            )}
            {activeNav === 'Fã clube' && (
              <>
              <div>
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
            {activeNav === 'Mensagens' && (
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
            )}
            {notice && (
              <div style={{ maxWidth: 300 }}>
                <div style={{ width: 58, height: 58, borderRadius: 50, margin: '0 auto 15px', display: 'grid', placeItems: 'center', border: '1px solid rgba(32,180,122,.6)', color: '#20B47A', background: 'rgba(10,40,27,.5)' }}><Icon name={activeNav === 'Mensagens' ? 'message' : activeNav === 'Perfil' ? 'user' : 'people'} size={26} /></div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{activeNav}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.68)', lineHeight: 1.6 }}>{notice}</p>
                <button type="button" onClick={() => { setActiveNav('Início'); setNotice(''); }} style={{ border: '1px solid #20B47A', borderRadius: 22, background: 'rgba(32,180,122,.12)', color: '#fff', padding: '9px 18px', fontWeight: 800, cursor: 'pointer' }}>Voltar ao feed</button>
              </div>
            )}
            {!notice && activeNav === 'Início' && (
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

        {plansOpen && <div role="dialog" aria-modal="true" aria-label="Planos da MÍDIA TALAZA" style={{position:'fixed',inset:0,zIndex:45,background:'#fff',color:'#111',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",overflowY:'auto',padding:'max(20px,env(safe-area-inset-top)) 18px max(24px,env(safe-area-inset-bottom))'}}>
          <div style={{maxWidth:520,margin:'0 auto'}}>
            <button type="button" onClick={()=>setPlansOpen(false)} style={{border:0,borderRadius:12,padding:'9px 14px',background:'#F2F2F2',color:'#111',fontWeight:900}}>‹ Voltar ao perfil</button>
            <h2 style={{fontSize:25,fontWeight:950,margin:'22px 0 8px'}}>Planos da MÍDIA TALAZA</h2>
            <p style={{fontSize:13,color:'#666',lineHeight:1.5}}>Escolhe um plano para desbloquear as funcionalidades profissionais após pagamento e aprovação da Administração.</p>
            {mediaPlanLoading ? <p>A carregar planos…</p> : mediaPlan ? <article style={{marginTop:18,padding:18,borderRadius:18,border:'1px solid #ead9a5',background:'#fffaf0'}}>
              <div style={{fontSize:18,fontWeight:950}}>{mediaPlan.name}</div>
              <div style={{fontSize:27,fontWeight:950,marginTop:10}}>{Number(mediaPlan.price).toLocaleString('pt-AO')} Kz</div>
              <div style={{fontSize:13,color:'#666'}}>{mediaPlan.duration_days} dias</div>
              <p style={{fontSize:13,lineHeight:1.6,color:'#444'}}>Acesso às funcionalidades profissionais após confirmação do pagamento e aprovação administrativa.</p>
              <button type="button" onClick={()=>router.push('/media-pagamento?plan_id='+mediaPlan.id)} style={{width:'100%',border:0,borderRadius:12,padding:13,background:'#FF2E7A',color:'#fff',fontWeight:950}}>Aderir</button>
            </article> : <p>Não existe um plano profissional ativo disponível.</p>}
          </div>
        </div>}
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
          {createStep===3 && selectedMedia && <div style={{position:'absolute',inset:0,overflowY:'auto',background:'#1A0B2E',padding:'max(14px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom))',display:'flex',flexDirection:'column',gap:18}}><div style={{display:'flex',alignItems:'center',gap:12}}><button type="button" onClick={()=>setCreateStep(2)} style={{width:42,height:42,border:0,borderRadius:50,background:'#2A1A4A',color:'#fff',fontSize:23}}>‹</button><div style={{fontSize:26,fontWeight:900}}>Nova publicação</div></div><div style={{height:260,borderRadius:'0 0 24px 24px',background:'#fff',display:'grid',placeItems:'center',overflow:'hidden'}}>{selectedMedia.type==='video'?<video src={selectedMedia.url} controls playsInline style={{width:'80%',maxHeight:'100%',objectFit:'contain'}}/>:<img src={selectedMedia.url} alt="Mídia escolhida" style={{width:'80%',maxHeight:'100%',objectFit:'contain'}}/>}</div><div style={{display:'grid',gap:8}}><label style={{color:'#aaa',fontSize:18,fontWeight:900}}>Legenda</label><textarea value={captionText} onChange={e=>setCaptionText(e.target.value)} placeholder="Escreva uma legenda" style={{height:120,resize:'vertical',border:0,borderRadius:20,padding:16,background:'#2A1A4A',color:'#fff',fontSize:18,outline:'none'}}/></div><div style={{display:'grid',gap:9}}><label style={{color:'#aaa',fontSize:18,fontWeight:900}}>Hashtags</label><input value={hashtagText} onChange={e=>setHashtagText(e.target.value)} placeholder="#fãclube #angola" style={{height:60,border:0,borderRadius:20,padding:'0 16px',background:'#2A1A4A',color:'#fff',fontSize:18,outline:'none'}}/><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{['#fãclube','#angola','#música'].map(tag=><button key={tag} type="button" onClick={()=>setHashtagText(v=>(v.trim()+' '+tag).trim())} style={{border:0,borderRadius:22,padding:'9px 4px',background:'#2A1A4A',color:'#fff',fontSize:14}}>{tag}</button>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>{['#novo','#bastidores'].map(tag=><button key={tag} type="button" onClick={()=>setHashtagText(v=>(v.trim()+' '+tag).trim())} style={{border:0,borderRadius:22,padding:'9px 4px',background:'#2A1A4A',color:'#fff',fontSize:14}}>{tag}</button>)}</div></div><button type="button" onClick={async()=>{
              if(!user?.id||!temAcessoPremium){setNotice('A publicação profissional exige plano ativo e aprovação da Administração.');return;}
              try{
                const extension=(selectedMedia.file?.name||'').split('.').pop()?.toLowerCase()|| (selectedMedia.type==='video'?'mp4':'jpg');
                const path=user.id+'/'+Date.now()+'.'+extension;
                const {error:uploadError}=await supabase.storage.from('media-posts').upload(path,selectedMedia.file,{upsert:false,contentType:selectedMedia.file?.type||undefined});
                if(uploadError)throw uploadError;
                const {data:publicMedia}=supabase.storage.from('media-posts').getPublicUrl(path);
                const {error:insertError}=await supabase.from('media_posts').insert({user_id:user.id,media_url:publicMedia.publicUrl,media_type:selectedMedia.type==='video'?'video':'image',caption:captionText.trim()||null,hashtags:hashtagText.trim()||null,language:mediaProfile?.interface_language||null,status:'published'});
                if(insertError){await supabase.storage.from('media-posts').remove([path]);throw insertError;}
                const {data:posts,error:postsError}=await supabase.from('media_posts').select('id,user_id,media_url,media_type,caption,hashtags,language,created_at').eq('status','published').order('created_at',{ascending:false});
                if(postsError)throw postsError;
                setMediaPosts(posts||[]);
                setCreateOpen(false);setCreateStep(1);setActiveNav('Explorar');setExploreTab('Explorar');setCaptionText('');setHashtagText('');setSelectedMedia(null);setNotice('Publicação guardada.');
              }catch(error){console.error('Erro ao publicar na Mídia:',error);setNotice('Não foi possível publicar: '+error.message);}
            }} style={{marginTop:'auto',width:'100%',height:64,border:0,borderRadius:20,background:'#FF2E7A',color:'#fff',fontSize:22,fontWeight:900}}>Publicar</button></div>}
        </div>}
      </main>
    </>
  );
}
