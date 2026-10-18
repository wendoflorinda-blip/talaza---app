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
  ImagePicker,
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
  resizeImage,
  uploadPublicImage,
} from '../lib/talaza';

export default function Signup() {
  const router = useRouter();

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

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

  function pickAvatar(file) {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError) {
        console.error(authError);

        setError(
          authError.message?.toLowerCase().includes('already registered')
            ? 'Este e-mail já tem uma conta. Volte à página inicial e toque em Entrar.'
            : authError.message || 'Não foi possível criar a conta.'
        );

        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError('Não foi possível criar a conta. Tente novamente.');
        setLoading(false);
        return;
      }

      /* Se o Supabase exigir confirmação de e-mail, ainda não há sessão. */
      if (!authData.session) {
        setError(
          'A conta foi criada. Confirme o seu e-mail e depois toque em Entrar na página inicial.'
        );
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      /* Foto de perfil (opcional): quadrada, como no WhatsApp */
      let avatarUrl = null;

      if (avatarFile) {
        try {
          const blob = await resizeImage(avatarFile, {
            max: 640,
            square: true,
          });

          avatarUrl = await uploadPublicImage(
            supabase,
            'avatars',
            `${userId}/avatar.jpg`,
            blob
          );
        } catch (uploadError) {
          console.warn('Não foi possível enviar a foto:', uploadError);
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            name: fullName.trim(),
            country_id: countryId,
            province_id: provinceId,
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.error(profileError);

        setError(
          'A conta foi criada, mas não foi possível criar o seu perfil.'
        );

        setLoading(false);
        return;
      }

      /* Telefone e foto: guardados à parte para não bloquear o cadastro */
      const { error: extraError } = await supabase
        .from('profiles')
        .update({
          phone: fullPhone(dial, phone),
          avatar_url: avatarUrl,
        })
        .eq('id', userId);

      if (extraError) {
        console.warn(
          'Telefone/foto não guardados (faltam as colunas phone e avatar_url em profiles):',
          extraError
        );
      }

      router.push({
        pathname: '/explore',
        query: { country: countryId, province: provinceId },
      });
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro. Tente novamente.');
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
          <ImagePicker
            id="avatar"
            preview={avatarPreview}
            onFile={pickAvatar}
            caption="Toque para adicionar a sua foto"
          />

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
