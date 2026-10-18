import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import { Card, Field, ErrorBox, PrimaryButton } from '../components/Fields';
import { C } from '../lib/talaza';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Introduza o e-mail associado à sua conta.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
      if (resetError) throw resetError;
      setNotice('Se existir uma conta com este e-mail, enviaremos um link de recuperação. Verifique a caixa de entrada e o spam.');
    } catch (err) {
      console.error('Falha ao pedir recuperação de palavra-passe:', err);
      setError('Não foi possível enviar o link. Confirme o e-mail e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Recuperar palavra-passe | Talaza</title>
        <meta name="description" content="Recupere o acesso à sua conta Talaza." />
      </Head>
      <AuthShell backHref="/login">
        <Card>
          <div aria-hidden="true" style={{ fontSize: 36, marginBottom: 14 }}>🔐</div>
          <h1 style={{ margin: '0 0 8px', color: C.dark, fontSize: 27 }}>Recuperar palavra-passe</h1>
          <p style={{ margin: '0 0 20px', color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Introduza o e-mail da sua conta. Enviaremos um link para escolher uma nova palavra-passe.
          </p>
          <form onSubmit={handleSubmit}>
            <Field id="email" label="E-mail da conta" required>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@email.com" style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px 13px', border: `1px solid ${C.line}`, borderRadius: 12, background: C.white, fontSize: 15, outlineColor: C.green }} />
            </Field>
            {error && <ErrorBox>{error}</ErrorBox>}
            {notice && <div role="status" style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.soft, color: C.dark, fontSize: 13, lineHeight: 1.5 }}>{notice}</div>}
            <PrimaryButton type="submit" loading={loading}>{loading ? 'A enviar…' : 'Enviar link de recuperação'}</PrimaryButton>
          </form>
          <p style={{ margin: '20px 0 0', color: C.muted, fontSize: 14, textAlign: 'center' }}>
            Lembrou-se da palavra-passe? <Link href="/login" style={{ color: C.green, fontWeight: 800, textDecoration: 'none' }}>Entrar</Link>
          </p>
        </Card>
      </AuthShell>
    </>
  );
}
