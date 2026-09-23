     
      import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();

  const {
    country,
    province,
    next,
  } = router.query;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError(
          'Não foi possível criar a conta. Tente novamente.'
        );
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: fullName.trim(),
          country_id: country || null,
          province_id: province || null,
        });

      if (profileError) {
        console.error(profileError);

        setError(
          'A conta foi criada, mas não foi possível criar o seu perfil.'
        );

        setLoading(false);
        return;
      }

      if (next === 'explore') {
        router.push({
          pathname: '/explore',
          query: {
            country,
            province,
          },
        });
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error(err);

      setError(
        'Ocorreu um erro. Tente novamente.'
      );

      setLoading(false);
    }
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
          maxWidth: 480,
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
            marginTop: 35,
          }}
        >
          <h1 style={{ fontSize: 27 }}>
            Criar conta na Talaza
          </h1>

          <p
            style={{
              fontSize: 14,
              color: '#596B68',
              lineHeight: 1.5,
            }}
          >
            Crie a sua conta para continuar e explorar
            a Talaza.
          </p>

          <form
            onSubmit={handleSignup}
            style={{ marginTop: 24 }}
          >
            <input
              className="input"
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              required
            />

            <input
              className="input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
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
              minLength={6}
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
              className="btn"
              type="submit"
              disabled={loading}
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
                ? 'A criar conta…'
                : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
          
        
