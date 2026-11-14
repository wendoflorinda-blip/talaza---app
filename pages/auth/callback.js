import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const started = useRef(false);
  const [message, setMessage] = useState('A confirmar o teu email…');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || started.current) return;
    started.current = true;

    async function finishConfirmation() {
      try {
        const params = new URLSearchParams(window.location.search);
        const authError = params.get('error_description') || params.get('error');
        if (authError) throw new Error(decodeURIComponent(authError.replace(/\+/g, ' ')));

        // supabase-js processes the implicit-flow tokens from the URL fragment.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const session = sessionData?.session;
        if (!session?.user) {
          throw new Error('Não foi possível concluir a confirmação. Abre novamente o link recebido no email.');
        }

        const user = session.user;
        const metadata = user.user_metadata || {};
        const signupType = metadata.talaza_pending_signup_type;

        if (signupType === 'seller') {
          const pending = metadata.talaza_pending_seller;
          if (!pending?.name || !pending?.phone || !pending?.country_id) {
            throw new Error('Os dados pendentes do vendedor estão incompletos. Contacta o suporte Talaza.');
          }

          // A confirmação do email NÃO cria nem ativa perfil/negócio.
          setMessage('Email confirmado. Vamos continuar o cadastro do teu negócio…');
          await router.replace('/post-business?resume=1');
          return;
        }

        if (signupType === 'creator' || metadata.media_creator_onboarding === true) {
          const pendingCreator = metadata.talaza_pending_creator || metadata;
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              ...pendingCreator,
              media_creator_onboarding: true,
              media_account_type: 'creator',
              talaza_pending_signup_type: null,
              talaza_pending_creator: null,
            },
          });
          if (updateError) throw updateError;
          setMessage('Email confirmado. A abrir a MÍDIA TALAZA…');
          await router.replace('/media');
          return;
        }

        if (signupType === 'explorer') {
          const pending = metadata.talaza_pending_explorer;
          if (!pending?.name || !pending?.country_id || !pending?.province_id) {
            throw new Error('Os dados pendentes do explorador estão incompletos. Contacta o suporte Talaza.');
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: user.id,
                name: pending.name,
                country_id: pending.country_id,
                province_id: pending.province_id,
                account_type: 'explorador',
              },
              { onConflict: 'id' }
            );
          if (profileError) throw profileError;

          if (pending.phone) {
            const { error: phoneError } = await supabase
              .from('profiles')
              .update({ phone: pending.phone })
              .eq('id', user.id);
            if (phoneError) console.warn('Telefone do explorador não guardado:', phoneError);
          }

          const { error: clearError } = await supabase.auth.updateUser({
            data: {
              talaza_pending_signup_type: null,
              talaza_pending_explorer: null,
            },
          });
          if (clearError) console.warn('Não foi possível limpar os dados pendentes:', clearError);

          try {
            localStorage.setItem('talaza_country_id', String(pending.country_id));
            localStorage.setItem('talaza_province_id', String(pending.province_id));
            localStorage.setItem('talaza_home_country_id', String(pending.country_id));
            localStorage.setItem('talaza_home_province_id', String(pending.province_id));
          } catch {}

          setMessage('Email confirmado. A abrir a tua Vitrine Talaza…');
          await router.replace({
            pathname: '/explore',
            query: {
              country: pending.country_id,
              province: pending.province_id,
              homeCountry: pending.country_id,
              homeProvince: pending.province_id,
            },
          });
          return;
        }

        throw new Error('Não foi possível identificar o tipo de cadastro associado a este email.');
      } catch (err) {
        console.error('Erro no callback de confirmação Talaza:', err);
        setError(err?.message || 'Não foi possível confirmar o email. Tenta novamente.');
        setMessage('Não foi possível concluir a confirmação.');
      }
    }

    finishConfirmation();
  }, [router.isReady]);

  return (
    <>
      <Head>
        <title>Confirmação de email | TALAZA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#F8F6F3',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: 460,
            boxSizing: 'border-box',
            padding: '38px 30px',
            borderRadius: 22,
            background: '#FFFFFF',
            boxShadow: '0 16px 48px rgba(8,63,53,.10)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              margin: '0 auto 18px',
              borderRadius: 18,
              display: 'grid',
              placeItems: 'center',
              background: '#E8F3EF',
              color: '#0F6E5C',
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            T
          </div>
          <div
            style={{
              color: '#0F6E5C',
              fontSize: 13,
              letterSpacing: 4,
              fontWeight: 900,
            }}
          >
            TALAZA
          </div>
          <h1 style={{ color: '#17211F', fontSize: 25, margin: '18px 0 10px' }}>
            Confirmação de email
          </h1>
          <p style={{ color: '#596560', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {message}
          </p>
          {error && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: 13,
                borderRadius: 12,
                background: '#FFF0F1',
                color: '#B93845',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}
          {error && (
            <button
              type="button"
              onClick={() => router.replace('/login')}
              style={{
                width: '100%',
                marginTop: 18,
                padding: 14,
                border: 0,
                borderRadius: 12,
                background: '#0F6E5C',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Ir para entrar
            </button>
          )}
        </section>
      </main>
    </>
  );
}
