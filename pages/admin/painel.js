import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AdminStoreDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { router.replace('/admin/entrar'); return; }
      const response = await fetch('/api/admin-store/me', { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!active) return;
      if (!response.ok) { setError(result.error || 'Não foi possível carregar a loja.'); setLoading(false); return; }
      setData(result); setLoading(false);
    }
    load().catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/entrar');
  }

  return <>
    <Head><title>Painel administrativo — Talaza</title><meta name="robots" content="noindex,nofollow" /></Head>
    <main style={{ minHeight: '100vh', background: '#f7f8f5', padding: 24, fontFamily: 'Arial,sans-serif', color: '#18392f' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 15 }}>
          <strong style={{ letterSpacing: 3, color: '#0b4937' }}>TALAZA</strong>
          <button onClick={logout} style={{ border: '1px solid #d5dfd9', borderRadius: 9, background: '#fff', padding: '9px 14px', cursor: 'pointer' }}>Terminar sessão</button>
        </header>
        <h1>Painel da loja administrativa</h1>
        {loading && <p>A carregar…</p>}
        {error && <p role="alert" style={{ background: '#fff0f0', color: '#a3212c', padding: 12, borderRadius: 9 }}>{error}</p>}
        {data && <section style={{ background: '#fff', border: '1px solid #e3e9e5', borderRadius: 16, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>{data.store.nome_da_loja}</h2>
          <p style={{ color: '#64736c' }}>@{data.store.username} · {data.store.country} — {data.store.province}</p>
          <p>{data.store.descricao || 'Sem descrição.'}</p>
          <p><strong>Município:</strong> {data.store.municipio}</p>
          <p><strong>Bairro:</strong> {data.store.bairro}</p>
          <p><strong>Telefone:</strong> {data.store.telefone}</p>
          <h3>Províncias de atuação</h3>
          <ul>{data.provinces.map((p, i) => <li key={i}>{p.province}, {p.country}</li>)}</ul>
          <p style={{ color: '#64736c', fontSize: 13 }}>Estado: loja administrativa vitalícia, enquanto a conta permanecer ativa.</p>
        </section>}
      </div>
    </main>
  </>;
}
