
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setError('O link de recuperação não pôde ser validado. Peça um novo link.');
      } else if (data?.session) {
        setReady(true);
      } else {
        setError('O link expirou ou já não é válido. Peça um novo link de recuperação.');
      }
    }

    checkSession();
  }, [router.isReady]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Não foi possível alterar a palavra-passe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="panel">
        {success ? (
          <>
            <h1>Palavra-passe alterada</h1>
            <p>Já pode entrar no Talaza com a sua nova palavra-passe.</p>
            <Link className="button" href="/login">Entrar</Link>
          </>
        ) : (
          <>
            <h1>Definir nova palavra-passe</h1>
            <p>Escolha uma palavra-passe nova com pelo menos 8 caracteres.</p>

            {ready && (
              <form onSubmit={handleSubmit}>
                <label htmlFor="new-password">Nova palavra-passe</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <label htmlFor="confirm-password">Confirmar palavra-passe</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <button className="button" disabled={loading}>
                  {loading ? 'A guardar…' : 'Guardar nova palavra-passe'}
                </button>
              </form>
            )}

            {error && <div className="error">{error}</div>}

            {!ready && error && (
              <Link href="/forgot-password" className="back">
                Pedir novo link
              </Link>
            )}
          </>
        )}
      </section>

      <style jsx>{`
        .page { min-height: 100vh; display: flex; justify-content: center; padding: 24px 14px; background: #F6F7F5; color: #13231E; font-family: system-ui, sans-serif; }
        .panel { width: 100%; max-width: 440px; align-self: flex-start; padding: 24px; background: white; border: 1px solid #DCE3E0; border-radius: 22px; }
        h1 { font-size: 25px; line-height: 1.2; margin-bottom: 10px; }
        p { color: #6B7873; font-size: 14px; line-height: 1.6; margin-bottom: 22px; }
        label { display: block; margin: 15px 0 7px; font-size: 13px; font-weight: 700; }
        input { box-sizing: border-box; width: 100%; padding: 13px 14px; border: 1px solid #DCE3E0; border-radius: 12px; font-size: 15px; }
        .button { display: block; width: 100%; margin-top: 18px; padding: 14px; border: 0; border-radius: 12px; background: #0B6B57; color: white; font-weight: 750; text-align: center; text-decoration: none; cursor: pointer; }
        .button:disabled { opacity: .65; }
        .back { display: inline-block; margin-top: 15px; color: #0B6B57; font-weight: 700; font-size: 13px; }
        .error { margin-top: 14px; padding: 10px; border-radius: 10px; background: #FFF0EF; color: #B3261E; font-size: 13px; overflow-wrap: anywhere; }
      `}</style>
    </main>
  );
}
