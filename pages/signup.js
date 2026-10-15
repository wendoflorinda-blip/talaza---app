
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('cliente');
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');

  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const type = router.query.type;
    if (type === 'cliente' || type === 'vendedor') {
      setAccountType(type);
    }

    loadCountries();
  }, [router.isReady, router.query.type]);

  useEffect(() => {
    if (countryId) {
      loadProvinces(countryId);
    } else {
      setProvinces([]);
      setProvinceId('');
    }
  }, [countryId]);

  async function loadCountries() {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name')
      .order('name');

    if (error) {
      setError('Não foi possível carregar os países.');
      return;
    }

    setCountries(data || []);
  }

  async function loadProvinces(selectedCountryId) {
    setProvinceId('');

    const { data, error } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('country_id', selectedCountryId)
      .order('name');

    if (error) {
      setError('Não foi possível carregar as províncias.');
      return;
    }

    setProvinces(data || []);
  }

  async function handleSignup(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!name.trim() || !phone.trim() || !email.trim() ||
        !password || !countryId || !provinceId) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password.length < 8) {
      setError('A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Confirma que a província pertence ao país escolhido.
      const { data: province, error: provinceError } = await supabase
        .from('provinces')
        .select('id')
        .eq('id', provinceId)
        .eq('country_id', countryId)
        .maybeSingle();

      if (provinceError || !province) {
        throw new Error('A província selecionada não pertence a este país.');
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data: signupData, error: signupError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              phone: phone.trim(),
              account_type: accountType,
              country_id: countryId,
              province_id: provinceId,
            },
          },
        });

      if (signupError) throw signupError;

      const user = signupData.user;

      if (!user) {
        throw new Error('Não foi possível criar a conta. Tente novamente.');
      }

      // Sem sessão, não podemos garantir que o perfil foi guardado.
      // Isto pode acontecer se a confirmação de e-mail estiver ativa.
      if (!signupData.session) {
        setNotice(
          'A conta foi iniciada, mas o Supabase exige confirmação de e-mail. ' +
          'Verifique a configuração de autenticação antes de continuar.'
        );
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            name: name.trim(),
            phone: phone.trim(),
            country_id: countryId,
            province_id: provinceId,
            account_type: accountType,
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        throw new Error(
          'A conta foi criada, mas não foi possível guardar o perfil: ' +
          profileError.message
        );
      }

      const destination =
        accountType === 'vendedor'
          ? '/post-business'
          : '/explore';

      await router.replace({
        pathname: destination,
        query: {
          country: countryId,
          province: provinceId,
        },
      });
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="container"
      style={{ maxWidth: 480, paddingTop: 30, paddingBottom: 50 }}
    >
      <Link href="/" style={{ color: '#0F6E5C', textDecoration: 'none' }}>
        ← Talaza
      </Link>

      <h1 style={{ color: '#17211F', marginTop: 28 }}>
        Criar conta
      </h1>

      <p style={{ color: '#596560', lineHeight: 1.6 }}>
        Crie a sua conta para entrar na Talaza.
      </p>

      <form onSubmit={handleSignup} style={{ display: 'grid', gap: 14 }}>
        <label>
          Tipo de conta
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            required
            style={fieldStyle}
          >
            <option value="cliente">Conta de cliente</option>
            <option value="vendedor">Conta de vendedor</option>
          </select>
        </label>

        <label>
          Nome completo
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            style={fieldStyle}
          />
        </label>

        <label>
          Telefone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Inclua o indicativo do país"
            autoComplete="tel"
            required
            style={fieldStyle}
          />
        </label>

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
            autoComplete="new-password"
            minLength={8}
            required
            style={fieldStyle}
          />
        </label>

        <label>
          País
          <select
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            required
            style={fieldStyle}
          >
            <option value="">Escolha o país</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Província
          <select
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
            required
            disabled={!countryId || provinces.length === 0}
            style={fieldStyle}
          >
            <option value="">Escolha a província</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p role="alert" style={{ color: '#B93845', fontSize: 13 }}>
            {error}
          </p>
        )}

        {notice && (
          <p role="status" style={{ color: '#7252B8', fontSize: 13 }}>
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'A criar conta…' : 'Criar conta'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14 }}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>

      <p style={{ fontSize: 12, color: '#596560', lineHeight: 1.5 }}>
        O registo guarda o número, mas ainda não confirma a sua titularidade.
        A verificação por SMS será ativada quando o serviço estiver configurado.
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
