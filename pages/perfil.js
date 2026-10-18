import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import TalazaMenu from '../components/TalazaMenu';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const C = { green:'#08745F', dark:'#06483D', purple:'#64358B', gold:'#D8A319', ink:'#182722', muted:'#66736F', bg:'#F7F6F3', line:'#E3E8E4', white:'#FFFFFF', red:'#A52F3B' };

export default function Perfil() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [email,setEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [fullName,setFullName] = useState('');
  const [countryId,setCountryId] = useState('');
  const [provinceId,setProvinceId] = useState('');
  const [provinces,setProvinces] = useState([]);
  const [menuOpen,setMenuOpen] = useState(false);
  const [editing,setEditing] = useState(false);
  const [photo,setPhoto] = useState('');
  const [file,setFile] = useState(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');

  useEffect(() => { loadProfile(); }, []);
  async function loadProfile() {
    const { data: { user: current }, error: authError } = await supabase.auth.getUser();
    if (authError || !current) { router.replace('/login'); return; }
    setUser(current);
    setEmail(current.email || '');
    setFullName(current.user_metadata?.full_name || current.user_metadata?.name || '');
    setPhoto(current.user_metadata?.avatar_url || current.user_metadata?.picture || '');
    const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id',current.id).maybeSingle();
    if (profileError) {
      console.error(profileError);
      setError('Não foi possível carregar os dados do perfil.');
    } else if (data) {
      setProfile(data);
      setPhone(String(data.phone || data.contact || data.whatsapp || ''));
      setPhoto(data.avatar_url || data.photo_url || data.photo || current.user_metadata?.avatar_url || current.user_metadata?.picture || '');
    }
    setLoading(false);
  }
  function choosePhoto(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setError('Escolha um ficheiro de imagem.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB.'); return; }
    setFile(selected); setError(''); setNotice('');
    setPhoto(URL.createObjectURL(selected));
  }
  async function saveProfile(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      if (!user) throw new Error('Inicie sessão novamente para editar o perfil.');
      let photoUrl = photo;
      if (file) {
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
        const path = user.id + '/' + Date.now() + '.' + extension;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});
        if (uploadError) throw new Error('A foto não foi enviada. É necessário configurar o bucket público “avatars” e as respetivas permissões no Supabase antes de guardar a fotografia.');
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = data?.publicUrl || '';
      }
      const updates = {};\n      if (profile && Object.prototype.hasOwnProperty.call(profile, 'name')) updates.name = fullName.trim();\n      if (profile && Object.prototype.hasOwnProperty.call(profile, 'province_id') && provinceId && String(provinceId) !== String(profile.province_id)) {\n        const changedAt = user.user_metadata?.talaza_province_changed_at;\n        if (changedAt && Date.now() - new Date(changedAt).getTime() < 180 * 24 * 60 * 60 * 1000) {\n          throw new Error('A província principal só pode ser alterada novamente depois de seis meses.');\n        }\n        updates.province_id = provinceId;\n      }
      if (profile) {
        if (Object.prototype.hasOwnProperty.call(profile,'phone')) updates.phone = phone.trim();
        else if (Object.prototype.hasOwnProperty.call(profile,'contact')) updates.contact = phone.trim();
        else if (Object.prototype.hasOwnProperty.call(profile,'whatsapp')) updates.whatsapp = phone.trim();
        if (photoUrl) {
          if (Object.prototype.hasOwnProperty.call(profile,'avatar_url')) updates.avatar_url = photoUrl;
          else if (Object.prototype.hasOwnProperty.call(profile,'photo_url')) updates.photo_url = photoUrl;
          else if (Object.prototype.hasOwnProperty.call(profile,'photo')) updates.photo = photoUrl;
        }
      }
      if (Object.keys(updates).length) {
        const { error: updateError } = await supabase.from('profiles').update(updates).eq('id',user.id);
        if (updateError) throw updateError;
      } else if (phone.trim()) {
        throw new Error('A tabela profiles não apresenta um campo de contacto reconhecido. É necessário confirmar o nome da coluna no Supabase.');
      }
      const metadata = { ...(user.user_metadata || {}) };\n      if (fullName.trim()) metadata.full_name = fullName.trim();\n      if (profile?.province_id && String(provinceId) !== String(profile.province_id)) metadata.talaza_province_changed_at = new Date().toISOString();\n      const authUpdates = { data: { ...metadata, ...(photoUrl ? { avatar_url: photoUrl } : {}) } };
      if (email.trim().toLowerCase() !== String(user.email || '').toLowerCase()) authUpdates.email = email.trim().toLowerCase();
      const { data: updated, error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
      if (authUpdateError) throw authUpdateError;
      if (updated?.user) setUser(updated.user);\n      if (profile) setProfile({ ...profile, ...updates });\n      setEditing(false);
      if (photoUrl) setPhoto(photoUrl);
      setFile(null);
      setNotice(email.trim().toLowerCase() !== String(user.email || '').toLowerCase() ? 'Perfil atualizado. A alteração do e-mail pode exigir confirmação na sua caixa de entrada.' : 'Perfil atualizado com sucesso.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Não foi possível guardar as alterações.');
    } finally { setSaving(false); }
  }
  if (loading) return <main style={S.center}>A carregar o perfil…</main>;
  return <main style={S.page}>
    <Head><title>O meu perfil | Talaza</title></Head>
    <header style={S.header}><Link href="/" style={S.logo}><span style={S.mark}>T</span>TALAZA</Link><div style={{display:'flex',alignItems:'center',gap:12}}><span style={S.headerText}>O meu perfil</span><button type="button" onClick={()=>setMenuOpen(v=>!v)} aria-label="Opções do perfil" style={S.more}>•••</button><TalazaMenu country={profile?.country_id || countryId} province={profile?.province_id || provinceId} countryName="" provinceName="" /></div></header>
    <section style={S.card}>
      <div style={S.avatarWrap}>
        <button type="button" onClick={() => fileRef.current?.click()} style={S.avatar} aria-label="Alterar fotografia">
          {photo ? <img src={photo} alt="Fotografia do perfil" style={S.photo}/> : <span style={S.avatarPlaceholder}>♙</span>}
          <span style={S.photoBadge}>✎</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={choosePhoto} hidden />
        <strong style={S.profileName}>{profile?.name || profile?.full_name || user?.user_metadata?.full_name || 'Perfil Talaza'}</strong>
        <span style={S.caption}>Cliente ou vendedor Talaza</span>
      </div>
      <form onSubmit={saveProfile}>
        <label style={S.label} htmlFor="profile-email">E-mail</label>
        <input id="profile-email" style={S.input} type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" />
        <label style={S.label} htmlFor="profile-phone">Contacto</label>
        <input id="profile-phone" style={S.input} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Indicativo + número" />
        <p style={S.help}>Para alterar a fotografia, toque na imagem acima. A foto exige que o armazenamento de avatares esteja configurado no Supabase.</p>
        {error && <div role="alert" style={S.error}>{error}</div>}
        {notice && <div role="status" style={S.notice}>{notice}</div>}
        <button type="submit" disabled={saving} style={S.save}>{saving ? 'A guardar…' : 'Guardar alterações'}</button>
      </form>
      <button type="button" style={S.logout} onClick={async()=>{const {error:outError}=await supabase.auth.signOut({scope:'global'});if(outError){setError('Não foi possível terminar a sessão.');return;}await router.replace('/login');}}>Terminar sessão</button>
    </section>
  </main>;
}
const S={
 page:{minHeight:'100vh',background:C.bg,paddingBottom:40,color:C.ink},
 center:{minHeight:'100vh',display:'grid',placeItems:'center',color:C.green,fontWeight:800},
 header:{height:66,padding:'0 22px',display:'flex',alignItems:'center',justifyContent:'space-between',background:C.dark,color:C.white},
 logo:{display:'flex',alignItems:'center',gap:9,color:C.white,textDecoration:'none',fontSize:13,fontWeight:900,letterSpacing:2},
 mark:{display:'grid',placeItems:'center',width:33,height:33,borderRadius:11,background:C.gold,color:C.dark,fontSize:18,letterSpacing:0},
 headerText:{fontSize:13,fontWeight:700},\n more:{border:0,background:'transparent',color:'#fff',fontSize:22,fontWeight:900,cursor:'pointer',padding:'5px 8px'},\n menuPopup:{maxWidth:500,margin:'-20px auto 20px',display:'flex',justifyContent:'flex-end'},\n menuAction:{padding:'10px 16px',border:'1px solid '+C.line,borderRadius:10,background:'#fff',color:C.purple,fontWeight:800,cursor:'pointer'},\n profileDetails:{display:'grid',gap:13,marginBottom:22,padding:16,borderRadius:14,background:'#F8F6FB',color:C.ink,fontSize:13},\n detailLabel:{display:'block',color:C.muted,fontSize:11,marginBottom:4},
 card:{maxWidth:500,margin:'34px auto',padding:25,border:'1px solid '+C.line,borderRadius:23,background:C.white,boxShadow:'0 14px 40px rgba(20,50,43,.06)'},
 avatarWrap:{display:'flex',alignItems:'center',flexDirection:'column',marginBottom:28},
 avatar:{position:'relative',width:104,height:104,border:0,borderRadius:'50%',background:C.purpleSoft,overflow:'visible',padding:0,cursor:'pointer'},
 photo:{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'},
 avatarPlaceholder:{display:'grid',placeItems:'center',width:'100%',height:'100%',fontSize:44,color:C.purple},
 photoBadge:{position:'absolute',right:-2,bottom:0,width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center',background:C.gold,color:C.dark,border:'3px solid white',fontWeight:900},
 profileName:{marginTop:14,fontSize:18},
 caption:{marginTop:5,fontSize:12,color:C.muted},
 label:{display:'block',margin:'16px 0 7px',fontSize:12,fontWeight:900,color:C.ink},
 input:{display:'block',boxSizing:'border-box',width:'100%',padding:14,border:'1px solid '+C.line,borderRadius:12,fontSize:14,outlineColor:C.purple,background:'#fff'},
 help:{fontSize:11,lineHeight:1.6,color:C.muted},
 save:{width:'100%',marginTop:14,padding:14,border:0,borderRadius:12,background:'linear-gradient(100deg,'+C.green+','+C.purple+')',color:'#fff',fontWeight:900,fontSize:14,cursor:'pointer'},
 logout:{display:'block',margin:'17px auto 0',padding:10,border:0,background:'transparent',color:C.purple,fontWeight:800,cursor:'pointer'},
 error:{marginTop:12,padding:12,borderRadius:10,background:'#FFF0F0',color:C.red,fontSize:12,lineHeight:1.5},
 notice:{marginTop:12,padding:12,borderRadius:10,background:C.greenSoft,color:C.dark,fontSize:12,lineHeight:1.5}
};
