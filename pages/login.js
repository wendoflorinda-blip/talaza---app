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
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data, error: lErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (lErr) throw lErr;
      const user = data.user;
      const { data: profile } = await supabase.from('profiles').select('id, account_type, country_id, province_id').eq('id', user.id).maybeSingle();
      if (!profile) throw new Error('Sem perfil. Contacte suporte.');
      const q = { country: profile.country_id, province: profile.province_id };
      if (profile.account_type === 'vendedor') {
        const { data: business } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle();
        await router.replace({ pathname: business? '/vendedor' : '/post-business', query: q });
      } else {
        await router.replace({ pathname: '/explore', query: q });
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <main style={{ maxWidth: 440, margin: '0 auto', padding: 24 }}>
      <Link href="/" style={{ color: '#0F6E5C', textDecoration: 'none' }}>← Talaza</Link>
      <h1 style={{ marginTop: 24 }}>Entrar</h1>
      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
        <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={field}/></label>
        <label>Palavra-passe
          <div style={{ position: 'relative' }}>
            <input type={showPass? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required style={{...field, paddingRight: 42 }} />
            <span onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: 16, cursor: 'pointer' }}>{showPass? '🙈' : '👁️'}</span>
          </div>
        </label>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btn}>{loading? 'A entrar...' : 'Entrar'}</button>
      </form>
      <p style={{ marginTop: 18, fontSize: 14 }}>Ainda não tem conta? <Link href="/signup?type=cliente">Criar conta</Link></p>
    </main>
  );
}
const field = { display: 'block', width: '100%', marginTop: 6, padding: '12px', border: '1px solid #E5E9E7', borderRadius: 10 };
const btn = { border: 0, borderRadius: 10, padding: 14, background: '#0F6E5C', color: 'white', fontWeight: 700, cursor: 'pointer' };
