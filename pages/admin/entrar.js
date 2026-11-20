import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AdminStoreLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin-store/entrar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;
      await router.replace('/admin/painel');
    } catch (e) { setError(e.message || 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  }

  return <>
    <Head><title>Entrar — Loja administrativa Talaza</title><meta name="robots" content="noindex,nofollow" /></Head>
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f8f5', padding: 18, fontFamily: 'Arial,sans-serif' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box', background: '#fff', border: '1px solid #e3e9e5', borderRadius: 18, padding: 26 }}>
        <div style={{ color: '#0b4937', fontWeight: 900, letterSpacing: 3 }}>TALAZA</div>
        <h1 style={{ color: '#18392f' }}>Loja administrativa</h1>
        <p style={{ color: '#64736c' }}>Entre com o seu username e palavra-passe.</p>
        <label style={{ display: 'block', margin: '16px 0 6px', fontWeight: 700 }}>Username</label>
        <input required autoCapitalize="none" autoCorrect="off" value={username} onChange={e => setUsername(e.target.value)} style={field} />
        <label style={{ display: 'block', margin: '16px 0 6px', fontWeight: 700 }}>Palavra-passe</label>
        <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={field} />
        {error && <p role="alert" style={{ color: '#a3212c', background: '#fff0f0', padding: 11, borderRadius: 8 }}>{error}</p>}
        <button disabled={loading} style={{ width: '100%', marginTop: 20, padding: 14, border: 0, borderRadius: 10, background: '#0b4937', color: '#fff', fontWeight: 800 }}>{loading ? 'A entrar…' : 'Entrar'}</button>
        <p style={{ textAlign: 'center', fontSize: 13 }}><a href="/admin/cadastro" style={{ color: '#0b4937' }}>Criar loja administrativa</a></p>
      </form>
    </main>
  </>;
}
const field = { width: '100%', boxSizing: 'border-box', padding: 13, border: '1px solid #dfe7e2', borderRadius: 9, fontSize: 15 };
