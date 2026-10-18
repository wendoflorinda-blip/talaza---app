import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import {
  Card,
  Field,
  ErrorBox,
  PrimaryButton,
  PasswordField,
} from '../components/Fields';
import { C } from '../lib/talaza';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    /* O link do e-mail inicia uma sessão de recuperação */
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setChecked(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      setChecked(true);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('As palavras-passe não são iguais.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      console.error(updateError);
      setError('Não foi possível guardar a nova palavra-passe. Tente novamente.');
      return;
    }

    setDone(true);
  }

  return (
    <AuthShell backHref="/login">
      <Head>
        <title>Nova palavra-passe | Talaza</title>
      </Head>

      <Card>
        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              aria-hidden="true"
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: C.green,
                boxShadow: `0 0 0 10px ${C.soft}`,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                margin: '0 auto 24px',
              }}
            >
              ✓
            </div>

            <h1 style={{ margin: '0 0 10px', color: C.ink, fontSize: 26 }}>
              Palavra-passe atualizada
            </h1>

            <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
              Já pode entrar com a nova palavra-passe.
            </p>

            <Link
              href="/login"
              style={{
                display: 'block',
                marginTop: 26,
                padding: 16,
                borderRadius: 14,
                background: C.green,
                color: '#FFFFFF',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Entrar
            </Link>
          </div>
        ) : checked && !ready ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <h1 style={{ margin: '0 0 10px', color: C.ink, fontSize: 24 }}>
              Link inválido ou expirado
            </h1>

            <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
              Peça um novo link para criar a sua palavra-passe.
            </p>

            <Link
              href="/forgot-password"
              style={{
                display: 'block',
                marginTop: 26,
                padding: 16,
                borderRadius: 14,
                background: C.green,
                color: '#FFFFFF',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Pedir novo link
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ margin: '0 0 6px', color: C.ink, fontSize: 27 }}>
              Nova palavra-passe
            </h1>

            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Escolha uma palavra-passe nova para a sua conta.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <Field id="password" label="Nova palavra-passe" required>
                <PasswordField
                  id="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Mínimo de 6 caracteres"
                />
              </Field>

              <Field id="confirm" label="Repita a palavra-passe" required>
                <PasswordField
                  id="confirm"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Repita a palavra-passe"
                />
              </Field>

              <ErrorBox>{error}</ErrorBox>

              <PrimaryButton type="submit" loading={loading || !ready}>
                {loading ? 'A guardar…' : 'Guardar palavra-passe'}
              </PrimaryButton>
            </form>
          </>
        )}
      </Card>
    </AuthShell>
  );
}
