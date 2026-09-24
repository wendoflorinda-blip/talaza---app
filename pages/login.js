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

    const cleanEmail = email.trim();

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

    if (loginError) {
      console.error(loginError);

      setError(
        'Não foi possível entrar. Verifique o e-mail e a palavra-passe.'
      );

      setLoading(false);
      return;
    }

    if (!data?.user) {
      setError('Não foi possível identificar a sua conta.');
      setLoading(false);
      return;
    }

    /*
      Procuramos o perfil pessoal.
    */

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select(`
          id,
          name,
          country_id,
          province_id
        `)
        .eq('id', data.user.id)
        .maybeSingle();

    if (profileError) {
      console.error(profileError);
    }

    /*
      Se a conta existe mas ainda não possui perfil,
      mandamos escolher a localização.
    */

    if (!profile) {
      setLoading(false);
      router.push('/country');
      return;
    }

    /*
      Se o perfil ainda não tem localização,
      também mandamos definir localização.
    */

    if (!profile.country_id || !profile.province_id) {
      setLoading(false);
      router.push('/country');
      return;
    }

    /*
      Procuramos os negócios pertencentes ao utilizador.
    */

    const { data: businesses, error: businessError } =
      await supabase
        .from('businesses')
        .select(`
          id,
          name,
          country_id,
          province_id,
          owner_id
        `)
        .eq('owner_id', data.user.id)
        .eq('country_id', profile.country_id)
        .eq('province_id', profile.province_id)
        .order('created_at', { ascending: false });

    if (businessError) {
      console.error(businessError);
    }

    setLoading(false);

    /*
      Se possui negócio, entra na sua área de negócio.
    */

    if (businesses && businesses.length > 0) {
      router.push({
        pathname: '/seller',
        query: {
          country: profile.country_id,
          province: profile.province_id
        }
      });

      return;
    }

    /*
      Se ainda não possui negócio,
      entra normalmente na Vitrine.
    */

    router.push({
      pathname: '/explore',
      query: {
        country: profile.country_id,
        province: profile.province_id
      }
    });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#FFFFFF',
          borderRadius: 28,
          padding: 32,
          boxShadow: '0 18px 50px rgba(0,70,60,.09)'
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            background: '#075B4E',
            color: '#E6A900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 900
          }}
        >
          T
        </div>

        <h1
          style={{
            margin: '22px 0 8px',
            color: '#075B4E',
            fontSize: 32
          }}
        >
          Entrar na Talaza
        </h1>

        <p
          style={{
            color: '#66736F',
            lineHeight: 1.6,
            marginBottom: 26
          }}
        >
          Aceda à sua conta e continue exatamente de onde parou.
        </p>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              color: '#17342F',
              fontWeight: 700
            }}
          >
            E-mail
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            style={inputStyle}
          />

          <label
            style={{
              display: 'block',
              marginTop: 18,
              marginBottom: 8,
              color: '#17342F',
              fontWeight: 700
            }}
          >
            Palavra-passe
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="A sua palavra-passe"
            required
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                background: '#FFF1F0',
                color: '#9B2C2C',
                fontSize: 14,
                lineHeight: 1.5
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 22,
              padding: 16,
              border: 'none',
              borderRadius: 14,
              background: loading ? '#8CAFA8' : '#075B4E',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 15,
              cursor: loading ? 'default' : 'pointer'
            }}
          >
            {loading ? 'A entrar…' : 'Entrar →'}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid #E7ECEA',
            textAlign: 'center'
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#075B4E',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ← Voltar
          </button>
        </div>
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 14,
  borderRadius: 12,
  border: '1px solid #D5DEDB',
  background: '#FFFFFF',
  color: '#17342F',
  fontSize: 15,
  outline: 'none'
};

              
              
              
              
            

