import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MensagensPage() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [texto, setTexto] = useState('');
  const [msgs, setMsgs] = useState([
    { id: 1, t: 'Olá! Bem-vindo ao Talaza 💚', me: false },
  ]);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setAuthenticated(Boolean(data?.session?.user));
      setLoading(false);
    }
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setAuthenticated(Boolean(session?.user));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function enviar() {
    if (!texto.trim()) return;
    setMsgs([...msgs, { id: Date.now(), t: texto, me: true }]);
    setTexto('');
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>A verificar...</div>;
  }

  if (!authenticated) {
    return (
      <main style={{ minHeight: '60vh', padding: '32px 20px 120px', background: '#F8F6F3' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 24, borderRadius: 22, background: '#fff', border: '1px solid #E5E9E7' }}>
          <h1 style={{ color: '#083F35', marginTop: 0 }}>Mensagens Talaza</h1>
          <p>Inicie sessão para aceder às suas conversas.</p>
        </div>
      </main>
    );
  }

  // PAINEL ESTILO WHATSAPP - IGUAL AO SEU PRINT
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#E5DDD5' }}>
      <div style={{ background: '#fff', height: 60, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, borderBottom: '1px solid #e0d8cc' }}>
        <div style={{ width: 38, height: 38, background: '#0B4A3A', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700 }}>T</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Talaza - Apoio</div>
          <div style={{ fontSize: 11, color: '#666' }}>Online • Conta empresarial</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <div style={{ background: '#fff', margin: '10px auto', padding: '4px 10px', borderRadius: 8, fontSize: 12, width: 'fit-content' }}>Hoje</div>
        <div style={{ background: '#DCF8C6', borderRadius: 8, padding: '10px 12px', margin: '8px 0', fontSize: 13, maxWidth: '85%', boxShadow: '0 1px 1px rgba(0,0,0,.1)' }}>
          Esta empresa usa um serviço seguro da Meta para gerir esta conversa.
        </div>
        {msgs.map(m => (
          <div key={m.id} style={{
            background: m.me ? '#DCF8C6' : '#fff',
            padding: '8px 10px', borderRadius: 8, margin: '6px 0',
            maxWidth: '80%', marginLeft: m.me ? 'auto' : 0,
            fontSize: 14, boxShadow: '0 1px 1px rgba(0,0,0,.1)'
          }}>{m.t}</div>
        ))}
      </div>

      <div style={{ background: '#F0F0F0', padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 24, height: 44, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
          <span>☺</span>
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            placeholder="Mensagem"
            style={{ flex: 1, border: 'none', outline: 'none', marginLeft: 8, fontSize: 15 }}
          />
          <span>📎</span>
          <span style={{ marginLeft: 8 }}>📷</span>
        </div>
        <button onClick={enviar} style={{ width: 44, height: 44, borderRadius: '50%', background: '#25D366', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
          {texto ? '➤' : '🎤'}
        </button>
      </div>
    </div>
  );
}

// Esconde a barra de baixo nesta página
MensagensPage.showMessageDock = false;
