
import { useEffect, useState } from 'react';
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
  greenSoft: '#E8F3F0',
};

const COUNTRIES = [
  { name: 'Angola', flag: '🇦🇴', code: '+244', available: true },
  { name: 'Brasil', flag: '🇧🇷', code: '+55', available: false },
  { name: 'Portugal', flag: '🇵🇹', code: '+351', available: false },
  { name: 'Estados Unidos', flag: '🇺🇸', code: '+1', available: false },
  { name: 'Espanha', flag: '🇪🇸', code: '+34', available: false },
  { name: 'Alemanha', flag: '🇩🇪', code: '+49', available: false },
  { name: 'África do Sul', flag: '🇿🇦', code: '+27', available: false },
  { name: 'Moçambique', flag: '🇲🇿', code: '+258', available: false },
  { name: 'Cabo Verde', flag: '🇨🇻', code: '+238', available: false },
  { name: 'Namíbia', flag: '🇳🇦', code: '+264', available: false },
];

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 15px',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 12,
  background: COLORS.white,
  color: COLORS.ink,
  fontSize: 15,
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  color: COLORS.ink,
  fontSize: 14,
  fontWeight: 700,
};

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryName, setCountryName] = useState('Angola');
  const [accountType, setAccountType] = useState('cliente');

  const [countryId, setCountryId] = useState('');
  const [countryLoading, setCountryLoading] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedCountry =
    COUNTRIES.find((item) => item.name === countryName) ||
    COUNTRIES[0];

  useEffect(() => {
    let active = true;

    async function loadAngola() {
      const { data, error: countryError } = await supabase
        .from('countries')
        .select('id, name')
        .ilike('name', 'Angola')
        .maybeSingle();

      if (!active) return;

      if (countryError) {
        console.error(countryError);
        setError(
          'Não foi possível carregar os países. Tente novamente.'
        );
      } else if (data) {
        setCountryId(data.id);
      } else {
        setError(
          'Angola ainda não está configurada na base de dados. Contacte o administrador.'
        );
      }

      setCountryLoading(false);
    }

    loadAngola();

    return () => {
      active = false;
    };
  }, []);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanName.length < 2) {
      setError('Introduza o seu nome completo.');
      return;
    }

    if (password.length < 6) {
      setError(
        'A palavra-passe deve ter pelo menos 6 caracteres.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    if (!selectedCountry.available) {
      setError(
        `${selectedCountry.name} ainda não está disponível para cadastro. Por enquanto, apenas Angola está ativa.`
      );
      return;
    }

    if (!countryId) {
      setError(
        'Não foi possível identificar Angola na base de dados. Tente novamente mais tarde.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              account_type: accountType,
            },
          },
        });

      if (authError) {
        console.error(authError);

        if (
          authError.message?.toLowerCase().includes('already registered')
        ) {
          setError(
            'Este e-mail já está registado. Experimente entrar na sua conta.'
          );
        } else {
          setError(
            'Não foi possível criar a conta. Verifique os dados e tente novamente.'
          );
        }

        return;
      }

      if (!authData?.user) {
        setError(
          'Não foi possível confirmar a criação da conta. Tente novamente.'
        );
        return;
      }

      const profileData = {
        id: authData.user.id,
        name: cleanName,
        country_id: countryId,
        account_type: accountType,
        phone: cleanPhone
          ? `${selectedCountry.code}${cleanPhone}`
          : null,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.error(profileError);

        setError(
          'A conta de autenticação foi criada, mas não foi possível guardar o perfil. Entre em contacto com o suporte antes de tentar criar outra conta.'
        );
        return;
      }

      /*
       * Se o Supabase exigir confirmação por e-mail,
       * o utilizador poderá ter de confirmar o endereço
       * antes de entrar.
       */
      if (!authData.session) {
        await router.push({
          pathname: '/login',
          query: { created: '1' },
        });
        return;
      }

      if (accountType === 'vendedor') {
        await router.push({
          pathname: '/post-business',
          query: { country: countryId },
        });
      } else {
        await router.push({
          pathname: '/explore',
          query: { country: countryId },
        });
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
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
          maxWidth: 520,
          boxSizing: 'border-box',
          padding: 'clamp(22px, 5vw, 36px)',
          border: `1px solid ${COLORS.line}`,
          borderRadius: 24,
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
            textDecoration: 'none',
            color: COLORS.dark,
          }}
        >
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: COLORS.green,
              color: COLORS.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 25,
              fontWeight: 900,
            }}
          >
            T
          </span>
          <span style={{ fontSize: 22, fontWeight: 900 }}>
            Talaza
          </span>
        </Link>

        <div style={{ marginTop: 28 }}>
          <p
            style={{
              color: COLORS.green,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            A sua próxima oportunidade começa aqui
          </p>

          <h1
            style={{
              color: COLORS.dark,
              fontSize: 30,
              lineHeight: 1.2,
              margin: '10px 0',
            }}
          >
            Criar conta
          </h1>

          <p
            style={{
              color: COLORS.muted,
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            Escolha como pretende utilizar a Talaza e crie
            a sua conta.
          </p>
        </div>

        <form onSubmit={handleSignup}>
          <label style={labelStyle}>Quero utilizar a Talaza como</label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 22,
            }}
          >
            {[
              {
                value: 'cliente',
                title: 'Cliente',
                description: 'Descobrir negócios e serviços',
                icon: '⌕',
              },
              {
                value: 'vendedor',
                title: 'Vendedor',
                description: 'Criar a minha loja ou negócio',
                icon: '▦',
              },
            ].map((option) => {
              const selected = accountType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccountType(option.value)}
                  aria-pressed={selected}
                  style={{
                    textAlign: 'left',
                    padding: 15,
                    borderRadius: 15,
                    border: `1px solid ${
                      selected ? COLORS.green : COLORS.line
                    }`,
                    background: selected
                      ? COLORS.greenSoft
                      : COLORS.white,
                    cursor: 'pointer',
                    color: COLORS.ink,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 24,
                      color: COLORS.green,
                      marginBottom: 8,
                    }}
                  >
                    {option.icon}
                  </span>
                  <strong style={{ fontSize: 15 }}>
                    {option.title}
                  </strong>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 6,
                      color: COLORS.muted,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginBottom: 17 }}>
            <label style={labelStyle} htmlFor="fullName">
              Nome completo
            </label>
            <input
              id="fullName"
              autoComplete="name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Introduza o seu nome"
              required
              minLength={2}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 17 }}>
            <label style={labelStyle} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 17 }}>
            <label style={labelStyle} htmlFor="country">
              País
            </label>
            <select
              id="country"
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              required
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              {COUNTRIES.map((country) => (
                <option key={country.name} value={country.name}>
                  {country.flag} {country.name}
                  {country.available ? '' : ' — Em breve'}
                </option>
              ))}
            </select>

            {!selectedCountry.available && (
              <p
                style={{
                  margin: '8px 0 0',
                  color: COLORS.muted,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Estamos a preparar a chegada da Talaza a este país.
                O cadastro estará disponível numa próxima fase.
              </p>
            )}
          </div>

          <div style={{ marginBottom: 17 }}>
            <label style={labelStyle} htmlFor="phone">
              Número de telefone (opcional)
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <div
                aria-label={`Indicativo ${selectedCountry.code}`}
                style={{
                  ...inputStyle,
                  width: 100,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: COLORS.greenSoft,
                  borderColor: '#D4E8E2',
                  fontWeight: 800,
                }}
              >
                {selectedCountry.flag} {selectedCountry.code}
              </div>

              <input
                id="phone"
                type="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Número de telefone"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 17 }}>
            <label style={labelStyle} htmlFor="password">
              Palavra-passe
            </label>
            <input
              id="password"
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              minLength={6}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 17 }}>
            <label style={labelStyle} htmlFor="confirmPassword">
              Confirmar palavra-passe
            </label>
            <input
              id="confirmPassword"
              autoComplete="new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a palavra-passe"
              minLength={6}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: 13,
                borderRadius: 12,
                background: '#FFF0F0',
                color: COLORS.red,
                fontSize: 13,
                lineHeight: 1.6,
                marginTop: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || countryLoading}
            style={{
              width: '100%',
              marginTop: 18,
              padding: 16,
              border: 'none',
              borderRadius: 13,
              background:
                loading || countryLoading
                  ? '#91B5AC'
                  : COLORS.green,
              color: COLORS.white,
              fontSize: 15,
              fontWeight: 800,
              cursor:
                loading || countryLoading ? 'wait' : 'pointer',
            }}
          >
            {countryLoading
              ? 'A preparar o cadastro…'
              : loading
                ? 'A criar conta…'
                : 'Criar a minha conta →'}
          </button>
        </form>

        <div
          style={{
            marginTop: 23,
            paddingTop: 20,
            borderTop: `1px solid ${COLORS.line}`,
            textAlign: 'center',
            color: COLORS.muted,
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          Já tem uma conta?{' '}
          <Link
            href="/login"
            style={{
              color: COLORS.green,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Entrar
          </Link>

          <div style={{ marginTop: 12 }}>
            <Link
              href="/"
              style={{
                color: COLORS.muted,
                textDecoration: 'none',
              }}
            >
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
