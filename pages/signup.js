import { useEffect, useState } from 'react';
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

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '13px 14px',
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: C.white,
  fontSize: 15,
  outlineColor: C.green,
};

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  marginTop: 15,
  fontSize: 13,
  fontWeight: 800,
};

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function safeFileName(name) {
  return String(name || 'imagem')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-90);
}

export default function Signup() {
  const router = useRouter();

  const [step, setStep] = useState('type');
  const [accountType, setAccountType] = useState('cliente');

  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadCountries();
    loadCategories();
  }, []);

  useEffect(() => {
    if (countryId) {
      loadProvinces(countryId);
    } else {
      setProvinces([]);
      setProvinceId('');
    }
  }, [countryId]);

  useEffect(() => {
    if (categoryId) {
      loadSubcategories(categoryId);
    } else {
      setSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId]);

  async function loadCountries() {
    const { data, error: queryError } = await supabase
      .from('countries')
      .select('id, name')
      .order('name');

    if (queryError) {
      console.error('Erro ao carregar países:', queryError);
      setError('Não foi possível carregar os países. Atualize a página.');
      return;
    }

    setCountries(data || []);

    const angola = (data || []).find(
      (country) => normalize(country.name) === 'angola'
    );

    if (angola) setCountryId(angola.id);
  }

  async function loadProvinces(selectedCountryId) {
    const { data, error: queryError } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('country_id', selectedCountryId)
      .order('name');

    if (queryError) {
      console.error('Erro ao carregar províncias:', queryError);
      setProvinces([]);
      setError('Não foi possível carregar as províncias.');
      return;
    }

    setProvinces(data || []);
    setProvinceId('');
  }

  async function loadCategories() {
    const { data, error: queryError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (queryError) {
      console.error('Erro ao carregar categorias:', queryError);
      return;
    }

    setCategories(data || []);
  }

  async function loadSubcategories(selectedCategoryId) {
    const { data, error: queryError } = await supabase
      .from('subcategories')
      .select('id, name, category_id')
      .eq('category_id', selectedCategoryId)
      .order('name');

    if (queryError) {
      console.error('Erro ao carregar subcategorias:', queryError);
      setSubcategories([]);
      return;
    }

    setSubcategories(data || []);
    setSubcategoryId('');
  }

  function isAngolaSelected() {
    const country = countries.find((item) => item.id === countryId);
    return normalize(country?.name) === 'angola';
  }

  function countryAvailabilityMessage() {
    return 'País indisponível para a localização que se encontra. Escolha o país correto.';
  }

  function handleImage(file, setFile, setPreview) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecione um ficheiro de imagem válido.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('A imagem não pode ultrapassar 20 MB.');
      return;
    }

    setError('');
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function uploadImage(file, folder) {
    if (!file) return null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('A sessão expirou. Entre novamente.');

    const path = `${user.id}/${folder}/${Date.now()}-${safeFileName(
      file.name
    )}`;

    const { error: uploadError } = await supabase.storage
      .from('business-media')
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('business-media')
      .getPublicUrl(path);

    return data?.publicUrl || null;
  }

  function validateLocation() {
    if (!countryId) {
      setError('Selecione o seu país.');
      return false;
    }

    if (!isAngolaSelected()) {
      setError(countryAvailabilityMessage());
      return false;
    }

    if (!provinceId) {
      setError('Selecione a sua província em Angola.');
      return false;
    }

    return true;
  }

  function validateCredentials() {
    if (!name.trim()) {
      setError('Escreva o seu nome.');
      return false;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Escreva um endereço de e-mail válido.');
      return false;
    }

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return false;
    }

    if (!validateLocation()) return false;

    return true;
  }

  async function createAuthUser() {
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          account_type: accountType,
        },
      },
    });

    if (signupError) throw signupError;

    const user = data?.user;

    if (!user) {
      throw new Error('Não foi possível criar a conta. Tente novamente.');
    }

    if (!data.session) {
      return {
        user,
        needsEmailConfirmation: true,
      };
    }

    return {
      user,
      needsEmailConfirmation: false,
    };
  }

  async function saveProfile(userId, avatarUrl = null) {
    const profileData = {
      id: userId,
      name: name.trim(),
      country_id: countryId,
      province_id: provinceId,
      phone: phone.trim() || null,
      account_type: accountType,
    };

    if (avatarUrl) profileData.avatar_url = avatarUrl;

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) throw profileError;
  }

  async function handleCustomerSignup(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!validateCredentials()) return;

    setLoading(true);

    try {
      const result = await createAuthUser();

      if (result.needsEmailConfirmation) {
        setNotice(
          'A conta foi iniciada. Confirme o seu e-mail pelo link que recebeu para concluir o acesso.'
        );
        setStep('confirmation');
        return;
      }

      let avatarUrl = null;

      if (avatar) {
        avatarUrl = await uploadImage(avatar, 'profile');
      }

      await saveProfile(result.user.id, avatarUrl);

      await router.replace('/country');
    } catch (err) {
      console.error('Erro no cadastro do cliente:', err);
      setError(
        err?.message || 'Não foi possível criar a conta. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  function goToSellerDetails(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!validateCredentials()) return;

    setAccountType('vendedor');
    setStep('sellerBusiness');
  }

  async function handleSellerSignup(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!validateCredentials()) return;

    if (!businessName.trim()) {
      setError('Escreva o nome do seu negócio.');
      return;
    }

    if (!categoryId || !subcategoryId) {
      setError('Selecione a categoria e a subcategoria do negócio.');
      return;
    }

    if (!description.trim()) {
      setError('Escreva uma descrição breve do negócio.');
      return;
    }

    setLoading(true);

    try {
      const result = await createAuthUser();

      if (result.needsEmailConfirmation) {
        setNotice(
          'A conta foi iniciada. Confirme o seu e-mail pelo link que recebeu. Depois entre para continuar o registo do negócio.'
        );
        setStep('confirmation');
        return;
      }

      await saveProfile(result.user.id);

      let logoUrl = null;
      let mainImageUrl = null;

      if (logo) {
        logoUrl = await uploadImage(logo, 'logo');
      }

      if (mainImage) {
        mainImageUrl = await uploadImage(mainImage, 'main-image');
      }

      const businessData = {
        owner_id: result.user.id,
        name: businessName.trim(),
        description: description.trim(),
        country_id: countryId,
        province_id: provinceId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        municipality: municipality.trim() || null,
        neighborhood: neighborhood.trim() || null,
        whatsapp: whatsapp.trim() || phone.trim() || null,
        logo_url: logoUrl,
        is_active: false,
        approval_status: 'pending',
      };

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert(businessData)
        .select('id')
        .single();

      if (businessError) throw businessError;

      /*
       * A imagem principal já é carregada para business-media.
       * A ligação à galeria depende das colunas reais da tabela
       * business_photos. Não inventamos os nomes das colunas.
       */
      if (mainImageUrl) {
        sessionStorage.setItem(
          `talaza_pending_main_image_${business.id}`,
          mainImageUrl
        );
      }

      await router.replace(
        `/post-businesses?business=${encodeURIComponent(business.id)}`
      );
    } catch (err) {
      console.error('Erro no cadastro do vendedor:', err);
      setError(
        err?.message ||
          'Não foi possível registar o negócio. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  function chooseType(type) {
    setError('');
    setNotice('');
    setAccountType(type);
    setStep(type === 'cliente' ? 'customer' : 'sellerAccount');
  }

  function back() {
    setError('');
    setNotice('');

    if (step === 'customer' || step === 'sellerAccount') {
      setStep('type');
    } else if (step === 'sellerBusiness') {
      setStep('sellerAccount');
    } else if (step === 'confirmation') {
      setStep('type');
    }
  }

  const selectedCountry = countries.find((item) => item.id === countryId);
  const selectedCountryIsAngola =
    normalize(selectedCountry?.name) === 'angola';

  return (
    <>
      <Head>
        <title>Criar conta — Talaza</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.page}>
        <div style={styles.container}>
          <Link href="/start" style={styles.back}>
            ← Voltar ao início
          </Link>

          <div style={styles.brand}>
            <span style={styles.brandIcon}>T</span>
            <span>TALAZA</span>
          </div>

          {step !== 'type' && step !== 'confirmation' && (
            <button type="button" onClick={back} style={styles.backStep}>
              ← Voltar
            </button>
          )}

          {step === 'type' && (
            <>
              <h1 style={styles.title}>Que conta quer criar?</h1>
              <p style={styles.subtitle}>
                Escolha a opção que corresponde ao que pretende fazer no Talaza.
              </p>

              <button
                type="button"
                onClick={() => chooseType('cliente')}
                style={styles.typeCard}
              >
                <span style={styles.typeIcon}>🧭</span>
                <span style={styles.typeTitle}>Explorar Talaza</span>
                <span style={styles.typeDescription}>
                  Encontrar negócios, produtos, serviços e oportunidades perto
                  de si.
                </span>
                <span style={styles.arrow}>›</span>
              </button>

              <button
                type="button"
                onClick={() => chooseType('vendedor')}
                style={styles.typeCard}
              >
                <span style={{ ...styles.typeIcon, background: '#FBF1D7' }}>
                  🏪
                </span>
                <span style={styles.typeTitle}>Perfil de vendedor</span>
                <span style={styles.typeDescription}>
                  Criar o perfil do seu negócio e apresentar os seus produtos e
                  serviços.
                </span>
                <span style={styles.arrow}>›</span>
              </button>
            </>
          )}

          {(step === 'customer' || step === 'sellerAccount') && (
            <>
              <h1 style={styles.title}>
                {step === 'customer'
                  ? 'Criar conta de cliente'
                  : 'Dados da sua conta'}
              </h1>

              <p style={styles.subtitle}>
                {step === 'customer'
                  ? 'Adicione os seus dados e, se quiser, uma fotografia.'
                  : 'Esta é a primeira etapa do registo de vendedor.'}
              </p>

              <form
                onSubmit={
                  step === 'customer'
                    ? handleCustomerSignup
                    : goToSellerDetails
                }
                style={styles.form}
              >
                {step === 'customer' && (
                  <div style={styles.photoArea}>
                    <label htmlFor="customer-photo" style={styles.photoCircle}>
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Pré-visualização da fotografia"
                          style={styles.photoImage}
                        />
                      ) : (
                        <span style={{ fontSize: 30 }}>📷</span>
                      )}
                    </label>
                    <input
                      id="customer-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        handleImage(
                          event.target.files?.[0],
                          setAvatar,
                          setAvatarPreview
                        )
                      }
                      style={styles.fileInput}
                    />
                    <label htmlFor="customer-photo" style={styles.photoLink}>
                      Adicionar fotografia (opcional)
                    </label>
                  </div>
                )}

                <label htmlFor="name" style={labelStyle}>
                  Nome
                </label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="O seu nome"
                  autoComplete="name"
                  style={inputStyle}
                />

                <label htmlFor="email" style={labelStyle}>
                  E-mail
                </label>
                <input
                  id="email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="exemplo@email.com"
                  autoComplete="email"
                  style={inputStyle}
                />

                <label htmlFor="password" style={labelStyle}>
                  Palavra-passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Pelo menos 6 caracteres"
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: 85 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    style={styles.showButton}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                <label htmlFor="country" style={labelStyle}>
                  País
                </label>
                <select
                  id="country"
                  required
                  value={countryId}
                  onChange={(event) => {
                    setCountryId(event.target.value);
                    setProvinceId('');
                    setError('');
                  }}
                  style={inputStyle}
                >
                  <option value="">Selecione o país</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>

                {!selectedCountryIsAngola && countryId && (
                  <p style={styles.countryWarning}>
                    País indisponível para a localização que se encontra.
                    Escolha o país correto.
                  </p>
                )}

                <label htmlFor="province" style={labelStyle}>
                  Província
                </label>
                <select
                  id="province"
                  required
                  value={provinceId}
                  onChange={(event) => setProvinceId(event.target.value)}
                  style={inputStyle}
                  disabled={!countryId || !selectedCountryIsAngola}
                >
                  <option value="">Selecione a província</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="phone" style={labelStyle}>
                  Número de telefone (opcional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+244 9XX XXX XXX"
                  autoComplete="tel"
                  style={inputStyle}
                />

                {error && (
                  <div role="alert" style={styles.error}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submit,
                    marginTop: 22,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading
                    ? 'Aguarde…'
                    : step === 'customer'
                    ? 'Criar conta'
                    : 'Seguinte'}
                </button>
              </form>
            </>
          )}

          {step === 'sellerBusiness' && (
            <>
              <div style={styles.progressText}>Passo 2 de 2 — O seu negócio</div>
              <h1 style={styles.title}>Configure o seu negócio</h1>
              <p style={styles.subtitle}>
                Estas informações serão usadas para preparar o perfil da sua
                loja.
              </p>

              <form onSubmit={handleSellerSignup} style={styles.form}>
                <label htmlFor="business-name" style={labelStyle}>
                  Nome do negócio
                </label>
                <input
                  id="business-name"
                  required
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Ex.: Salão Beleza Real"
                  style={inputStyle}
                />

                <label htmlFor="category" style={labelStyle}>
                  Categoria
                </label>
                <select
                  id="category"
                  required
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="subcategory" style={labelStyle}>
                  Subcategoria
                </label>
                <select
                  id="subcategory"
                  required
                  value={subcategoryId}
                  onChange={(event) => setSubcategoryId(event.target.value)}
                  style={inputStyle}
                  disabled={!categoryId}
                >
                  <option value="">Selecione a subcategoria</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="description" style={labelStyle}>
                  Descrição
                </label>
                <textarea
                  id="description"
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Conte em poucas linhas o que o negócio oferece."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />

                <label htmlFor="whatsapp" style={labelStyle}>
                  WhatsApp do negócio (opcional)
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  placeholder="+244 9XX XXX XXX"
                  style={inputStyle}
                />

                <label htmlFor="municipality" style={labelStyle}>
                  Município (opcional)
                </label>
                <input
                  id="municipality"
                  value={municipality}
                  onChange={(event) => setMunicipality(event.target.value)}
                  placeholder="Município"
                  style={inputStyle}
                />

                <label htmlFor="neighborhood" style={labelStyle}>
                  Bairro (opcional)
                </label>
                <input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  placeholder="Bairro"
                  style={inputStyle}
                />

                <label htmlFor="business-logo" style={labelStyle}>
                  Logótipo (opcional)
                </label>
                <input
                  id="business-logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handleImage(
                      event.target.files?.[0],
                      setLogo,
                      setLogoPreview
                    )
                  }
                  style={styles.nativeFile}
                />

                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Pré-visualização do logótipo"
                    style={styles.previewLogo}
                  />
                )}

                <label htmlFor="main-image" style={labelStyle}>
                  Imagem principal (opcional)
                </label>
                <input
                  id="main-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handleImage(
                      event.target.files?.[0],
                      setMainImage,
                      setMainImagePreview
                    )
                  }
                  style={styles.nativeFile}
                />

                {mainImagePreview && (
                  <img
                    src={mainImagePreview}
                    alt="Pré-visualização da imagem principal"
                    style={styles.previewMain}
                  />
                )}

                {error && (
                  <div role="alert" style={styles.error}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submit,
                    marginTop: 22,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'A criar conta e negócio…' : 'Criar conta e negócio'}
                </button>
              </form>
            </>
          )}

          {step === 'confirmation' && (
            <section style={styles.form}>
              <h1 style={styles.title}>Confirme o seu e-mail</h1>
              <p style={styles.subtitle}>
                {notice ||
                  'Abra o e-mail enviado pelo Supabase e siga o link de confirmação.'}
              </p>
              <Link href="/login" style={styles.submitLink}>
                Ir para entrar
              </Link>
            </section>
          )}

          {notice && step !== 'confirmation' && (
            <div role="status" style={styles.notice}>
              {notice}
            </div>
          )}

          {step !== 'type' && step !== 'confirmation' && (
            <p style={styles.bottomText}>
              Já tem conta?{' '}
              <Link href="/login" style={styles.link}>
                Entrar
              </Link>
            </p>
          )}
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
    padding: '24px 16px 48px',
    fontFamily:
      "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
  back: {
    color: C.green,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 800,
  },
  backStep: {
    margin: '4px 0 16px',
    display: 'block',
    padding: 0,
    border: 0,
    background: 'transparent',
    color: C.green,
    fontWeight: 800,
    cursor: 'pointer',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    margin: '26px 0 30px',
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
    fontWeight: 900,
    margin: '0 0 8px',
  },
  subtitle: {
    color: C.muted,
    fontSize: 15,
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  typeCard: {
    position: 'relative',
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: `1px solid ${C.line}`,
    borderRadius: 18,
    background: C.white,
    padding: 18,
    marginBottom: 13,
    cursor: 'pointer',
  },
  typeIcon: {
    display: 'grid',
    placeItems: 'center',
    width: 48,
    height: 48,
    borderRadius: 14,
    background: '#E8F3F0',
    fontSize: 23,
    marginBottom: 12,
  },
  typeTitle: {
    display: 'block',
    fontSize: 17,
    fontWeight: 900,
    marginBottom: 5,
    color: C.ink,
  },
  typeDescription: {
    display: 'block',
    maxWidth: '90%',
    color: C.muted,
    fontSize: 14,
    lineHeight: 1.55,
  },
  arrow: {
    position: 'absolute',
    right: 18,
    top: 20,
    fontSize: 26,
    color: C.muted,
  },
  form: {
    border: `1px solid ${C.line}`,
    borderRadius: 20,
    padding: 18,
    background: C.white,
  },
  photoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '4px 0 20px',
  },
  photoCircle: {
    width: 108,
    height: 108,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    background: '#E8F3F0',
    border: '2px dashed #8FC4B6',
    cursor: 'pointer',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  fileInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  },
  photoLink: {
    marginTop: 9,
    color: C.green,
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  showButton: {
    position: 'absolute',
    right: 7,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 0,
    background: 'transparent',
    color: C.green,
    fontWeight: 800,
    cursor: 'pointer',
    padding: 8,
  },
  countryWarning: {
    color: C.red,
    background: '#FCEBED',
    padding: 10,
    borderRadius: 9,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '8px 0 0',
  },
  error: {
    marginTop: 16,
    borderRadius: 10,
    padding: 12,
    background: '#FCEBED',
    color: C.red,
    fontSize: 13,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  },
  notice: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: '#E8F3F0',
    color: C.dark,
    fontSize: 13,
    lineHeight: 1.5,
    overflowWrap: 'anywhere',
  },
  submit: {
    display: 'block',
    width: '100%',
    padding: 15,
    border: 0,
    borderRadius: 12,
    background: C.green,
    color: C.white,
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
  },
  submitLink: {
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    padding: 15,
    borderRadius: 12,
    background: C.green,
    color: C.white,
    fontSize: 15,
    fontWeight: 900,
  },
  nativeFile: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    border: `1px dashed ${C.line}`,
    borderRadius: 12,
    background: C.bg,
    fontSize: 13,
  },
  previewLogo: {
    display: 'block',
    width: 90,
    height: 90,
    objectFit: 'cover',
    borderRadius: 18,
    marginTop: 12,
  },
  previewMain: {
    display: 'block',
    width: '100%',
    maxHeight: 220,
    objectFit: 'cover',
    borderRadius: 14,
    marginTop: 12,
  },
  progressText: {
    color: C.green,
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 10,
  },
  bottomText: {
    textAlign: 'center',
    marginTop: 20,
    color: C.muted,
    fontSize: 14,
  },
  link: {
    color: C.green,
    fontWeight: 900,
    textDecoration: 'none',
  },
};
