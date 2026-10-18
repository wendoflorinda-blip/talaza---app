import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  gold: '#DDA10A',
  ink: '#17211F',
  muted: '#596560',
  bg: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  red: '#B93845',
};

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Preencha o e-mail e a palavra-passe.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) throw loginError;

      const user = data?.user;

      if (!user) {
        throw new Error('Não foi possível confirmar a sua conta.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const accountType = String(profile?.account_type || profile?.user_type || profile?.role || '')
        .trim()
        .toLowerCase();

      let isSeller = accountType.includes('vendedor') || accountType.includes('seller');

      // Algumas contas antigas não têm account_type preenchido; confirmar pela existência do negócio.
      if (!isSeller) {
        const { data: ownedBusiness, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!businessError && ownedBusiness) isSeller = true;
      }

      if (isSeller) {
        // O vendedor regressa sempre ao painel do seu próprio negócio.
        await router.replace('/seller');
        return;
      }

      if (!profile?.country_id || !profile?.province_id) {
        await router.replace('/signup');
        return;
      }

      // A localização principal fica definida pelo cadastro; não pedir novamente país/província.
      try {
        localStorage.setItem('talaza_country_id', String(profile.country_id));
        localStorage.setItem('talaza_province_id', String(profile.province_id));
        localStorage.setItem('talaza_home_country_id', String(profile.country_id));
        localStorage.setItem('talaza_home_province_id', String(profile.province_id));
      } catch {}
      await router.replace({
        pathname: '/explore',
        query: {
          country: profile.country_id,
          province: profile.province_id,
          homeCountry: profile.country_id,
          homeProvince: profile.province_id,
        },
      });
    } catch (err) {
      console.error('Erro ao entrar:', err);

      const message = String(err?.message || '').toLowerCase();

      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid credentials')
      ) {
        setError('E-mail ou palavra-passe incorretos.');
      } else if (message.includes('email not confirmed')) {
        setError(
          'Confirme o seu e-mail através do link enviado antes de entrar.'
        );
      } else {
        setError(
          err?.message ||
            'Não foi possível entrar. Verifique a ligação e tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Escreva primeiro o e-mail da sua conta.');
      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });

      if (resetError) throw resetError;

      setError(
        'Se existir uma conta com esse e-mail, receberá uma mensagem com o link para recuperar o acesso. Verifique também o spam.'
      );
    } catch (err) {
      console.error('Erro ao recuperar palavra-passe:', err);
      setError(
        err?.message ||
          'Não foi possível enviar o link de recuperação. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Entrar — Talaza</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.page}>
        <div style={styles.container}>
          <Link href="/start" style={styles.back}>
            ← Voltar
          </Link>

          <div style={styles.brand}>
            <span style={styles.brandIcon}>T</span>
            <span>TALAZA</span>
          </div>

          <h1 style={styles.title}>Bem-vindo de volta</h1>
          <p style={styles.subtitle}>
            Entre na sua conta para continuar.
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label htmlFor="email" style={styles.label}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="exemplo@email.com"
              style={styles.input}
            />

            <label htmlFor="password" style={styles.label}>
              Palavra-passe
            </label>

            <div style={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="A sua palavra-passe"
                style={{ ...styles.input, paddingRight: 88 }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                style={styles.showButton}
                aria-label={
                  showPassword
                    ? 'Ocultar palavra-passe'
                    : 'Mostrar palavra-passe'
                }
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={styles.forgot}
            >
              Esqueceu a palavra-passe?
            </button>

            {error && (
              <div role="alert" style={styles.error}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.submit}>
              {loading ? 'Aguarde…' : 'Entrar'}
            </button>
          </form>

          <p style={styles.bottomText}>
            Ainda não tem conta?{' '}
            <Link href="/signup" style={styles.link}>
              Criar conta
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    color: C.ink,
    padding: '24px 16px',
    fontFamily:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: 440,
    margin: '0 auto',
    paddingTop: 12,
  },
  back: {
    color: C.green,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 14,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    margin: '38px 0 30px',
    color: C.green,
    fontWeight: 900,
    letterSpacing: '0.16em',
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: C.dark,
    color: C.gold,
    display: 'grid',
    placeItems: 'center',
    fontSize: 24,
    letterSpacing: 0,
  },
  title: {
    fontSize: 27,
    lineHeight: 1.2,
    margin: '0 0 8px',
    fontWeight: 900,
  },
  subtitle: {
    color: C.muted,
    fontSize: 15,
    margin: '0 0 26px',
  },
  form: {
    background: C.white,
    border: `1px solid ${C.line}`,
    borderRadius: 20,
    padding: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    background: C.white,
    padding: '14px 13px',
    fontSize: 15,
    outlineColor: C.green,
  },
  passwordWrap: {
    position: 'relative',
  },
  showButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 0,
    background: 'transparent',
    color: C.green,
    fontWeight: 800,
    cursor: 'pointer',
    padding: 8,
  },
  forgot: {
    display: 'block',
    margin: '12px 0 18px auto',
    padding: 0,
    border: 0,
    background: 'transparent',
    color: C.green,
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'right',
  },
  error: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    background: '#FCEBED',
    color: C.red,
    fontSize: 13,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  },
  submit: {
    width: '100%',
    padding: 15,
    border: 0,
    borderRadius: 12,
    background: C.green,
    color: C.white,
    fontWeight: 900,
    fontSize: 15,
    cursor: 'pointer',
  },
  bottomText: {
    textAlign: 'center',
    marginTop: 22,
    color: C.muted,
    fontSize: 14,
  },
  link: {
    color: C.green,
    fontWeight: 900,
    textDecoration: 'none',
  },
};
