import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function PostBusiness() {
  const router = useRouter();
  const { country, province } = router.query;

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [mode, setMode] = useState('choice');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    checkUser();
  }, [router.isReady]);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user || null);

    if (user) {
      setMode('business');
    }

    setCheckingAuth(false);
  }

  async function handleCreateAccount(e) {
    e.preventDefault();

    setError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);

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

    if (!authData?.user) {
      setError('Não foi possível criar a conta. Tente novamente.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name: fullName.trim(),
        country_id: country || null,
        province_id: province || null,
      });

    if (profileError) {
      console.error(profileError);
      setError(
        'A conta foi criada, mas não foi possível preparar o seu perfil.'
      );
      setLoading(false);
      return;
    }

    setUser(authData.user);
    setMode('business');
    setLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();

    setError('');

    if (!email.trim() || !password) {
      setError('Preencha o e-mail e a palavra-passe.');
      return;
    }

    setLoading(true);

    const {
      data,
      error: loginError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError('E-mail ou palavra-passe incorretos.');
      setLoading(false);
      return;
    }

    if (!data?.user) {
      setError('Não foi possível entrar na sua conta.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, country_id, province_id')
      .eq('id', data.user.id)
      .single();

    setUser(data.user);

    if (profile?.country_id && profile?.province_id) {
      router.replace({
        pathname: '/post-business',
        query: {
          country: profile.country_id,
          province: profile.province_id,
        },
      });
    } else {
      setMode('business');
    }

    setLoading(false);
  }

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F5F7F6',
        }}
      >
        <p style={{ color: '#075B4E', fontWeight: 700 }}>
          A preparar o seu espaço…
        </p>
      </div>
    );
  }

  if (mode === 'choice' && !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: '24px 16px 50px',
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: 760,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 45,
            }}
          >
            <Link
              href={{
                pathname: '/start',
                query: { country, province },
              }}
              style={{
                color: '#075B4E',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ← Voltar
            </Link>

            <div
              style={{
                color: '#075B4E',
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              TALAZA
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              marginBottom: 35,
            }}
          >
            <div
              style={{
                display: 'inline-block',
                background: '#EAF4F1',
                color: '#075B4E',
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 15,
              }}
            >
              Perfil de negócio
            </div>

            <h1
              style={{
                margin: 0,
                color: '#17342F',
                fontSize: 'clamp(30px, 6vw, 42px)',
              }}
            >
              Como deseja continuar?
            </h1>

            <p
              style={{
                maxWidth: 520,
                margin: '15px auto 0',
                color: '#66736F',
                lineHeight: 1.6,
              }}
            >
              Para criar e gerir um perfil de negócio, precisa de uma conta
              Talaza.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
            }}
          >
            <button
              onClick={() => {
                setError('');
                setMode('login');
              }}
              style={{
                border: '2px solid #075B4E',
                background: '#FFFFFF',
                borderRadius: 22,
                padding: 28,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  marginBottom: 15,
                }}
              >
                ↪
              </div>

              <h2
                style={{
                  margin: '0 0 8px',
                  color: '#075B4E',
                  fontSize: 21,
                }}
              >
                Já tenho conta
              </h2>

              <p
                style={{
                  margin: 0,
                  color: '#66736F',
                  lineHeight: 1.55,
                  fontSize: 14,
                }}
              >
                Entre na sua conta e continue para criar o seu perfil de
                negócio.
              </p>
            </button>

            <button
              onClick={() => {
                setError('');
                setMode('signup');
              }}
              style={{
                border: 'none',
                background: 'linear-gradient(145deg, #075B4E, #0B7563)',
                color: '#FFFFFF',
                borderRadius: 22,
                padding: 28,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  marginBottom: 15,
                  color: '#E6A900',
                }}
              >
                +
              </div>

              <h2
                style={{
                  margin: '0 0 8px',
                  fontSize: 21,
                }}
              >
                Criar conta
              </h2>

              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.78)',
                  lineHeight: 1.55,
                  fontSize: 14,
                }}
              >
                Crie a sua conta Talaza e depois configure o seu negócio.
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <AuthPage
        title="Entrar na sua conta"
        subtitle="Entre na Talaza para continuar a criação do seu perfil de negócio."
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={handleLogin}
        loading={loading}
        error={error}
        buttonText="Entrar e continuar"
        back={() => {
          setError('');
          setMode('choice');
        }}
      />
    );
  }

  if (mode === 'signup') {
    return (
      <AuthPage
        title="Criar conta Talaza"
        subtitle="Crie a sua conta para poder apresentar o seu negócio na Talaza."
        name={fullName}
        setName={setFullName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={handleCreateAccount}
        loading={loading}
        error={error}
        buttonText="Criar conta e continuar"
        back={() => {
          setError('');
          setMode('choice');
        }}
        signup
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        padding: '24px 16px 50px',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 850,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 35,
          }}
        >
          <Link
            href={{
              pathname: '/start',
              query: { country, province },
            }}
            style={{
              color: '#075B4E',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            ← Voltar
          </Link>

          <div
            style={{
              color: '#075B4E',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            TALAZA
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 26,
            padding: '35px 25px',
            boxShadow: '0 15px 40px rgba(0,70,60,0.08)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div
              style={{
                display: 'inline-block',
                padding: '7px 13px',
                borderRadius: 999,
                background: '#EAF4F1',
                color: '#075B4E',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              Próximo passo
            </div>

            <h1
              style={{
                margin: 0,
                color: '#17342F',
                fontSize: 32,
              }}
            >
              Criar o seu perfil de negócio
            </h1>

            <p
              style={{
                color: '#66736F',
                lineHeight: 1.6,
                maxWidth: 580,
                margin: '12px auto 0',
              }}
            >
              A sua conta está pronta. Agora vamos preparar as informações
              do seu negócio.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Nome do negócio</label>
              <input
                style={inputStyle}
                placeholder="Ex.: Florinda Boutique"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <label style={labelStyle}>Município</label>
                <input
                  style={inputStyle}
                  placeholder="Município"
                />
              </div>

              <div>
                <label style={labelStyle}>Bairro</label>
                <input
                  style={inputStyle}
                  placeholder="Bairro"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descrição</label>
              <textarea
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  resize: 'vertical',
                }}
                placeholder="Apresente brevemente o seu negócio..."
              />
            </div>

            <div
              style={{
                marginTop: 8,
                padding: 16,
                borderRadius: 16,
                background: '#FFF8E6',
                border: '1px solid #F0D98A',
                color: '#765900',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Estamos a preparar o cadastro completo do negócio. Nesta etapa,
              a conta já fica ligada à localização que você escolheu.
            </div>

            <button
              disabled
              style={{
                marginTop: 8,
                border: 'none',
                borderRadius: 14,
                padding: '15px 20px',
                background: '#D9DFDD',
                color: '#7B8581',
                fontWeight: 800,
                cursor: 'not-allowed',
              }}
            >
              Continuar para configurar o negócio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthPage({
  title,
  subtitle,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  loading,
  error,
  buttonText,
  back,
  signup = false,
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        padding: '24px 16px 50px',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 520,
        }}
      >
        <button
          onClick={back}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#075B4E',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 35,
          }}
        >
          ← Voltar
        </button>

        <div
          style={{
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              color: '#075B4E',
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1,
              marginBottom: 25,
            }}
          >
            TALAZA
          </div>

          <h1
            style={{
              margin: 0,
              color: '#17342F',
              fontSize: 32,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              color: '#66736F',
              lineHeight: 1.6,
              marginTop: 12,
            }}
          >
            {subtitle}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            background: '#FFFFFF',
            borderRadius: 24,
            padding: 26,
            boxShadow: '0 15px 40px rgba(0,70,60,0.08)',
          }}
        >
          {signup && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome</label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>E-mail</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Palavra-passe</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="A sua palavra-passe"
              style={inputStyle}
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: 13,
                borderRadius: 12,
                background: '#FFF0F0',
                color: '#A32929',
                fontSize: 13,
                lineHeight: 1.5,
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
              border: 'none',
              borderRadius: 14,
              padding: '15px 20px',
              background: loading ? '#9DB8B2' : '#075B4E',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'A processar…' : buttonText}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  color: '#17342F',
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #D7E0DD',
  borderRadius: 12,
  padding: '13px 14px',
  fontSize: 14,
  outline: 'none',
  background: '#FFFFFF',
  color: '#17342F',
};
    

        
