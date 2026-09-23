
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(
        'E-mail ou palavra-passe incorretos.'
      );
      setLoading(false);
      return;
    }

    if (!data?.user) {
      setError(
        'Não foi possível entrar na sua conta.'
      );
      setLoading(false);
      return;
    }

    /*
     * Procuramos o perfil do utilizador para descobrir
     * o país e a província escolhidos anteriormente.
     */
    const { data: profile } = await supabase
      .from('profiles')
      .select('country_id, province_id')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (
      profile?.country_id &&
      profile?.province_id
    ) {
      router.push({
        pathname: '/explore',
        query: {
          country: profile.country_id,
          province: profile.province_id,
        },
      });

      return;
    }

    /*
     * Se a conta ainda não tiver localização,
     * começamos novamente pela escolha do país.
     */
    router.push('/country');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 440,
          paddingBottom: 50,
        }}
      >
        <nav className="topnav">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              className="logo"
              style={{
                background: '#075B4E',
                color: '#E6A900',
              }}
            >
              T
            </div>

            <b>Talaza</b>
          </div>
        </nav>

        <div
          style={{
            marginTop: 45,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '7px 13px',
              borderRadius: 30,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Apenas para contas existentes
          </div>

          <h1
            style={{
              fontSize: 29,
              margin: '18px 0 8px',
            }}
          >
            Entrar na Talaza
          </h1>

          <p
            style={{
              color: '#596B68',
              lineHeight: 1.5,
              fontSize: 14,
            }}
          >
            Entre na sua conta para continuar de
            onde parou.
          </p>

          <form
            onSubmit={handleLogin}
            style={{
              marginTop: 25,
            }}
          >
            <input
              className="input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              autoComplete="email"
            />

            <input
              className="input"
              type="password"
              placeholder="Palavra-passe"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              autoComplete="current-password"
            />

            {error && (
              <p
                style={{
                  color: '#D92D20',
                  fontSize: 13,
                  marginTop: 10,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: 16,
                background: '#075B4E',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
              }}
            >
              {loading
                ? 'A entrar…'
                : 'Entrar'}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: 25,
            }}
          >
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#075B4E',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ← Voltar à entrada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
