import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import { Card, Field, ErrorBox, PrimaryButton, PasswordField } from '../components/Fields';
import { C } from '../lib/talaza';

const INVALID_LINK_MESSAGE = 'Link expirado ou inválido. Pede outro link para recuperar a tua palavra-passe.';

export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    let mounted = true;
    let recoveryEventReceived = false;

    // Capturar os parâmetros antes de o cliente Auth limpar o fragmento do URL.
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = query.get('code');
    const flowType = query.get('type') || hash.get('type');
    const linkError = query.get('error_description') || query.get('error') ||
      hash.get('error_description') || hash.get('error');

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session?.access_token) {
        recoveryEventReceived = true;
        setReady(true);
        setError('');
        setChecked(true);
      }
    });

    async function validateRecoveryLink() {
      try {
        if (linkError) throw new Error('RECOVERY_LINK_INVALID');

        let codeExchangeSucceeded = false;
        if (code) {
          const { data: exchanged, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError && exchanged?.session?.access_token) {
            codeExchangeSucceeded = true;
          } else {
            // O cliente Auth pode já ter trocado o código durante a inicialização.
            const { data: current } = await supabase.auth.getSession();
            if (!current?.session?.access_token) throw new Error('RECOVERY_LINK_INVALID');
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!mounted) return;

        const hasRecoveryMarker = flowType === 'recovery' || Boolean(code) ||
          hash.get('access_token') !== null || recoveryEventReceived;
        const hasSession = Boolean(data?.session?.access_token);
        const validRecovery = hasSession && hasRecoveryMarker &&
          (flowType === 'recovery' || codeExchangeSucceeded || recoveryEventReceived ||
            hash.get('access_token') !== null);

        if (!validRecovery) throw new Error('RECOVERY_LINK_INVALID');

        setReady(true);
        setError('');
        // Retira o código/token de utilização única da barra de endereço.
        window.history.replaceState({}, document.title, '/reset-password');
      } catch (err) {
        console.warn('Link de recuperação inválido ou expirado:', err?.message || 'unknown');
        if (mounted) {
          setReady(false);
          setError(INVALID_LINK_MESSAGE);
        }
      } finally {
        if (mounted) setChecked(true);
      }
    }

    validateRecoveryLink();
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router.isReady]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('A confirmação tem de ser igual à nova palavra-passe.');
      return;
    }
    if (!ready) {
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Obriga a iniciar sessão novamente com a palavra-passe que acabou de definir.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
      setDone(true);
      setReady(false);
    } catch (err) {
      console.error('Falha ao atualizar palavra-passe:', err);
      setError(INVALID_LINK_MESSAGE);
      setReady(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Recuperar palavra-passe | Talaza</title>
        <meta name="description" content="Defina uma nova palavra-passe para a sua conta Talaza." />
      </Head>
      <AuthShell backHref="/login">
        <Card>
          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div aria-hidden="true" style={{ width: 84, height: 84, borderRadius: '50%', background: C.green, boxShadow: `0 0 0 10px ${C.soft}`, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px' }}>✓</div>
              <h1 style={{ margin: '0 0 10px', color: C.dark, fontSize: 26 }}>Palavra-passe alterada.</h1>
              <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>Entra com a nova palavra-passe.</p>
              <Link href="/login" style={{ display: 'block', marginTop: 26, padding: 16, borderRadius: 14, background: C.green, color: '#FFFFFF', fontWeight: 800, textDecoration: 'none' }}>Entrar</Link>
            </div>
          ) : checked && !ready ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <h1 style={{ margin: '0 0 10px', color: C.dark, fontSize: 24 }}>Link expirado ou inválido</h1>
              <p role="alert" style={{ margin: 0, color: C.muted, fontSize: 15, lineHeight: 1.6 }}>{error || INVALID_LINK_MESSAGE}</p>
              <Link href="/forgot-password" style={{ display: 'block', marginTop: 26, padding: 16, borderRadius: 14, background: C.green, color: '#FFFFFF', fontWeight: 800, textDecoration: 'none' }}>Pedir outro link</Link>
            </div>
          ) : (
            <>
              <h1 style={{ margin: '0 0 6px', color: C.dark, fontSize: 27 }}>Nova palavra-passe</h1>
              <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>Escolhe uma nova palavra-passe para a tua conta.</p>
              <form onSubmit={handleSubmit} noValidate>
                <Field id="password" label="Nova palavra-passe" required>
                  <PasswordField id="password" value={password} onChange={setPassword} placeholder="Mínimo de 6 caracteres" />
                </Field>
                <Field id="confirm" label="Confirmar nova palavra-passe" required>
                  <PasswordField id="confirm" value={confirm} onChange={setConfirm} placeholder="Repete a nova palavra-passe" />
                </Field>
                {error && <ErrorBox>{error}</ErrorBox>}
                <PrimaryButton type="submit" loading={loading} disabled={!ready || !checked}>{loading ? 'A guardar…' : 'Guardar nova palavra-passe'}</PrimaryButton>
              </form>
            </>
          )}
        </Card>
      </AuthShell>
    </>
  );
}
