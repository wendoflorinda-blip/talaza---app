import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import TalazaMenu from '../components/TalazaMenu';

const C = { green: '#0F6E5C', dark: '#083F35', bg: '#F8F6F3', ink: '#17211F', muted: '#66736F', line: '#E5E9E7', white: '#FFFFFF', purple: '#7252B8' };

export default function Notificacoes() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data?.user) {
        router.replace('/login');
        return;
      }
      setUser(data.user);
      const { data: rows, error: queryError } = await supabase
        .from('notifications')
        .select('id, title, body, type, created_at, user_id')
        .or(`user_id.is.null,user_id.eq.${data.user.id}`)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (queryError) {
        setError('Não foi possível carregar as notificações. Confirme se a tabela notifications e as políticas RLS foram configuradas.');
      } else {
        setItems(rows || []);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  return (
    <main style={S.page}>
      <Head><title>Notificações | Talaza</title></Head>
      <header style={S.header}>
        <button type="button" onClick={() => router.back()} style={S.back}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={S.brand}>TALAZA</div>
          <h1 style={S.heading}>Notificações</h1>
          <p style={S.subheading}>Avisos e mensagens da equipa Talaza.</p>
        </div>
        <TalazaMenu />
      </header>
      <section style={S.content}>
        {loading ? <div style={S.empty}>A carregar notificações…</div> :
          error ? <div role="alert" style={S.error}>{error}</div> :
          items.length === 0 ? <div style={S.empty}><div style={S.icon}>♧</div><h2>Está tudo em dia</h2><p>Quando a Talaza enviar um aviso geral ou uma mensagem para si, ela aparecerá aqui.</p></div> :
          <div style={S.list}>{items.map(item => (
            <article key={item.id} style={S.card}>
              <div style={S.cardTop}><span style={S.badge}>{item.type === 'general' || !item.user_id ? 'Aviso geral' : 'Mensagem privada'}</span><time style={S.date}>{item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : ''}</time></div>
              <h2 style={S.title}>{item.title}</h2>
              <p style={S.body}>{item.body}</p>
            </article>
          ))}</div>
        }
      </section>
    </main>
  );
}

const S = {
  page: { minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'Arial, Helvetica, sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '18px max(18px, calc((100vw - 900px) / 2))', background: C.dark, color: C.white },
  back: { border: '1px solid rgba(255,255,255,.25)', borderRadius: 10, background: 'transparent', color: C.white, width: 38, height: 38, fontSize: 27, cursor: 'pointer' },
  brand: { color: '#E6B22B', fontSize: 11, fontWeight: 900, letterSpacing: 2 },
  heading: { margin: '5px 0 0', fontSize: 24 },
  subheading: { margin: '5px 0 0', color: 'rgba(255,255,255,.76)', fontSize: 13 },
  content: { width: '100%', maxWidth: 900, boxSizing: 'border-box', margin: '0 auto', padding: '28px 18px 60px' },
  list: { display: 'grid', gap: 13 },
  card: { background: C.white, border: '1px solid ' + C.line, borderRadius: 18, padding: 20, boxShadow: '0 5px 20px rgba(0,0,0,.035)' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  badge: { display: 'inline-flex', padding: '6px 9px', borderRadius: 99, background: '#F1ECFA', color: C.purple, fontSize: 11, fontWeight: 800 },
  date: { color: C.muted, fontSize: 11 },
  title: { margin: '14px 0 8px', fontSize: 18, color: C.dark },
  body: { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65, color: '#44534E', fontSize: 14 },
  empty: { background: C.white, border: '1px solid ' + C.line, borderRadius: 18, padding: 35, textAlign: 'center', color: C.muted },
  icon: { margin: '0 auto', display: 'grid', placeItems: 'center', width: 55, height: 55, borderRadius: 17, background: '#E8F3F0', color: C.green, fontSize: 26 },
  error: { padding: 15, borderRadius: 12, background: '#FCEBED', color: '#B93845', lineHeight: 1.5 },
};
