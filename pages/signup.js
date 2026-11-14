import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import AuthShell from '../components/AuthShell';
import Unavailable from '../components/Unavailable';
import {
  Card,
  Field,
  ErrorBox,
  PrimaryButton,
  CountrySelect,
  PhoneField,
  PasswordField,
  inputStyle,
} from '../components/Fields';
import {
  C,
  countryInfo,
  isAngola,
  validAngolanPhone,
  fullPhone,
} from '../lib/talaza';

export default function Signup() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [blockedCountry, setBlockedCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const country = countries.find((c) => c.id === countryId);
  const dial = countryInfo(country?.name).dial;

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    setProvinceId('');

    if (!countryId) {
      setProvinces([]);
      return;
    }

    loadProvinces(countryId);
  }, [countryId]);

  async function loadCountries() {
    const { data, error: countriesError } = await supabase
      .from('countries')
      .select('id, name')
      .order('name', { ascending: true });

    if (countriesError) {
      console.error(countriesError);
      setError('Não foi possível carregar a lista de países.');
      return;
    }

    const list = [...(data || [])].sort(
      (a, b) => (isAngola(b.name) ? 1 : 0) - (isAngola(a.name) ? 1 : 0)
    );

    setCountries(list);

    const angola = list.find((c) => isAngola(c.name));
    setCountryId((prev) => prev || angola?.id || list[0]?.id || '');
  }

  async function loadProvinces(id) {
    const { data, error: provincesError } = await supabase
      .from('provinces')
      .select('id, name')
      .eq('country_id', id)
      .order('name', { ascending: true });

    if (provincesError) {
      console.error(provincesError);
      setError('Não foi possível carregar as províncias.');
      return;
    }

    setProvinces(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!country) {
      setError('Escolha o seu país.');
      return;
    }

    /* Só Angola segue. Outro país vai para o ecrã "País indisponível". */
    if (!isAngola(country.name)) {
      setBlockedCountry(country.name);
      return;
    }

    if (!fullName.trim()) {
      setError('Digite o seu nome.');
      return;
    }

    if (!provinceId) {
      setError('Escolha a sua província.');
      return;
    }

    if (!validAngolanPhone(phone, dial)) {
      setError(
        'Digite um número de telefone válido, com 9 dígitos (ex.: 923 456 789).'
      );
      return;
    }

    if (!email.trim()) {
      setError('Digite o seu e-mail.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const pendingExplorer = {
        name: fullName.trim(),
        country_id: countryId,
        province_id: provinceId,
        phone: fullPhone(dial, phone),
      };

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              talaza_pending_signup_type: 'explorer',
              talaza_pending_explorer: pendingExplorer,
            },
            emailRedirectTo: typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback`
              : undefined,
          },
        });

      if (authError) {
        console.error(authError);
        setError(
          authError.message?.toLowerCase().includes('already registered')
            ? 'Este e-mail já tem uma conta. Volte à página inicial e toque em Entrar.'
            : authError.message || 'Não foi possível criar a conta.'
        );
        return;
      }

      if (!authData?.user) {
        setError('Não foi possível criar a conta. Tente novamente.');
        return;
      }

      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setError('Este e-mail já tem uma conta. Volte à página inicial e toque em Entrar.');
        return;
      }

      if (authData.session) {
        await router.replace('/auth/callback');
        return;
      }

      setError(
        'Verifica o teu email, enviámos um link para confirmares. Clica no link para ativares a conta.'
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (blockedCountry) {
    return (
      <AuthShell backHref="/start">
        <Head>
          <title>País indisponível | Talaza</title>
        </Head>

        <Unavailable
          country={blockedCountry}
          onBack={() => setBlockedCountry('')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell backHref="/start">
      <Head>
        <title>Explorar Talaza | Criar conta</title>
      </Head>

      <Card>
        <div
          style={{
            display: 'inline-block',
            padding: '7px 12px',
            borderRadius: 999,
            background: C.soft,
            color: C.green,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Explorar Talaza
        </div>

        <h1 style={{ margin: '14px 0 6px', color: C.ink, fontSize: 27 }}>
          Crie a sua conta
        </h1>

        <p
          style={{
            margin: 0,
            color: C.muted,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Uma conta para explorar a Talaza e encontrar negócios perto de
          si.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <Field id="name" label="Nome" required>
            <input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="O seu nome"
              autoComplete="name"
              style={inputStyle}
            />
          </Field>

          <Field id="country" label="País" required>
            <CountrySelect
              id="country"
              countries={countries}
              value={countryId}
              onChange={setCountryId}
            />
          </Field>

          <Field id="province" label="Província" required>
            <select
              id="province"
              value={provinceId}
              onChange={(e) => setProvinceId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Escolher província</option>

              {provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {String(province.name).trim()}
                </option>
              ))}
            </select>
          </Field>

          <Field id="phone" label="Número de telefone" required>
            <PhoneField
              id="phone"
              countryName={country?.name}
              value={phone}
              onChange={setPhone}
            />
          </Field>

          <Field id="email" label="E-mail" required>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              style={inputStyle}
            />
          </Field>
          <p style={{ margin: '-8px 0 12px', color: '#66756F', fontSize: 12, lineHeight: 1.55 }}>Este e-mail é usado para criar e proteger a sua conta Talaza. Não será mostrado publicamente no seu negócio sem a sua escolha nas definições de privacidade.</p>

          <Field id="password" label="Senha" required>
            <PasswordField
              id="password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo de 6 caracteres"
            />
          </Field>

          <ErrorBox>{error}</ErrorBox>

          <PrimaryButton type="submit" loading={loading}>
            {loading ? 'A criar conta…' : 'Criar conta'}
          </PrimaryButton>
        </form>
      </Card>
    </AuthShell>
  );
}
