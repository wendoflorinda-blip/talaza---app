import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Progress,
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

const DAYS_OPTIONS = [
  'Segunda a sexta',
  'Segunda a sábado',
  'Todos os dias',
  'Fins de semana',
];

export default function PostBusiness() {
  const [step, setStep] = useState(1);
  const [blockedCountry, setBlockedCountry] = useState('');

  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');

  /* Passo 1: os dados do vendedor */
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryId, setCountryId] = useState('');
  const [password, setPassword] = useState('');

  /* Passo 2: o negócio */
  const [storeName, setStoreName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [days, setDays] = useState(DAYS_OPTIONS[0]);
  const [opensAt, setOpensAt] = useState('08:00');
  const [closesAt, setClosesAt] = useState('18:00');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  /* Listas */
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  /* Resultado */
  const [businessId, setBusinessId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const country = countries.find((c) => c.id === countryId);
  const dial = countryInfo(country?.name).dial;

  useEffect(() => {
    loadCountries();
    loadCategories();
    checkSession();
  }, []);

  useEffect(() => {
    setProvinceId('');

    if (!countryId) {
      setProvinces([]);
      return;
    }

    loadProvinces(countryId);
  }, [countryId]);

  useEffect(() => {
    setSubcategoryId('');

    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    loadSubcategories(categoryId);
  }, [categoryId]);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    setUser(session.user);
    setEmail(session.user.email || '');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, country_id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile?.name) setProfileName(profile.name);
    if (profile?.country_id) setCountryId(profile.country_id);
  }

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
      return;
    }

    setProvinces(data || []);
  }

  async function loadCategories() {
    const { data, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error(categoriesError);
      setError('Não foi possível carregar as categorias.');
      return;
    }

    setCategories(data || []);
  }

  async function loadSubcategories(id) {
    const { data, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('id, name')
      .eq('category_id', id)
      .order('name', { ascending: true });

    if (subcategoriesError) {
      console.error(subcategoriesError);
      setError('Não foi possível carregar as subcategorias.');
      return;
    }

    setSubcategories(data || []);
  }

  function pickLogo(file) {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function pickCover(file) {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  // Passo 1: criar a conta

  async function ensureAccount() {
    if (user) return user;

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signupError) {
      console.error(signupError);

      setError(
        signupError.message?.toLowerCase().includes('already registered')
          ? 'Este e-mail já tem uma conta. Volte à página inicial e toque em Entrar.'
          : signupError.message || 'Não foi possível criar a sua conta.'
      );

      return null;
    }

    if (!data?.user) {
      setError('Não foi possível criar a sua conta.');
      return null;
    }

    /* Se o Supabase exigir confirmação de e-mail, ainda não há sessão. */
    if (!data.session) {
      setError(
        'A conta foi criada. Confirme o seu e-mail e depois toque em Entrar na página inicial para concluir o perfil do negócio.'
      );
      return null;
    }

    setUser(data.user);

    return data.user;
  }

  async function handleStep1(e) {
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

    if (!email.trim()) {
      setError('Digite o seu e-mail.');
      return;
    }

    if (!validAngolanPhone(phone, dial)) {
      setError(
        'Digite um número de telefone válido, com 9 dígitos (ex.: 923 456 789).'
      );
      return;
    }

    if (!user && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const account = await ensureAccount();

    setLoading(false);

    if (!account) return;

    setStep(2);
    window.scrollTo(0, 0);
  }

  // Passo 2: criar o negócio

  async function handleStep2(e) {
    e.preventDefault();
    setError('');

    if (!storeName.trim()) {
      setError('Digite o nome da loja.');
      return;
    }

    if (!categoryId) {
      setError('Escolha uma categoria.');
      return;
    }

    if (!subcategoryId) {
      setError('Escolha uma subcategoria.');
      return;
    }

    if (!provinceId) {
      setError('Escolha a província.');
      return;
    }

    if (whatsapp.trim() && !validAngolanPhone(whatsapp, dial)) {
      setError('O contacto deve ter 9 dígitos (ex.: 923 456 789).');
      return;
    }

    if (!user) {
      setError('A sessão expirou. Volte ao passo 1.');
      return;
    }

    setLoading(true);

    try {
      const userId = user.id;
      const stamp = Date.now();

      /* Imagens (opcionais) */
      let logoUrl = null;
      let coverUrl = null;

      if (logoFile) {
        try {
          const blob = await resizeImage(logoFile, {
            max: 640,
            square: true,
          });

          logoUrl = await uploadPublicImage(
            supabase,
            'business-media',
            `${userId}/logo-${stamp}.jpg`,
            blob
          );
        } catch (uploadError) {
          console.warn('Não foi possível enviar o logo:', uploadError);
        }
      }

      if (coverFile) {
        try {
          const blob = await resizeImage(coverFile, { max: 1280 });

          coverUrl = await uploadPublicImage(
            supabase,
            'business-media',
            `${userId}/vitrine-${stamp}.jpg`,
            blob
          );
        } catch (uploadError) {
          console.warn(
            'Não foi possível enviar a imagem de vitrine:',
            uploadError
          );
        }
      }

      /*
        O login procura o negócio pelo país e pela província do perfil,
        por isso o perfil fica com a mesma localização do negócio.
      */
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          name: profileName || storeName.trim(),
          country_id: countryId,
          province_id: provinceId,
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.error(profileError);

        setError(
          'Não foi possível criar o seu perfil Talaza. Verifique os dados e tente novamente.'
        );

        setLoading(false);
        return;
      }

      const newBusinessId = crypto.randomUUID();

      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          id: newBusinessId,
          owner_id: userId,
          name: storeName.trim(),
          description: description.trim() || null,
          country_id: countryId,
          province_id: provinceId,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          municipality: municipality.trim() || null,
          neighborhood: neighborhood.trim() || null,
          phone: fullPhone(dial, phone) || null,
          whatsapp: fullPhone(dial, whatsapp) || null,
          email: (user.email || email).trim().toLowerCase(),
          opening_hours: `${days}, ${opensAt} às ${closesAt}`,
          logo_url: logoUrl,
          is_active: false,
          approval_status: 'pending',
        });

      if (businessError) {
        console.error(businessError);

        setError(
          'A conta foi criada, mas não foi possível criar o perfil do negócio. Verifique as permissões do Supabase.'
        );

        setLoading(false);
        return;
      }

      /* Imagem de vitrine: guardada à parte para não bloquear o cadastro */
      if (coverUrl) {
        const { error: coverError } = await supabase
          .from('businesses')
          .update({ cover_url: coverUrl })
          .eq('id', newBusinessId);

        if (coverError) {
          console.warn(
            'Imagem de vitrine não guardada (falta a coluna cover_url em businesses):',
            coverError
          );
        }
      }

      setBusinessId(newBusinessId);
      setStep(3);
      setLoading(false);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
      setLoading(false);
    }
  }

  // Ecrãs

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

  /* Passo 3: perfil criado, pendente */
  if (step === 3) {
    const displayName = storeName.trim() || 'Nome da loja';
    const initial = displayName.charAt(0).toLocaleUpperCase('pt-AO');

    return (
      <AuthShell backHref="/" backLabel="Início">
        <Head>
          <title>O seu perfil | Talaza</title>
        </Head>

        <Progress current={3} total={5} label="confirme o perfil" />

        <div
          style={{
            marginTop: 22,
            background: '#FFFFFF',
            borderRadius: 22,
            overflow: 'hidden',
            border: `1px solid ${C.line}`,
            boxShadow: '0 10px 26px rgba(19,35,30,.08)',
          }}
        >
          <div
            style={{
              padding: '14px 16px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <strong
              style={{
                fontSize: 17,
                color: C.ink,
                overflowWrap: 'anywhere',
              }}
            >
              {displayName}
            </strong>

            <span
              style={{
                padding: '5px 11px',
                borderRadius: 999,
                background: C.goldSoft,
                color: '#7A5600',
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Pendente
            </span>
          </div>

          <div
            style={{
              height: 160,
              background: coverPreview
                ? `center / cover no-repeat url(${coverPreview})`
                : 'linear-gradient(135deg,#9CC9BD,#5FA897)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {!coverPreview && 'Imagem de vitrine'}
          </div>

          <div
            style={{
              width: 78,
              height: 78,
              margin: '-39px 0 0 18px',
              position: 'relative',
              borderRadius: '50%',
              border: '4px solid #FFFFFF',
              background: logoPreview
                ? `center / cover no-repeat url(${logoPreview})`
                : C.goldSoft,
              color: C.gold,
              fontSize: 28,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!logoPreview && initial}
          </div>

          <div style={{ padding: '10px 18px 20px' }}>
            <p
              style={{
                margin: '6px 0 16px',
                color: C.muted,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {description.trim() ||
                'A descrição do seu negócio aparece aqui.'}
            </p>

            <Link
              href={{
                pathname: `/businesses/${businessId}`,
                query: { country: countryId, province: provinceId },
              }}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: 14,
                borderRadius: 12,
                border: `1.5px solid ${C.green}`,
                color: C.green,
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Ver perfil
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            background: C.goldSoft,
            border: '1px solid #F0D98A',
            color: C.ink,
            fontSize: 14.5,
            lineHeight: 1.55,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>
            O seu perfil já foi criado
          </strong>
          Para ativar, precisa de pagar o plano de hospedagem.
        </div>

        <Link
          href={{
            pathname: '/impulsionar',
            query: { business: businessId, tab: 'hospedagem' },
          }}
          style={{
            display: 'block',
            marginTop: 20,
            textAlign: 'center',
            padding: 16,
            borderRadius: 14,
            background: C.gold,
            color: C.ink,
            fontSize: 16,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          Ver hospedagem
        </Link>
      </AuthShell>
    );
  }

  /* Passo 2: configurar o negócio */
  if (step === 2) {
    return (
      <AuthShell
        onBack={() => {
          setError('');
          setStep(1);
        }}
      >
        <Head>
          <title>Configure o seu negócio | Talaza</title>
        </Head>

        <Progress current={2} total={5} label="o seu negócio" />

        <Card>
          <h1 style={{ margin: '0 0 6px', color: C.ink, fontSize: 26 }}>
            Configure o seu negócio
          </h1>

          <p
            style={{
              margin: 0,
              color: C.muted,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Estas informações aparecem no perfil da sua loja.
          </p>

          <form onSubmit={handleStep2} noValidate>
            <Field id="storeName" label="Nome da loja" required>
              <input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex.: Boutique Flor"
                style={inputStyle}
              />
            </Field>

            <div style={{ marginTop: 20 }}>
              <ImagePicker
                id="logo"
                preview={logoPreview}
                onFile={pickLogo}
                icon="🖼️"
                caption="Logo da loja"
              />
            </div>

            <Field id="category" label="Categoria" required>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Escolher categoria</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {String(category.name).trim()}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="subcategory" label="Subcategoria" required>
              <select
                id="subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!categoryId}
                style={inputStyle}
              >
                <option value="">
                  {categoryId
                    ? 'Escolher subcategoria'
                    : 'Escolha primeiro a categoria'}
                </option>

                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {String(subcategory.name).trim()}
                  </option>
                ))}
              </select>
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                gap: 14,
              }}
            >
              <Field id="municipality" label="Município">
                <input
                  id="municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Ex.: Talatona"
                  style={inputStyle}
                />
              </Field>

              <Field id="neighborhood" label="Bairro">
                <input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex.: Benfica"
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field id="description" label="Descrição">
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Conte em poucas linhas o que o seu negócio oferece."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </Field>

            <Field id="whatsapp" label="Contacto">
              <PhoneField
                id="whatsapp"
                countryName={country?.name}
                value={whatsapp}
                onChange={setWhatsapp}
              />
            </Field>

            <Field id="days" label="Horário de atendimento">
              <select
                id="days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              >
                {DAYS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <input
                  type="time"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  aria-label="Abre às"
                  style={inputStyle}
                />

                <input
                  type="time"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  aria-label="Fecha às"
                  style={inputStyle}
                />
              </div>
            </Field>

            <div style={{ marginTop: 18 }}>
              <span
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 700,
                  color: C.ink,
                  fontSize: 14,
                }}
              >
                Imagem de vitrine
              </span>

              <ImagePicker
                id="cover"
                shape="rect"
                preview={coverPreview}
                onFile={pickCover}
                icon="🖼️"
                caption="É a imagem principal que os clientes vão ver"
              />
            </div>

            <ErrorBox>{error}</ErrorBox>

            <PrimaryButton type="submit" loading={loading}>
              {loading ? 'A criar o seu perfil…' : 'Seguinte'}
            </PrimaryButton>
          </form>
        </Card>
      </AuthShell>
    );
  }

  /* Passo 1: dados do vendedor */
  return (
    <AuthShell backHref="/start">
      <Head>
        <title>Perfil de vendedor | Talaza</title>
      </Head>

      <Progress current={1} total={5} label="os seus dados" />

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
          Perfil de vendedor
        </div>

        <h1 style={{ margin: '14px 0 6px', color: C.ink, fontSize: 26 }}>
          Crie a sua conta de vendedor
        </h1>

        <p
          style={{
            margin: 0,
            color: C.muted,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Uma conta para criar o perfil do seu negócio e mostrar os seus
          produtos e serviços a quem procura.
        </p>

        <form onSubmit={handleStep1} noValidate>
          <Field id="email" label="E-mail" required>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              disabled={!!user}
              style={{
                ...inputStyle,
                background: user ? '#F1F4F3' : '#FFFFFF',
              }}
            />
          </Field>

          <Field id="phone" label="Número de telefone" required>
            <PhoneField
              id="phone"
              countryName={country?.name}
              value={phone}
              onChange={setPhone}
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

          {!user && (
            <Field id="password" label="Senha" required>
              <PasswordField
                id="password"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo de 6 caracteres"
              />
            </Field>
          )}

          <ErrorBox>{error}</ErrorBox>

          <PrimaryButton type="submit" loading={loading}>
            {loading ? 'A criar a conta…' : 'Seguinte'}
          </PrimaryButton>
        </form>
      </Card>
    </AuthShell>
  );
}
