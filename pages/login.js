
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) throw loginError;

      const user = data.user;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, account_type, country_id, province_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error(
          'A conta não tem perfil configurado. Contacte o suporte.'
        );
      }

      if (!profile.country_id || !profile.province_id) {
        throw new Error(
          'O país ou a província da conta não está definido.'
        );
      }

      const locationQuery = {
        country: profile.country_id,
        province: profile.province_id,
      };

      if (profile.account_type === 'vendedor') {
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id, is_active')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (businessError) throw businessError;

        if (!business) {
          await router.replace({
            pathname: '/post-business',
            query: locationQuery,
          });
          return;
        }

        await router.replace({
          pathname: '/vendedor',
          query: locationQuery,
        });
        return;
      }

      if (profile.account_type === 'cliente') {
        await router.replace({
          pathname: '/explore',
          query: locationQuery,
        });
        return;
      }

      throw new Error(
        'O tipo de conta não está definido corretamente no perfil.'
      );
    } catch (err) {
      setError(err.message || 'Não foi possível iniciar sessão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="container"
      style={{ maxWidth: 440, paddingTop: 30, paddingBottom: 50 }}
    >
      <Link href="/" style={{ color: '#0F6E5C', textDecoration: 'none' }}>
        ← Talaza
      </Link>

      <h1 style={{ marginTop: 28, color: '#17211F' }}>Entrar</h1>

      <p style={{ color: '#596560', lineHeight: 1.6 }}>
        Entre na sua conta de cliente ou vendedor.
      </p>

      <form onSubmit={handleLogin} style={{ display: 'grid', gap: 14 }}>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={fieldStyle}
          />
        </label>

        <label>
          Palavra-passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={fieldStyle}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: '#B93845', fontSize: 13 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'A entrar…' : 'Entrar'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14 }}>
        Ainda não tem conta? <Link href="/signup">Criar conta</Link>
      </p>
    </main>
  );
}

const fieldStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 6,
  padding: '12px 13px',
  border: '1px solid #E5E9E7',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#17211F',
};

const buttonStyle = {
  border: 0,
  borderRadius: 10,
  padding: 14,
  background: '#0F6E5C',
  color: '#FFFFFF',
  fontWeight: 700,
  cursor: 'pointer',
};
