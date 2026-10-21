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

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const { data: { user: current }, error: authError } = await supabase.auth.getUser();
      if (authError || !current) { await router.replace('/login'); return; }
      setUser(current);
      setEmail(current.email || '');
      const { data: ownedBusiness, error: ownedBusinessError } = await supabase.from('businesses').select('id').eq('owner_id', current.id).limit(1).maybeSingle();
      if (ownedBusinessError) console.warn('Não foi possível verificar o negócio associado:', ownedBusinessError);
      setHasBusiness(Boolean(ownedBusiness?.id));
      setFullName(current.user_metadata?.full_name || current.user_metadata?.name || '');
      setPhoto(current.user_metadata?.avatar_url || current.user_metadata?.picture || '');

      const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', current.id).maybeSingle();
      if (profileError) throw profileError;
      setProfile(data || null);
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
        if (detail.includes('bucket not found') || detail.includes('not found')) throw new Error('A fotografia não foi enviada porque o bucket “avatars” não existe ou tem outro nome no Supabase. Abra Storage e confirme que existe um bucket chamado exatamente avatars.');
        if (detail.includes('row-level security') || detail.includes('permission') || detail.includes('unauthorized') || detail.includes('not allowed')) throw new Error('A fotografia não foi enviada porque as regras de segurança do Storage estão a bloquear esta conta. No Supabase, abra Storage → avatars → Policies e permita ao utilizador autenticado enviar ficheiros apenas para a pasta com o seu próprio ID.');
        throw new Error('O Supabase recusou o envio da fotografia: ' + (uploadError.message || 'erro não identificado') + '. Verifique o bucket avatars e as respetivas políticas de Storage.');
      }
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = publicData?.publicUrl || '';
      if (!url) throw new Error('A fotografia foi enviada, mas o Supabase não devolveu o endereço da imagem. Confirme se o bucket avatars é público ou configure uma URL assinada.');
      const updates = {};
      if (profile && Object.prototype.hasOwnProperty.call(profile,'avatar_url')) updates.avatar_url = url;
      else if (profile && Object.prototype.hasOwnProperty.call(profile,'photo_url')) updates.photo_url = url;
      else if (profile && Object.prototype.hasOwnProperty.call(profile,'photo')) updates.photo = url;
      else throw new Error('A imagem foi enviada, mas não encontrei uma coluna de fotografia compatível na tabela profiles. Confirme se existe avatar_url.');
      const { error: profileUpdateError } = await supabase.from('profiles').update(updates).eq('id',user.id);
      if (profileUpdateError) throw new Error('A fotografia foi enviada para o Storage, mas não foi possível guardar o endereço na tabela profiles: ' + profileUpdateError.message);
      const { error: metadataError } = await supabase.auth.updateUser({ data:{ ...(user.user_metadata || {}), avatar_url:url } });
      if (metadataError) console.warn('A fotografia foi guardada no perfil, mas os metadados de autenticação não foram atualizados:',metadataError);
      setPhoto(url); setFile(null); setProfile(current => current ? {...current,...updates} : current);
      setNotice('Fotografia de perfil atualizada com sucesso. Não precisa de abrir “Editar perfil” nem de guardar o formulário.');
    } catch (err) { console.error(err); setError(err.message || 'Não foi possível guardar a fotografia.'); }
    finally { setPhotoUploading(false); }
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
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={S.headerText}>O meu perfil</span>
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
          <span style={S.photoHelp}>{photoUploading ? 'A enviar fotografia…' : 'Toque no + para adicionar ou trocar a fotografia'}</span>
          <strong style={S.profileName}>{profile?.name || profile?.full_name || user?.user_metadata?.full_name || 'Perfil Talaza'}</strong>
          <span style={S.caption}>Explorar Talaza</span>
        </div>

        {menuOpen && <div style={S.menuPopup}><button type="button" onClick={() => { setEditing((value) => !value); setMenuOpen(false); setError(''); setNotice(''); }} style={S.menuAction}>{editing ? 'Cancelar edição' : 'Editar perfil'}</button></div>}

        {!editing ? (
          <div style={S.details}>
            <div><span style={S.detailLabel}>Nome</span><strong>{profile?.name || profile?.full_name || user?.user_metadata?.full_name || 'Não definido'}</strong></div>
            <div><span style={S.detailLabel}>E-mail</span><strong>{user?.email || 'Não definido'}</strong></div>
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
      </section>
    </main>
  );
}

const S = {
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
  passwordWrap:{position:'relative'},
  passwordToggle:{position:'absolute',right:8,top:7,bottom:7,border:0,borderRadius:8,padding:'0 10px',background:'#EEE8F5',color:C.purple,fontSize:12,fontWeight:800,cursor:'pointer'},
  profileName:{marginTop:14,fontSize:18},
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
