
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const COLORS = {
  green: '#0F6E5C',
  dark: '#083F35',
  gold: '#DDA10A',
  ink: '#17211F',
  muted: '#596560',
  line: '#E5E9E7',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  red: '#B93845',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 15px',
  borderRadius: 12,
  border: `1px solid ${COLORS.line}`,
  background: COLORS.white,
  color: COLORS.ink,
  fontSize: 15,
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  color: COLORS.ink,
  fontWeight: 700,
  fontSize: 14,
};

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

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data: authData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        console.error(loginError);
        setError(
          'Não foi possível entrar. Verifique o e-mail e a palavra-passe.'
        );
        return;
      }

      const user = authData?.user;

      if (!user) {
        setError('Não foi possível identificar a sua conta.');
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('id, name, country_id, province_id, account_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setError(
          'Não foi possível carregar o seu perfil. Tente novamente.'
        );
        return;
      }

      /*
       * Conta autenticada sem perfil:
       * encaminhamos para o início do fluxo existente,
       * sem depender da página /country.
       */
      if (!profile) {
        await router.push('/start');
        return;
      }

      const accountType = String(
        profile.account_type || 'cliente'
      )
        .trim()
        .toLowerCase();

      const isSeller = [
        'vendedor',
        'seller',
        'business',
        'negocio',
        'negócio',
      ].includes(accountType);

      /*
       * Vendedores: procuramos os negócios da conta.
       * Se não houver nenhum, iniciam o cadastro do negócio.
       */
      if (isSeller) {
        const { data: businesses, error: businessError } =
          await supabase
            .from('businesses')
            .select('id, name, country_id, province_id, owner_id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (businessError) {
          console.error(businessError);
          setError(
            'A conta foi autenticada, mas não foi possível carregar os seus negócios.'
          );
          return;
        }

        if (businesses && businesses.length > 0) {
          const activeBusiness =
            businesses.find((business) => {
              return (
                (!profile.country_id ||
                  business.country_id === profile.country_id) &&
                (!profile.province_id ||
                  business.province_id === profile.province_id)
              );
            }) || businesses[0];

          await router.push({
            pathname: '/seller',
            query: {
              country:
                activeBusiness.country_id ||
                profile.country_id ||
                '',
              province:
                activeBusiness.province_id ||
                profile.province_id ||
                '',
            },
          });

          return;
        }

        await router.push({
          pathname: '/post-business',
          query: {
            ...(profile.country_id
              ? { country: profile.country_id }
              : {}),
            ...(profile.province_id
              ? { province: profile.province_id }
              : {}),
          },
        });

        return;
      }

      /*
       * Clientes: podem consultar a Vitrine mesmo que
       * ainda não tenham uma província guardada no perfil.
       */
      await router.push({
        pathname: '/explore',
        query: {
          ...(profile.country_id
            ? { country: profile.country_id }
            : {}),
          ...(profile.province_id
            ? { province: profile.province_id }
            : {}),
        },
      });
    } catch (err) {
      console.error(err);
      setError(
        'Ocorreu um erro inesperado durante o acesso. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: '28px 16px',
        background: COLORS.canvas,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 480,
          boxSizing: 'border-box',
          padding: 'clamp(24px, 5vw, 36px)',
          borderRadius: 24,
          border: `1px solid ${COLORS.line}`,
          background: COLORS.white,
          boxShadow: '0 12px 38px rgba(8,63,53,0.06)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: COLORS.dark,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: COLORS.green,
              color: COLORS.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            T
          </span>

          <span style={{ fontSize: 22, fontWeight: 900 }}>
            Talaza
          </span>
        </Link>

        <h1
          style={{
            margin: '28px 0 10px',
            color: COLORS.dark,
            fontSize: 31,
            lineHeight: 1.2,
          }}
        >
          Bem-vindo de volta
        </h1>

        <p
          style={{
            color: COLORS.muted,
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 27,
          }}
        >
          Entre na sua conta para continuar a descobrir
          negócios ou gerir a sua loja na Talaza.
        </p>

        {router.query.created === '1' && (
          <div
            role="status"
            style={{
              marginBottom: 18,
              padding: 13,
              borderRadius: 12,
              background: '#E8F3F0',
              color: COLORS.dark,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            A conta foi criada. Se recebeu um e-mail de
            confirmação, confirme o endereço antes de entrar.
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="email" style={labelStyle}>
              E-mail
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="password" style={labelStyle}>
              Palavra-passe
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="A sua palavra-passe"
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: 13,
                borderRadius: 12,
                background: '#FFF0F0',
                color: COLORS.red,
                fontSize: 13,
                lineHeight: 1.6,
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
              marginTop: 10,
              padding: 16,
              border: 'none',
              borderRadius: 13,
              background: loading ? '#91B5AC' : COLORS.green,
              color: COLORS.white,
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'A entrar…' : 'Entrar →'}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 21,
            borderTop: `1px solid ${COLORS.line}`,
            textAlign: 'center',
            color: COLORS.muted,
            fontSize: 14,
            lineHeight: 1.9,
          }}
        >
          Ainda não tem conta?{' '}
          <Link
            href="/signup"
            style={{
              color: COLORS.green,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Criar conta
          </Link>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                border: 'none',
                background: 'transparent',
                color: COLORS.muted,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ← Voltar ao início
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
