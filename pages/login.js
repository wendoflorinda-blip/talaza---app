import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      router.push('/mensagens');
    } catch (err) {
      setError('Não foi possível entrar. Verifique o e-mail e a palavra-passe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F5F7F6', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#fff', borderRadius:20, padding:28, boxShadow:'0 10px 40px rgba(0,0,0,.06)' }}>
        <div style={{ width:44, height:44, borderRadius:10, background:'#075B4E', color:'#F7C948', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900 }}>T</div>
        <h1 style={{ color:'#075B4E', margin:'14px 0 6px' }}>Entrar na Talaza</h1>
        <p style={{ color:'#66736F', fontSize:13, marginBottom:18 }}>Aceda à sua conta e continue exatamente de onde parou.</p>

        <form onSubmit={handleLogin}>
          <label style={labelStyle}>E-mail</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required style={inputStyle} />

          <label style={labelStyle}>Palavra-passe</label>
          <div style={{ position:'relative' }}>
            <input 
              type={showPass ? 'text' : 'password'} 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              required 
              style={{...inputStyle, paddingRight:44}} 
            />
            <button 
              type="button" 
              onClick={()=>setShowPass(!showPass)}
              style={{ position:'absolute', right:8, top:7, height:34, width:34, border:'none', background:'#EEF4F1', borderRadius:8, cursor:'pointer' }}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <div style={{ marginTop:12, background:'#FFF1F0', color:'#9B2C2C', padding:12, borderRadius:12, fontSize:13, lineHeight:1.4 }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ width:'100%', marginTop:16, padding:13, borderRadius:12, border:'none', background:'#075B4E', color:'#fff', fontWeight:800, cursor:'pointer' }}>
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
          <Link href="/signup" style={{ textAlign:'center', padding:11, borderRadius:12, border:'1px solid #075B4E', color:'#075B4E', textDecoration:'none', fontWeight:700, fontSize:13 }}>Criar conta</Link>
          <Link href="/" style={{ textAlign:'center', padding:11, borderRadius:12, background:'#F1F4F3', color:'#075B4E', textDecoration:'none', fontWeight:700, fontSize:13 }}>Voltar</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle = { width:'100%', boxSizing:'border-box', marginTop:6, padding:12, borderRadius:10, border:'1px solid #D5DEDB', fontSize:14 };
const labelStyle = { display:'block', marginTop:12, fontWeight:700, fontSize:13, color:'#17342F' };
