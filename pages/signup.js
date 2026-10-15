import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function onPickAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(userId) {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (signUpError) throw signUpError;
      let userId = signUpData.user?.id;
      let session = signUpData.session;

      // se não veio sessão (confirm email ligado), tenta logar
      if (!session) {
        const { data: loginData } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        session = loginData.session;
        userId = loginData.user?.id || userId;
      }

      if (!userId) throw new Error('Não foi possível criar a conta');

      const avatarUrl = await uploadAvatar(userId);

      await supabase.from('profiles').upsert({
        id: userId,
        name: fullName.trim(),
        avatar_url: avatarUrl,
      }, { onConflict: 'id' });

      router.push('/mensagens');
    } catch (err) {
      setError(err.message || 'Erro ao criar conta');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F5F7F6', padding:24, display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:26, padding:28 }}>
        <h1 style={{ color:'#075B4E' }}>Criar conta</h1>

        <form onSubmit={handleSubmit}>
          {/* FOTO REDONDA TIPO WHATSAPP */}
          <div style={{ display:'flex', justifyContent:'center', margin:'18px 0' }}>
            <label htmlFor="avatar" style={{ cursor:'pointer', position:'relative' }}>
              <div style={{ width:110, height:110, borderRadius:'50%', background:'#EAF4F1', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'3px solid #D5DEDB' }}>
                {avatarPreview? <img src={avatarPreview} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:42 }}>📷</span>}
              </div>
              <div style={{ position:'absolute', bottom:0, right:0, background:'#075B4E', color:'#fff', width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>+</div>
            </label>
            <input id="avatar" type="file" accept="image/*" onChange={onPickAvatar} style={{ display:'none' }} />
          </div>
          <p style={{ textAlign:'center', fontSize:12, color:'#66736F', marginTop:-8 }}>Toque para adicionar foto</p>

          <label style={labelStyle}>Seu nome</label>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} required style={inputStyle} />

          <label style={labelStyle}>E-mail</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={inputStyle} />

          <label style={labelStyle}>Palavra-passe</label>
          <div style={{ position:'relative' }}>
            <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} style={{...inputStyle, paddingRight:44}} />
            <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:8, top:8, height:36, width:36, border:'none', background:'#EEF4F1', borderRadius:8, cursor:'pointer' }}>{showPass?'🙈':'👁️'}</button>
          </div>

          {error && <div style={{ marginTop:14, background:'#FFF1F0', color:'#9B2C2C', padding:12, borderRadius:12, fontSize:13 }}>{error}</div>}

          <button disabled={loading} style={{ width:'100%', marginTop:18, padding:14, borderRadius:13, border:'none', background:'#075B4E', color:'#fff', fontWeight:800 }}>{loading?'Criando...':'Criar conta'}</button>
        </form>

        <Link href="/login" style={{ display:'block', textAlign:'center', marginTop:14, color:'#075B4E', fontWeight:700, textDecoration:'none' }}>Já tenho uma conta</Link>
      </div>
    </div>
  );
}
const inputStyle = { width:'100%', marginTop:6, padding:13, borderRadius:12, border:'1px solid #D5DEDB' };
const labelStyle = { display:'block', marginTop:14, fontWeight:700, color:'#17342F', fontSize:13 };
