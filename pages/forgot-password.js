
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${origin}/reset-password`,
        }
      );

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <Link href="/login" className="back">‹ Voltar para entrar</Link>

        {sent ? (
          <>
            <h1>Verifique o seu e-mail</h1>
            <p>
              Se o endereço estiver associado a uma conta, receberá uma mensagem
              com o link para criar uma nova palavra-passe. Verifique também o spam.
            </p>
            <Link href="/login" className="button">Voltar a entrar</Link>
          </>
        ) : (
          <>
            <h1>Esqueceu a palavra-passe?</h1>
            <p>Escreva o e-mail associado à sua conta para receber um link de recuperação.</p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="reset-email">E-mail</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                required
              />
              {error && <div className="error">{error}</div>}
              <button className="button" disabled={loading}>
                {loading ? 'A enviar…' : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}
      </section>

      <style jsx>{`
        .page { min-height: 100vh; display: flex; justify-content: center; padding: 24px 14px; background: #F6F7F5; color: #13231E; font-family: system-ui, sans-serif; }
        .panel { width: 100%; max-width: 440px; align-self: flex-start; padding: 24px; background: white; border: 1px solid #DCE3E0; border-radius: 22px; }
        .back { display: inline-block; margin-bottom: 28px; color: #0B6B57; font-size: 13px; font-weight: 700; text-decoration: none; }
        h1 { font-size: 25px; line-height: 1.2; margin-bottom: 10px; }
        p { color: #6B7873; font-size: 14px; line-height: 1.6; margin-bottom: 22px; }
        label { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 700; }
        input { box-sizing: border-box; width: 100%; padding: 13px 14px; border: 1px solid #DCE3E0; border-radius: 12px; font-size: 15px; }
        .button { display: block; width: 100%; margin-top: 17px; padding: 14px; border: 0; border-radius: 12px; background: #0B6B57; color: white; font-weight: 750; text-align: center; text-decoration: none; cursor: pointer; }
        .button:disabled { opacity: .65; }
        .error { margin-top: 12px; padding: 10px; border-radius: 10px; background: #FFF0EF; color: #B3261E; font-size: 13px; overflow-wrap: anywhere; }
      `}</style>
    </main>
  );
}
