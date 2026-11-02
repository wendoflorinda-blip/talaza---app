import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import TalazaMenu from '../components/TalazaMenu';

const C = { green:'#08745F', dark:'#06483D', purple:'#64358B', gold:'#D8A319', ink:'#182722', muted:'#66736F', bg:'#F7F6F3', line:'#E3E8E4', white:'#FFFFFF', red:'#A52F3B' };

export default function Perfil() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [hasBusiness, setHasBusiness] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [savingEmailVisibility, setSavingEmailVisibility] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [photo, setPhoto] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inicio');
  const [savedBusinesses, setSavedBusinesses] = useState([]);
  const [savedBusinessUpdates, setSavedBusinessUpdates] = useState([]);
  const [provinceEvents, setProvinceEvents] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [unreadEventCount, setUnreadEventCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const requestedTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    if (['dados', 'guardados', 'novidades', 'eventos', 'parasi'].includes(requestedTab)) setActiveTab(requestedTab);
  }, [router.isReady, router.query.tab]);

  async function loadProfile() {
    try {
      const { data: { user: current }, error: authError } = await supabase.auth.getUser();
      if (authError || !current) { await router.replace('/login'); return; }
      setUser(current);
      setEmail(current.email || '');
      const { count: unreadNotifications, error: notificationError } = await supabase.from('notifications').select('id', { count:'exact', head:true }).eq('user_id', current.id).eq('is_read', false);
      if (notificationError) console.warn('Não foi possível carregar notificações pendentes:', notificationError);
      else setUnreadNotificationCount(unreadNotifications || 0);
      const { data: ownedBusiness, error: ownedBusinessError } = await supabase.from('businesses').select('id').eq('owner_id', current.id).limit(1).maybeSingle();
      if (ownedBusinessError) console.warn('Não foi possível verificar o negócio associado:', ownedBusinessError);
      setHasBusiness(Boolean(ownedBusiness?.id));
      setFullName(current.user_metadata?.full_name || current.user_metadata?.name || '');
      setPhoto(current.user_metadata?.avatar_url || current.user_metadata?.picture || '');

      const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', current.id).maybeSingle();
      if (profileError) throw profileError;
      setProfile(data || null);
      setShowEmail(data?.show_email === true);
      if (data?.province_id) {
        setLoadingSections(true);
        const [savedResult, eventsResult] = await Promise.all([
          supabase.from('saved_businesses').select('id,created_at,businesses(id,name,description,logo_url,cover_url,province_id,municipality,is_active,approval_status)').eq('user_id', current.id).order('created_at', { ascending:false }),
          supabase.from('events').select('id,user_id,title,description,image_url,video_url,location,starts_at,expires_at,province_id,created_at').eq('province_id', data.province_id).eq('status','published').eq('payment_status','paid').eq('admin_approved',true).gt('expires_at',new Date().toISOString()).order('starts_at',{ascending:true})
        ]);
        if (savedResult.error) console.warn('Não foi possível carregar os perfis guardados:', savedResult.error);
        else {
          const savedRows = (savedResult.data || []).filter(row => row.businesses);
          setSavedBusinesses(savedRows);
          const updateGroups = await Promise.all(savedRows.map(async row => {
            const business = row.businesses;
            if (!business?.is_active || business.approval_status !== 'approved') return [];
            const { data: updates, error: updatesError } = await supabase.from('business_updates')
              .select('id,business_id,media_path,media_type,created_at,expires_at')
              .eq('business_id', business.id).gt('expires_at',new Date().toISOString())
              .order('created_at',{ascending:false});
            if (updatesError) { console.warn('Novidades indisponíveis:',updatesError); return []; }
            return Promise.all((updates || []).map(async item => {
              const { data: signed, error } = await supabase.storage.from('business-updates').createSignedUrl(item.media_path,3600);
              return error ? null : {...item,signedUrl:signed?.signedUrl,businessName:business.name};
            }));
          }));
          setSavedBusinessUpdates(updateGroups.flat().filter(Boolean).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)));
        }
        if (eventsResult.error) console.warn('Não foi possível carregar os eventos da província principal:', eventsResult.error);
        else {
          const eventRows = eventsResult.data || [];
          setProvinceEvents(eventRows);
          try {
            const seenAt = localStorage.getItem('talaza_events_seen_' + current.id) || '';
            setUnreadEventCount(eventRows.filter(item => item.created_at && (!seenAt || new Date(item.created_at).getTime() > new Date(seenAt).getTime())).length);
          } catch { setUnreadEventCount(0); }
        }
        setLoadingSections(false);
      }
      if (data) {
        setFullName(data.name || data.full_name || current.user_metadata?.full_name || current.user_metadata?.name || '');
        setProvinceId(data.province_id || '');
        setPhone(String(data.phone || data.contact || data.whatsapp || ''));
        setPhoto(data.avatar_url || data.photo_url || data.photo || current.user_metadata?.avatar_url || current.user_metadata?.picture || '');
        if (data.country_id) {
          const { data: provinceRows, error: provinceError } = await supabase.from('provinces').select('id,name,country_id').eq('country_id', data.country_id).order('name');
          if (provinceError) throw provinceError;
          setProvinces(provinceRows || []);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar o perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function choosePhoto(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setError('Escolha um ficheiro de imagem.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB.'); return; }
    setFile(selected);
    setError('');
    setNotice('');
    setPhoto(URL.createObjectURL(selected));
  }

  async function uploadProfilePhotoImmediately(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setError('O ficheiro escolhido não é uma imagem. Escolha uma fotografia em JPG, PNG ou WebP.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('Esta fotografia tem mais de 5 MB. Escolha uma imagem menor e tente novamente.'); return; }
    if (!user) { setError('A sua sessão expirou. Entre novamente na Talaza antes de alterar a fotografia.'); return; }
    setPhotoUploading(true); setError(''); setNotice('');
    try {
      const ext = (selected.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = user.id + '/avatar-' + Date.now() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, selected, { upsert:true, contentType:selected.type, cacheControl:'3600' });
      if (uploadError) {
        console.error('Falha no upload da fotografia de perfil:', uploadError);
        const detail = String(uploadError.message || '').toLowerCase();
        if (detail.includes('bucket not found') || detail.includes('bucket does not exist')) throw new Error('O Supabase informa que o bucket “avatars” não foi encontrado neste projeto. Confirme o projeto Supabase ligado à Preview e o nome real do bucket antes de criar ou alterar qualquer configuração. Detalhe: ' + (uploadError.message || detail));
        if (detail.includes('row-level security') || detail.includes('permission') || detail.includes('unauthorized') || detail.includes('not allowed')) throw new Error('A fotografia não foi enviada porque as regras de segurança do Storage estão a bloquear esta conta. No Supabase, abra Storage → avatars → Policies e permita ao utilizador autenticado enviar ficheiros apenas para a pasta com o seu próprio ID.');
        throw new Error('O Supabase recusou o envio da fotografia: ' + (uploadError.message || 'erro não identificado') + '. Verifique o bucket avatars e as respetivas políticas de Storage.');
      }
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = publicData?.publicUrl || '';
      if (!url) throw new Error('A fotografia foi enviada, mas o Supabase não devolveu o endereço da imagem. Confirme se o bucket avatars é público ou configure uma URL assinada.');
      const photoColumn = profile && Object.prototype.hasOwnProperty.call(profile,'avatar_url') ? 'avatar_url'
        : profile && Object.prototype.hasOwnProperty.call(profile,'photo_url') ? 'photo_url'
        : profile && Object.prototype.hasOwnProperty.call(profile,'photo') ? 'photo'
        : 'avatar_url';
      const updates = { id:user.id, [photoColumn]:url };
      const displayName = profile?.name || profile?.full_name || fullName || user.user_metadata?.full_name || user.user_metadata?.name || String(user.email || '').split('@')[0] || 'Utilizador Talaza';
      if (profile && Object.prototype.hasOwnProperty.call(profile,'name')) updates.name = displayName;
      else if (profile && Object.prototype.hasOwnProperty.call(profile,'full_name')) updates.full_name = displayName;
      else updates.name = displayName;
      let countryId = profile?.country_id || '';
      let primaryProvinceId = profile?.province_id || '';
      try {
        countryId = countryId || localStorage.getItem('talaza_home_country_id') || localStorage.getItem('talaza_country_id') || '';
        primaryProvinceId = primaryProvinceId || localStorage.getItem('talaza_home_province_id') || localStorage.getItem('talaza_province_id') || '';
      } catch {}
      if (!profile && (!countryId || !primaryProvinceId)) {
        throw new Error('A fotografia foi carregada, mas a sua conta ainda não tem um perfil pessoal completo. Volte a entrar na Talaza e confirme o país e a província principal antes de tentar novamente.');
      }
      if (countryId) updates.country_id = countryId;
      if (primaryProvinceId) updates.province_id = primaryProvinceId;
      const { data: savedProfile, error: profileUpdateError } = await supabase.from('profiles').upsert(updates,{onConflict:'id'}).select('*').single();
      if (profileUpdateError) throw new Error('A imagem chegou ao armazenamento, mas não foi possível guardar a fotografia no perfil pessoal. Erro do Supabase: ' + profileUpdateError.message);
      if (!savedProfile) throw new Error('O Supabase não confirmou a gravação da fotografia no perfil pessoal. Tente novamente.');
      const { error: metadataError } = await supabase.auth.updateUser({ data:{ ...(user.user_metadata || {}), avatar_url:url } });
      if (metadataError) console.warn('A fotografia foi guardada no perfil, mas os metadados de autenticação não foram atualizados:',metadataError);
      setPhoto(url); setFile(null); setProfile(current => ({...(current || {}),...updates}));
      setNotice('Fotografia de perfil atualizada com sucesso. Não precisa de abrir “Editar perfil” nem de guardar o formulário.');
    } catch (err) { console.error(err); setError(err.message || 'Não foi possível guardar a fotografia.'); }
    finally { setPhotoUploading(false); }
  }

  async function toggleEmailVisibility() {
    if (!user) return;
    const nextValue = !showEmail;
    setSavingEmailVisibility(true); setError(''); setNotice('');
    try {
      const { data, error:visibilityError } = await supabase.from('profiles').update({show_email:nextValue}).eq('id',user.id).select('id,show_email').maybeSingle();
      if (visibilityError) {
        const message = String(visibilityError.message || '');
        if (/show_email|column/i.test(message)) throw new Error('A coluna show_email não foi reconhecida nesta consulta do perfil pessoal. Como a opção já funciona no painel do vendedor, não crie outra coluna ainda: confirme se a Preview está ligada ao mesmo projeto Supabase e veja o detalhe técnico: ' + message);
        throw new Error('Não foi possível guardar a preferência de e-mail: ' + message);
      }
      if (!data) throw new Error('A preferência não foi guardada porque não foi encontrada a sua linha em profiles. Confirme se profiles.id corresponde ao ID da sua conta.');
      setShowEmail(data.show_email === true);
      setProfile(current => current ? {...current,show_email:data.show_email === true} : current);
      setNotice(data.show_email ? 'O seu e-mail ficará visível no perfil pessoal público.' : 'O seu e-mail ficará oculto no perfil pessoal público.');
    } catch (err) {
      console.error('Falha ao guardar visibilidade do e-mail:',err);
      setError(err.message || 'Não foi possível guardar a preferência de e-mail.');
    } finally { setSavingEmailVisibility(false); }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!user) throw new Error('Inicie sessão novamente para editar o perfil.');
      if (!fullName.trim()) throw new Error('Digite o seu nome.');
      let photoUrl = photo;

      if (file) {
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = user.id + '/' + Date.now() + '.' + extension;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) throw new Error('Não foi possível enviar a foto. Confirme se o bucket “avatars” está configurado no Supabase.');
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = data?.publicUrl || '';
      }

      const changingProvince = Boolean(profile?.province_id && provinceId && String(provinceId) !== String(profile.province_id));
      const changedAt = user.user_metadata?.talaza_province_changed_at;
      if (changingProvince && changedAt && Date.now() - new Date(changedAt).getTime() < 90 * 24 * 60 * 60 * 1000) {
        const availableDate = new Date(new Date(changedAt).getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT');
        throw new Error('A província principal só pode ser alterada novamente depois de 90 dias. Poderá alterar a partir de ' + availableDate + '.');
      }

      const updates = {};
      if (profile && Object.prototype.hasOwnProperty.call(profile, 'name')) updates.name = fullName.trim();
      else if (profile && Object.prototype.hasOwnProperty.call(profile, 'full_name')) updates.full_name = fullName.trim();
      if (profile && Object.prototype.hasOwnProperty.call(profile, 'phone')) updates.phone = phone.trim();
      else if (profile && Object.prototype.hasOwnProperty.call(profile, 'contact')) updates.contact = phone.trim();
      else if (profile && Object.prototype.hasOwnProperty.call(profile, 'whatsapp')) updates.whatsapp = phone.trim();
      if (changingProvince && Object.prototype.hasOwnProperty.call(profile, 'province_id')) updates.province_id = provinceId;
      if (photoUrl) {
        if (profile && Object.prototype.hasOwnProperty.call(profile, 'avatar_url')) updates.avatar_url = photoUrl;
        else if (profile && Object.prototype.hasOwnProperty.call(profile, 'photo_url')) updates.photo_url = photoUrl;
        else if (profile && Object.prototype.hasOwnProperty.call(profile, 'photo')) updates.photo = photoUrl;
      }

      if (Object.keys(updates).length) {
        const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (updateError) throw updateError;
      } else if (phone.trim()) {
        throw new Error('Não foi encontrado um campo de contacto compatível no perfil. Confirme a coluna de contacto na tabela profiles.');
      }

      const metadata = { ...(user.user_metadata || {}), full_name: fullName.trim() };
      if (photoUrl) metadata.avatar_url = photoUrl;
      if (changingProvince) metadata.talaza_province_changed_at = new Date().toISOString();
      const authUpdates = { data: metadata };
      const emailChanged = !hasBusiness && email.trim().toLowerCase() !== String(user.email || '').toLowerCase();
      if (emailChanged) authUpdates.email = email.trim().toLowerCase();
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) throw new Error('A nova palavra-passe deve ter pelo menos 6 caracteres.');
        authUpdates.password = newPassword.trim();
      }
      const { data: updated, error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
      if (authUpdateError) throw authUpdateError;
      if (updated?.user) setUser(updated.user);
      if (changingProvince) {
        try {
          localStorage.setItem('talaza_home_country_id', String(profile.country_id || ''));
          localStorage.setItem('talaza_home_province_id', String(provinceId));
          localStorage.setItem('talaza_country_id', String(profile.country_id || ''));
          localStorage.setItem('talaza_province_id', String(provinceId));
        } catch {}
      }
      if (profile) setProfile({ ...profile, ...updates });
      setPhoto(photoUrl);
      setFile(null);
      setNewPassword('');
      setShowPassword(false);
      setEditing(false);
      setNotice(emailChanged
        ? 'Perfil atualizado. A alteração do e-mail pode exigir confirmação na sua caixa de entrada.'
        : changingProvince
          ? 'Perfil atualizado. A Comunidade Talaza passa a usar a província principal escolhida. Só poderá voltar a mudar a província principal depois de 90 dias.'
          : 'Perfil atualizado com sucesso.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Não foi possível guardar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={S.center}>A carregar o perfil…</main>;

  const provinceName = provinces.find((item) => String(item.id) === String(profile?.province_id))?.name || 'Não definida';

  return (
    <main style={S.page}>
      <Head><title>O meu perfil | Talaza</title></Head>
      <header style={S.header}>
        <Link href="/" style={S.logo}><span style={S.mark}>T</span>TALAZA</Link>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <Link href={{ pathname:'/explore', query:{ ...(profile?.country_id ? { country:profile.country_id } : {}), ...(profile?.province_id ? { province:profile.province_id } : {}) } }} style={{ color:'#64358B', textDecoration:'none', fontWeight:800, fontSize:12, padding:'8px 10px', border:'1px solid #D9C6E9', borderRadius:10, background:'#F7F1FB' }}>← Voltar à Vitrine</Link>
          <span style={S.headerText}>O meu perfil</span>
          <button type="button" onClick={() => router.push('/notificacoes')} aria-label="Notificações" style={{...S.more,position:'relative'}}>♧{unreadNotificationCount > 0 && <span style={S.notificationBadge}>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}</button>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Opções do perfil" style={S.more}>•••</button>
          <TalazaMenu country={profile?.country_id} province={profile?.province_id} countryName="" provinceName="" />
        </div>
      </header>

      <section style={S.card}>
        <div style={S.avatarWrap}>
          <button type="button" onClick={() => fileRef.current?.click()} style={{ ...S.avatar, cursor: 'pointer' }} aria-label="Adicionar ou alterar fotografia do perfil" title="Adicionar ou alterar fotografia">
            {photo ? <img src={photo} alt="Fotografia do perfil" style={S.photo} /> : <span style={S.avatarPlaceholder}>♙</span>}
            <span style={S.photoBadge}>+</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadProfilePhotoImmediately} hidden />
          <strong style={S.profileName}>{profile?.name || profile?.full_name || user?.user_metadata?.full_name || 'Perfil Talaza'}</strong>
          <span style={S.caption}>{provinceName} · Comunidade Talaza</span>
        </div>
        <div style={S.stats}>
          <div style={S.stat}><strong>{savedBusinesses.length}</strong><span>Guardados</span></div>
          <div style={S.stat}><strong>0</strong><span>Para si</span></div>
          <div style={S.stat}><strong>{provinceEvents.length}</strong><span>Eventos</span></div>
        </div>
        <button type="button" onClick={() => {setActiveTab('dados');setEditing(true);setError('');setNotice('');}} style={S.editProfileButton}>✎　Editar perfil</button>

        {menuOpen && <div style={S.menuPopup}><button type="button" onClick={() => { setEditing((value) => !value); setMenuOpen(false); setError(''); setNotice(''); }} style={S.menuAction}>{editing ? 'Cancelar edição' : 'Editar perfil'}</button></div>}

      <nav aria-label="Secções do perfil" style={S.tabs}>
        {[
          ['dados','♙','Dados'],
          ['guardados','▱','Guardados'],
          ['novidades','✦','Novidades'],
          ['eventos','▣','Eventos'],
          ['parasi','✧','Para si']
        ].map(([id,icon,label]) => (
          <button key={id} type="button" onClick={() => {
            setActiveTab(id);
            if (id === 'eventos' && user) {
              try { localStorage.setItem('talaza_events_seen_' + user.id, new Date().toISOString()); } catch {}
              setUnreadEventCount(0);
            }
          }} aria-current={activeTab===id?'page':undefined}
            style={{...S.tab,borderBottom:activeTab===id?'3px solid '+C.gold:'3px solid transparent',color:activeTab===id?C.dark:C.muted}}>
            <span style={{position:'relative',fontSize:23,lineHeight:1.1}}>{icon}
              {id === 'eventos' && unreadEventCount > 0 && <span style={S.unreadBadge}>{unreadEventCount > 9 ? '9+' : unreadEventCount}</span>}
            </span><strong>{label}</strong>
          </button>
        ))}
      </nav>

        {activeTab === 'dados' && (
        <>
        {!editing ? (
          <div style={S.details}>
            <div><span style={S.detailLabel}>Nome</span><strong>{profile?.name || profile?.full_name || user?.user_metadata?.full_name || 'Não definido'}</strong></div>
            <div><span style={S.detailLabel}>E-mail de acesso</span><strong>{user?.email || 'Não definido'}</strong></div>
            <div style={S.emailVisibilityRow}>
              <div style={{flex:1,minWidth:0}}>
                <strong style={{display:'block',fontSize:13}}>Privacidade do e-mail</strong>
                <span style={S.help}>{showEmail ? 'O e-mail pode ser visto no seu perfil pessoal público.' : 'O e-mail fica oculto para outras pessoas.'}</span>
              </div>
              <button type="button" role="switch" aria-checked={showEmail} disabled={savingEmailVisibility} onClick={toggleEmailVisibility} style={{...S.visibilityToggle,background:showEmail?C.green:'#AAB4AF',opacity:savingEmailVisibility ? 0.6 : 1}}>{savingEmailVisibility?'…':showEmail?'Mostrar':'Ocultar'}</button>
            </div>
            <div><span style={S.detailLabel}>Contacto</span><strong>{phone || 'Não definido'}</strong></div>
            <div><span style={S.detailLabel}>Província principal e Comunidade</span><strong>{provinceName}</strong></div>
            <p style={S.help}>A província escolhida no menu serve para explorar negócios de outras regiões e não altera a província principal nem a sua Comunidade Talaza.</p>
          </div>
        ) : (
          <form onSubmit={saveProfile}>
            <label style={S.label} htmlFor="profile-name">Nome</label>
            <input id="profile-name" style={S.input} value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            <label style={S.label} htmlFor="profile-email">E-mail de acesso</label>
            <input id="profile-email" style={{ ...S.input, background:hasBusiness ? '#F0F2F1' : '#fff', color:hasBusiness ? '#66736F' : C.ink }} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} readOnly={hasBusiness} aria-readonly={hasBusiness} />
            {hasBusiness && <p style={S.help}>O seu e-mail é a credencial única da sua conta Talaza, usada para entrar no painel do negócio e explorar como cliente. Como esta conta tem um negócio associado, o e-mail de acesso não pode ser alterado nesta área. Assim evita perder o acesso ou criar confusão entre contas.</p>}
            <label style={S.label} htmlFor="profile-password">Nova palavra-passe (opcional)</label>
            <div style={S.passwordWrap}><input id="profile-password" style={{ ...S.input, paddingRight:94 }} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Deixe vazio para manter a atual" minLength={6} /><button type="button" onClick={() => setShowPassword(value => !value)} style={S.passwordToggle}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>
            <p style={S.help}>A palavra-passe atual nunca é mostrada. Este campo só altera a palavra-passe se escrever uma nova. Use Mostrar/Ocultar para a ver enquanto escreve.</p>
            <label style={S.label} htmlFor="profile-phone">Contacto</label>
            <input id="profile-phone" style={S.input} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Indicativo + número" />
            <label style={S.label} htmlFor="profile-province">Província principal</label>
            <select id="profile-province" style={S.input} value={provinceId} onChange={(event) => setProvinceId(event.target.value)} required>
              <option value="">Escolher província</option>
              {provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <p style={S.help}>A alteração muda a província da sua Comunidade Talaza. A província principal só pode ser alterada uma vez a cada 90 dias. Explorar outras províncias no menu não muda esta definição.</p>
            <p style={S.help}>Para mudar a fotografia, toque na imagem acima. O envio depende do bucket “avatars” no Supabase.</p>
            {error && <div role="alert" style={S.error}>{error}</div>}
            {notice && <div role="status" style={S.notice}>{notice}</div>}
            <button type="submit" disabled={saving} style={S.save}>{saving ? 'A guardar…' : 'Guardar alterações'}</button>
            <button type="button" onClick={() => { setEditing(false); setError(''); }} style={S.cancel}>Cancelar</button>
          </form>
        )}
        {!editing && error && <div role="alert" style={S.error}>{error}</div>}
        {!editing && notice && <div role="status" style={S.notice}>{notice}</div>}
        </>
        )}

      </section>



      {activeTab !== 'dados' && (
        <section style={S.sectionPanel}>
          {activeTab === 'guardados' && <>
            <h2 style={S.sectionTitle}>Perfis guardados</h2>
            <p style={S.sectionIntro}>Os negócios que guardar na Vitrine ficam reunidos aqui, só para si.</p>
            {loadingSections ? <p style={S.empty}>A carregar os seus guardados…</p> : savedBusinesses.length ? <div style={S.savedGrid}>
              {savedBusinesses.map(row => { const business=row.businesses; return <article key={row.id} style={S.savedCard}>
                {business.cover_url || business.logo_url ? <img src={business.cover_url || business.logo_url} alt="" style={S.savedImage}/> : <div style={S.savedImagePlaceholder}>T</div>}
                <div style={{padding:14}}><strong>{business.name || 'Negócio Talaza'}</strong><p style={S.cardDescription}>{business.description || 'Conheça este negócio na Vitrine Talaza.'}</p>
                <Link href={{ pathname:'/businesses/'+business.id, query:{ returnTo:'/perfil?tab=guardados' } }} style={S.openBusiness}>Ver perfil</Link></div>
              </article>; })}
            </div> : <div style={S.emptyCard}><span style={S.emptyIcon}>▱</span><strong>Ainda não guardou nenhum perfil</strong><p>Quando tocar em Guardar num negócio da Vitrine, ele aparecerá aqui.</p><Link href="/explore" style={S.openBusiness}>Explorar negócios</Link></div>}
          </>}
          {activeTab === 'novidades' && <>
            <h2 style={S.sectionTitle}>Novidades dos seus negócios favoritos</h2>
            <p style={S.sectionIntro}>Não perca as novidades dos seus negócios favoritos! Guarde os perfis dos negócios que mais lhe interessam e acompanhe as suas novas imagens, vídeos e atualizações nesta área. Sempre que publicarem uma novidade, poderá encontrá-la aqui. As atualizações são apresentadas apenas aos exploradores que guardaram o respetivo perfil.</p>
            {loadingSections ? <p style={S.empty}>A carregar Novidades…</p> : savedBusinessUpdates.length ? <div style={S.savedGrid}>
              {savedBusinessUpdates.map(item=><article key={item.id} style={S.savedCard}>
                {item.media_type==='video' ? <video src={item.signedUrl} controls playsInline style={{width:'100%',height:260,objectFit:'cover',background:'#111'}}/> : <img src={item.signedUrl} alt="Novidade do negócio" style={{width:'100%',height:260,objectFit:'cover'}}/>}
                <div style={{padding:14}}><strong>{item.businessName}</strong><p style={S.cardDescription}>Publicado em {new Date(item.created_at).toLocaleDateString('pt-PT')}</p><Link href={{pathname:'/businesses/'+item.business_id,query:{returnTo:'/perfil?tab=novidades'}}} style={S.openBusiness}>Ver perfil do negócio</Link></div>
              </article>)}
            </div> : <div style={S.emptyCard}><span style={S.emptyIcon}>✦</span><strong>Ainda não há Novidades para si</strong><p>Guarde os perfis dos negócios que mais lhe interessam para acompanhar novas imagens, vídeos e atualizações. Só verá publicações dos negócios que guardou.</p><Link href="/explore" style={S.openBusiness}>Explorar negócios</Link></div>}
          </>}
          {activeTab === 'eventos' && <>
            <h2 style={S.sectionTitle}>Eventos da sua província</h2>
            <p style={S.sectionIntro}>Aqui aparecem apenas eventos publicados, pagos e aprovados na sua província principal: {provinceName}.</p>
            {loadingSections ? <p style={S.empty}>A carregar eventos…</p> : provinceEvents.length ? <div style={S.savedGrid}>
              {provinceEvents.map(event => <article key={event.id} style={S.savedCard}>
                {event.video_url ? <video src={event.video_url} controls playsInline preload="metadata" style={S.savedImage} /> : event.image_url ? <img src={event.image_url} alt={event.title || 'Imagem do evento'} style={S.savedImage}/> : <div style={S.savedImagePlaceholder}>✦</div>}
                <div style={{padding:14}}>
                  <strong>{event.title}</strong>
                  <p style={S.cardDescription}>{event.description || event.location || 'Evento na sua província'}</p>
                  {event.starts_at && <small style={{display:'block',marginBottom:10,color:C.muted}}>Início: {new Date(event.starts_at).toLocaleString('pt-PT')}</small>}
                  {event.user_id ? (
                    <button
                      type="button"
                      disabled={String(event.user_id) === String(user?.id)}
                      onClick={() => router.push({
                        pathname:'/mensagens',
                        query:{
                          to:String(event.user_id),
                          source:'Eventos',
                          sourceId:String(event.id),
                          box:'explore',
                          returnTo:'/perfil'
                        }
                      })}
                      style={{...S.eventMessageButton,opacity:String(event.user_id) === String(user?.id) ? 0.55 : 1,cursor:String(event.user_id) === String(user?.id) ? 'not-allowed' : 'pointer'}}
                    >
                      ✉ Enviar mensagem ao organizador
                    </button>
                  ) : (
                    <button type="button" disabled style={{...S.eventMessageButton,opacity:0.55,cursor:'not-allowed'}}>
                      Mensagens indisponíveis
                    </button>
                  )}
                </div>
              </article>)}
            </div> : <div style={S.emptyCard}><span style={S.emptyIcon}>▣</span><strong>Ainda não há eventos publicados</strong><p>Quando houver eventos ativos e aprovados em {provinceName}, serão apresentados aqui.</p></div>}
          </>}
          {activeTab === 'parasi' && <div style={S.emptyCard}><span style={S.emptyIcon}>✧</span><strong>Recomendado para si</strong><p>Mais à frente, esta área apresentará recomendações personalizadas. Os destaques pagos terão identificação própria e só aparecerão enquanto estiverem ativos.</p></div>}
        </section>
      )}
    </main>
  );
}

const S = {
  stats:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',margin:'22px 0',borderTop:'1px solid '+C.line,borderBottom:'1px solid '+C.line},
  stat:{display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:'12px 3px',color:C.muted},
  editProfileButton:{width:'100%',padding:'14px 18px',border:0,borderRadius:14,background:C.gold,color:C.dark,fontWeight:900,fontSize:15,cursor:'pointer'},
  tabs:{maxWidth:700,margin:'20px auto 0',display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',background:C.bg,borderBottom:'1px solid '+C.line},
  notificationBadge:{position:'absolute',top:-6,right:-6,minWidth:17,height:17,padding:'0 4px',borderRadius:999,background:'#C43C45',color:'#FFFFFF',fontSize:10,fontWeight:900,display:'grid',placeItems:'center',border:'2px solid '+C.dark},
  unreadBadge:{position:'absolute',top:-7,right:-13,minWidth:18,height:18,padding:'0 4px',borderRadius:999,background:'#C43C45',color:'#FFFFFF',fontSize:10,fontWeight:900,display:'grid',placeItems:'center',border:'2px solid '+C.bg},
  eventMessageButton:{width:'100%',padding:'13px 16px',border:0,borderRadius:12,background:C.green,color:'#FFFFFF',fontSize:14,fontWeight:900,cursor:'pointer',boxShadow:'0 4px 12px rgba(8,116,95,.16)'},
  tab:{minWidth:0,minHeight:76,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:7,border:0,background:'transparent',fontSize:12,cursor:'pointer',padding:'8px 3px'},
  sectionPanel:{maxWidth:700,margin:'22px auto',padding:'22px',border:'1px solid '+C.line,borderRadius:22,background:C.white,boxShadow:'0 12px 34px rgba(20,50,43,.045)'},
  sectionTitle:{margin:'0 0 7px',fontSize:20,color:C.dark},
  sectionIntro:{margin:'0 0 18px',fontSize:13,lineHeight:1.6,color:C.muted},
  savedGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14},
  savedCard:{overflow:'hidden',border:'1px solid '+C.line,borderRadius:16,background:C.white},
  savedImage:{width:'100%',height:132,objectFit:'cover',display:'block',background:'#F0EEE8'},
  savedImagePlaceholder:{width:'100%',height:132,display:'grid',placeItems:'center',background:'linear-gradient(135deg,#E8E2D2,#F5F1E8)',color:C.dark,fontSize:35,fontWeight:900},
  cardDescription:{fontSize:12,lineHeight:1.5,color:C.muted,minHeight:36},
  openBusiness:{display:'inline-flex',marginTop:7,padding:'9px 14px',borderRadius:10,background:C.gold,color:C.dark,fontWeight:800,fontSize:12},
  emptyCard:{minHeight:210,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:22,border:'1px dashed #D8DED9',borderRadius:17,background:'#FBFCFA'},
  emptyIcon:{fontSize:34,color:C.gold,marginBottom:10},
  empty:{padding:20,textAlign:'center',color:C.muted,fontSize:13},
  page:{minHeight:'100vh',background:C.bg,paddingBottom:40,color:C.ink},
  center:{minHeight:'100vh',display:'grid',placeItems:'center',color:C.green,fontWeight:800},
  header:{minHeight:66,padding:'10px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:C.dark,color:C.white},
  logo:{display:'flex',alignItems:'center',gap:9,color:C.white,textDecoration:'none',fontSize:13,fontWeight:900,letterSpacing:2},
  mark:{display:'grid',placeItems:'center',width:33,height:33,borderRadius:11,background:C.gold,color:C.dark,fontSize:18,letterSpacing:0},
  headerText:{fontSize:13,fontWeight:700},
  more:{border:0,background:'rgba(255,255,255,.1)',color:'#fff',fontSize:20,fontWeight:900,cursor:'pointer',padding:'8px 10px',borderRadius:10},
  card:{maxWidth:500,margin:'28px auto',padding:25,border:'1px solid '+C.line,borderRadius:23,background:C.white,boxShadow:'0 14px 40px rgba(20,50,43,.06)'},
  avatarWrap:{display:'flex',alignItems:'center',flexDirection:'column',marginBottom:24},
  avatar:{position:'relative',width:104,height:104,border:0,borderRadius:'50%',background:'#F1ECFA',overflow:'visible',padding:0},
  photo:{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'},
  avatarPlaceholder:{display:'grid',placeItems:'center',width:'100%',height:'100%',fontSize:44,color:C.purple},
  photoBadge:{position:'absolute',right:-2,bottom:0,width:32,height:32,borderRadius:'50%',display:'grid',placeItems:'center',background:C.gold,color:C.dark,border:'3px solid white',fontWeight:900,fontSize:23},
  photoHelp:{marginTop:9,fontSize:11,color:C.muted,textAlign:'center'},
  emailVisibilityRow:{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderTop:'1px solid '+C.line},
  visibilityToggle:{flex:'0 0 auto',minWidth:76,border:0,borderRadius:999,padding:'9px 12px',color:'#fff',fontWeight:800,cursor:'pointer'},
  passwordWrap:{position:'relative'},
  passwordToggle:{position:'absolute',right:8,top:7,bottom:7,border:0,borderRadius:8,padding:'0 10px',background:'#EEE8F5',color:C.purple,fontSize:12,fontWeight:800,cursor:'pointer'},
  profileName:{marginTop:14,fontSize:21},
  caption:{marginTop:5,fontSize:12,color:C.muted},
  menuPopup:{display:'flex',justifyContent:'flex-end',marginBottom:14},
  menuAction:{padding:'10px 16px',border:'1px solid '+C.line,borderRadius:10,background:'#fff',color:C.purple,fontWeight:800,cursor:'pointer'},
  details:{display:'grid',gap:15,padding:17,borderRadius:15,background:'#F8F6FB',fontSize:13},
  detailLabel:{display:'block',color:C.muted,fontSize:11,marginBottom:4},
  label:{display:'block',margin:'16px 0 7px',fontSize:12,fontWeight:900,color:C.ink},
  input:{display:'block',boxSizing:'border-box',width:'100%',padding:14,border:'1px solid '+C.line,borderRadius:12,fontSize:14,outlineColor:C.purple,background:'#fff'},
  help:{fontSize:11,lineHeight:1.6,color:C.muted},
  save:{width:'100%',marginTop:14,padding:14,border:0,borderRadius:12,background:'linear-gradient(100deg,'+C.green+','+C.purple+')',color:'#fff',fontWeight:900,fontSize:14,cursor:'pointer'},
  cancel:{width:'100%',marginTop:9,padding:13,border:'1px solid '+C.line,borderRadius:12,background:'#fff',color:C.muted,fontWeight:800,cursor:'pointer'},
  error:{marginTop:12,padding:12,borderRadius:10,background:'#FFF0F0',color:C.red,fontSize:12,lineHeight:1.5},
  notice:{marginTop:12,padding:12,borderRadius:10,background:'#E7F5EE',color:C.dark,fontSize:12,lineHeight:1.5}
};
