import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { setTalazaLocation } from '../lib/talazaLocation';

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
  const [aReenviar, setAReenviar] = useState(false);
  const [msgReenvio, setMsgReenvio] = useState('');

  async function reenviarEmail() {
    const cleanEmail = email.trim().toLowerCase();

    setAReenviar(true);
    setMsgReenvio('A enviar...');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (resendError) throw resendError;

      setMsgReenvio(
        'Enviamos um novo email! Vai na tua caixa de entrada e clica no link.'
      );
    } catch (err) {
      console.error('Erro ao reenviar email de confirmação:', err);
      setMsgReenvio('Não deu para reenviar. Tenta de novo.');
    } finally {
      setAReenviar(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMsgReenvio('');

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
      const session = data?.session;

      // Só considerar a autenticação concluída quando o Supabase devolver
      // uma sessão real. A partir daqui, falhas de leitura do perfil não
      // podem transformar um login válido numa mensagem de credenciais erradas.
      if (!user || !session?.access_token) {
        throw new Error('LOGIN_SESSION_UNAVAILABLE');
      }

      // Um destino interno explícito (ex.: /media) tem prioridade.
      const nextPath =
        typeof router.query.next === 'string' &&
        router.query.next.startsWith('/') &&
        !router.query.next.startsWith('//')
          ? router.query.next
          : '';

      if (nextPath) {
        await router.replace(nextPath);
        return;
      }

      const metadata = user.user_metadata || {};
      const appMetadata = user.app_metadata || {};
      const isMediaCreator =
        metadata.media_account_type === 'creator' ||
        metadata.media_creator_onboarding === true ||
        appMetadata.media_account_type === 'creator';

      if (isMediaCreator) {
        await router.replace('/media');
        return;
      }

      // Retomar um cadastro de vendedor já autenticado sem o converter em explorador.
      if (metadata.talaza_pending_signup_type === 'seller') {
        await router.replace('/post-business?resume=1');
        return;
      }

      // Consultas de perfil/negócio apenas escolhem o painel. Não são
      // autenticação e, se falharem, não devem expulsar uma sessão válida.
      let profile = null;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,name,country_id,province_id,account_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Login aceite; não foi possível ler o perfil:', {
          code: profileError.code,
          message: profileError.message,
        });
        setError('A tua sessão foi iniciada, mas não foi possível consultar o teu perfil. Atualiza a página e tenta novamente.');
        return;
      } else {
        profile = profileData;
      }

      const accountType = String(
        profile?.account_type ||
        metadata.account_type ||
        appMetadata.account_type ||
        ''
      ).trim().toLowerCase();

      const sellerAccount = ['vendedor', 'seller', 'business'].includes(accountType);

      // Repor a província principal do perfil ao iniciar sessão, sem herdar
      // a última província visitada durante a exploração.
      if (profile?.country_id && profile?.province_id) {
        const [{ data: countryRow }, { data: provinceRow }] = await Promise.all([
          supabase.from('countries').select('id,name').eq('id', profile.country_id).maybeSingle(),
          supabase.from('provinces').select('id,name,country_id').eq('id', profile.province_id).eq('country_id', profile.country_id).maybeSingle(),
        ]);
        setTalazaLocation({
          country: countryRow?.name || '',
          countryId: profile.country_id,
          province: provinceRow?.name || '',
          provinceId: profile.province_id,
        });
        try {
          localStorage.setItem('talaza_home_country_id', String(profile.country_id));
          localStorage.setItem('talaza_home_province_id', String(profile.province_id));
        } catch {}
      }

      const { data: ownedBusiness, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (businessError) {
        console.error('Login aceite; não foi possível verificar o negócio:', {
          code: businessError.code,
          message: businessError.message,
        });
      }

      if (ownedBusiness?.id || sellerAccount) {
        await router.replace('/seller');
        return;
      }

      if (!profile) {
        // Se o perfil ainda não foi criado, manter o utilizador autenticado
        // e encaminhá-lo para completar o cadastro, sem pedir novo login.
        await router.replace('/signup?mode=complete');
        return;
      }

      if (!profile.country_id || !profile.province_id) {
        await router.replace('/signup?mode=complete');
        return;
      }

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
      const errorCode = String(err?.code || '').toLowerCase();

      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid credentials') ||
        errorCode === 'invalid_credentials'
      ) {
        setError('E-mail ou palavra-passe incorretos. Verifica e tenta novamente.');
      } else if (
        message.includes('confirm') ||
        errorCode.includes('email_not_confirmed')
      ) {
        setError(
          'Ainda não confirmaste o teu email. Verifica a tua caixa de entrada e clica no link.'
        );
      } else {
        setError('Não foi possível entrar neste momento. Verifica os teus dados e tenta novamente.');
      }
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMsgReenvio('');
              }}
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
              onClick={() => router.push('/forgot-password')}
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

            {error.toLowerCase().includes('confirm') && (
              <div style={styles.resendArea}>
                <button
                  type="button"
                  onClick={reenviarEmail}
                  disabled={aReenviar}
                  style={{
                    ...styles.resendButton,
                    opacity: aReenviar ? 0.6 : 1,
                    cursor: aReenviar ? 'not-allowed' : 'pointer',
                  }}
                >
                  {aReenviar ? 'A enviar...' : 'Reenviar email de confirmação'}
                </button>

                {msgReenvio && (
                  <p role="status" aria-live="polite" style={styles.resendMessage}>
                    {msgReenvio}
                  </p>
                )}
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
  resendArea: {
    marginTop: -4,
    marginBottom: 16,
  },
  resendButton: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${C.green}`,
    borderRadius: 10,
    background: C.white,
    color: C.green,
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
  },
  resendMessage: {
    color: '#16804A',
    fontSize: 13,
    lineHeight: 1.5,
    margin: '9px 2px 0',
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
