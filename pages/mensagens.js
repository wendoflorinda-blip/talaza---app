
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Mensagens() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      setAuthenticated(!error && Boolean(data?.session?.user));
      setLoading(false);
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setAuthenticated(Boolean(session?.user));
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <main
      style={{
        minHeight: '60vh',
        padding: '32px 20px 120px',
        background: '#F8F6F3',
        color: '#17211F',
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: 24,
          border: '1px solid #E5E9E7',
          borderRadius: 22,
          background: '#FFFFFF',
        }}
      >
        <h1 style={{ color: '#083F35', marginTop: 0 }}>
          Mensagens Talaza
        </h1>

        {loading ? (
          <p>A verificar a sessão...</p>
        ) : !authenticated ? (
          <p>
            Inicie sessão para aceder às suas conversas. O painel completo
            será apresentado quando os componentes de mensagens estiverem
            ligados à base de dados.
          </p>
        ) : (
          <p>
            A sessão está ativa. Estamos a preparar a ligação ao painel de
            conversas.
          </p>
        )}
      </div>
    </main>
  );
}
