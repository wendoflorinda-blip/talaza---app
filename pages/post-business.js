import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function PostBusiness() {
  const router = useRouter();
  const { country, province } = router.query;

  const [user, setUser] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);

  const [mode, setMode] = useState('choice');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');

  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  const [openingHours, setOpeningHours] = useState('');

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    checkUser();
    loadCategories();
    loadLocation();
  }, [router.isReady]);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user || null);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profile?.name) {
        setFullName(profile.name);
      }

      setMode('business');
    }

    setLoadingPage(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (!error) {
      setCategories(data || []);
    }
  }

  async function loadLocation() {
    if (!country || !province) return;

    const { data: countryData } = await supabase
      .from('countries')
      .select('name')
      .eq('id', country)
      .single();

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('name')
      .eq('id', province)
      .single();

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData?.name || '');
  }

  async function loadSubcategories(selectedCategory) {
    setSubcategoryId('');
    setSubcategories([]);

    if (!selectedCategory) return;

    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, description')
      .eq('category_id', selectedCategory)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setError('Não foi possível carregar as subcategorias.');
      return;
    }

    setSubcategories(data || []);
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
      setError('Não foi possível criar a conta.');
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

    setUser(data.user);
    setMode('business');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .single();

    if (profile?.name) {
      setFullName(profile.name);
    }

    setLoading(false);
  }

  async function handleCreateBusiness(e) {
    e.preventDefault();

    setError('');

    if (!businessName.trim()) {
      setError('Digite o nome do negócio.');
      return;
    }

    if (!categoryId) {
      setError('Selecione uma categoria.');
      return;
    }

    if (!subcategoryId) {
      setError('Selecione uma subcategoria.');
      return;
    }

    if (!municipality.trim()) {
      setError('Digite o município.');
      return;
    }

    setLoading(true);

    const {
      data,
      error: businessError,
    } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: businessName.trim(),
        description: description.trim() || null,
        country_id: country || null,
        province_id: province || null,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        municipality: municipality.trim(),
        neighborhood: neighborhood.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: businessEmail.trim() || null,
        opening_hours: openingHours.trim() || null,
        is_active: true,
        approval_status: 'pending',
      })
      .select('id')
      .single();

    if (businessError) {
      console.error(businessError);
      setError(
        businessError.message ||
          'Não foi possível criar o perfil do negócio.'
      );
      setLoading(false);
      return;
    }

    if (!data?.id) {
      setError('O perfil foi criado, mas não foi possível obter o seu endereço.');
      setLoading(false);
      return;
    }

    setCreated(true);
    setLoading(false);
  }

  if (loadingPage) {
    return (
      <Page>
        <div style={loadingText}>A preparar o seu espaço…</div>
      </Page>
    );
  }

  if (!user && mode === 'choice') {
    return (
      <Page>
        <TopBar
          back={{
            pathname: '/start',
            query: { country, province },
          }}
        />

        <div style={intro}>
          <Badge>Perfil de negócio</Badge>

          <h1 style={title}>Como deseja continuar?</h1>

          <p style={subtitle}>
            Para criar e gerir um perfil de negócio, precisa de uma conta
            Talaza.
          </p>
        </div>

        <div style={choiceGrid}>
          <button
            onClick={() => {
              setError('');
              setMode('login');
            }}
            style={choiceCard}
          >
            <div style={choiceIcon}>↪</div>

            <h2 style={choiceTitle}>Já tenho conta</h2>

            <p style={choiceText}>
              Entre na sua conta e continue para criar o seu perfil de negócio.
            </p>
          </button>

          <button
            onClick={() => {
              setError('');
              setMode('signup');
            }}
            style={choiceCardGreen}
          >
            <div style={choiceIconGold}>+</div>

            <h2 style={{ ...choiceTitle, color: '#FFFFFF' }}>
              Criar conta
            </h2>

            <p style={{ ...choiceText, color: 'rgba(255,255,255,0.78)' }}>
              Crie a sua conta Talaza e comece a apresentar o seu negócio.
            </p>
          </button>
        </div>
      </Page>
    );
  }

  if (mode === 'login') {
    return (
      <AuthPage
        title="Entrar na sua conta"
        subtitle="Entre na Talaza para continuar a criação do seu negócio."
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
        subtitle="A sua conta será usada para gerir o seu perfil de negócio."
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

  if (created) {
    return (
      <Page>
        <TopBar href="/explore" />

        <div
          style={{
            maxWidth: 620,
            margin: '70px auto 0',
            textAlign: 'center',
            background: '#FFFFFF',
            borderRadius: 28,
            padding: '45px 28px',
            boxShadow: '0 15px 40px rgba(0,70,60,0.08)',
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: '#EAF4F1',
              color: '#075B4E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              margin: '0 auto 20px',
            }}
          >
            ✓
          </div>

          <h1
            style={{
              color: '#17342F',
              margin: 0,
              fontSize: 30,
            }}
          >
            Perfil criado
          </h1>

          <p
            style={{
              color: '#66736F',
              lineHeight: 1.7,
              margin: '15px auto 25px',
              maxWidth: 500,
            }}
          >
            O seu perfil de negócio foi registado na Talaza e está a aguardar
            aprovação.
          </p>

          <div
            style={{
              background: '#FFF8E6',
              border: '1px solid #F0D98A',
              color: '#765900',
              borderRadius: 14,
              padding: 15,
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: 25,
            }}
          >
            Depois da aprovação, o negócio poderá aparecer publicamente na
            Vitrine da Talaza.
          </div>

          <Link
            href={{
              pathname: '/explore',
              query: { country, province },
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#075B4E',
              color: '#FFFFFF',
              textDecoration: 'none',
              borderRadius: 13,
              padding: '14px 24px',
              fontWeight: 800,
            }}
          >
            Voltar para a Vitrine
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <TopBar
        back={{
          pathname: '/start',
          query: { country, province },
        }}
      />

      <div style={{ maxWidth: 820, margin: '35px auto 0' }}>
        <div style={{ marginBottom: 28 }}>
          <Badge>Cadastro do negócio</Badge>

          <h1
            style={{
              ...title,
              textAlign: 'left',
              marginTop: 12,
            }}
          >
            Apresente o seu negócio
          </h1>

          <p
            style={{
              ...subtitle,
              textAlign: 'left',
              margin: '10px 0 0',
            }}
          >
            Preencha as informações principais. Poderemos acrescentar fotos,
            produtos e outros recursos na próxima etapa.
          </p>
        </div>

        <form
          onSubmit={handleCreateBusiness}
          style={{
            background: '#FFFFFF',
            borderRadius: 26,
            padding: '28px 24px',
            boxShadow: '0 15px 40px rgba(0,70,60,0.08)',
          }}
        >
          <SectionTitle
            number="01"
            title="Informações do negócio"
          />

          <div style={field}>
            <label style={label}>Nome do negócio *</label>

            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex.: Florinda Boutique"
              style={input}
            />
          </div>

          <div style={field}>
            <label style={label}>Descrição</label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte brevemente o que o seu negócio oferece..."
              style={{
                ...input,
                minHeight: 120,
                resize: 'vertical',
              }}
            />
          </div>

          <SectionTitle
            number="02"
            title="Categoria"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 16,
            }}
          >
            <div style={field}>
              <label style={label}>Categoria *</label>

              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  loadSubcategories(e.target.value);
                }}
                style={input}
              >
                <option value="">Escolha uma categoria</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={field}>
              <label style={label}>Subcategoria *</label>

              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                style={input}
                disabled={!categoryId}
              >
                <option value="">
                  {categoryId
                    ? 'Escolha uma subcategoria'
                    : 'Escolha primeiro a categoria'}
                </option>

                {subcategories.map((subcategory) => (
                  <option
                    key={subcategory.id}
                    value={subcategory.id}
                  >
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SectionTitle
            number="03"
            title="Localização"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
            }}
          >
            <div style={field}>
              <label style={label}>País</label>
              <input
                value={countryName}
                readOnly
                style={{
                  ...input,
                  background: '#F4F7F6',
                }}
              />
            </div>

            <div style={field}>
              <label style={label}>Província</label>
              <input
                value={provinceName}
                readOnly
                style={{
                  ...input,
                  background: '#F4F7F6',
                }}
              />
            </div>

            <div style={field}>
              <label style={label}>Município *</label>

              <input
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Ex.: Talatona"
                style={input}
              />
            </div>

            <div style={field}>
              <label style={label}>Bairro</label>

              <input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex.: Benfica"
                style={input}
              />
            </div>
          </div>

          <div style={field}>
            <label style={label}>Endereço</label>

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, edifício ou referência"
              style={input}
            />
          </div>

          <SectionTitle
            number="04"
            title="Contactos"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
            }}
          >
            <div style={field}>
              <label style={label}>Telefone</label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex.: 923 000 000"
                style={input}
              />
            </div>

            <div style={field}>
              <label style={label}>WhatsApp</label>

              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex.: 923 000 000"
                style={input}
              />
            </div>

            <div style={field}>
              <label style={label}>E-mail do negócio</label>

              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="negocio@exemplo.com"
                style={input}
              />
            </div>
          </div>

          <SectionTitle
            number="05"
            title="Horário de funcionamento"
          />

          <div style={field}>
            <label style={label}>Horário</label>

            <textarea
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="Ex.: Segunda a sexta, 08h às 18h. Sábado, 09h às 14h."
              style={{
                ...input,
                minHeight: 90,
                resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: 14,
                borderRadius: 13,
                background: '#FFF0F0',
                color: '#A32929',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 25,
              padding: 15,
              borderRadius: 14,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            A localização escolhida no início já está associada a este
            cadastro. O município e o bairro ajudam as pessoas a encontrarem
            o seu negócio com mais facilidade.
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 20,
              border: 'none',
              borderRadius: 14,
              padding: '16px 20px',
              background: loading ? '#9DB8B2' : '#E6A900',
              color: '#17342F',
              fontWeight: 900,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? 'A criar o perfil…'
              : 'Criar perfil de negócio →'}
          </button>
        </form>
      </div>
    </Page>
  );
}

/* COMPONENTES */

function Page({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        padding: '20px 16px 60px',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: 1000,
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TopBar({ back, href }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 35,
      }}
    >
      <Link
        href={
          back || href || {
            pathname: '/explore',
          }
        }
        style={{
          color: '#075B4E',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        ← Voltar
      </Link>

      <Link
        href="/"
        style={{
          color: '#075B4E',
          textDecoration: 'none',
          fontWeight: 900,
          fontSize: 23,
          letterSpacing: 1,
        }}
      >
        TALAZA
      </Link>
    </div>
  );
}

function Badge({ children }) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '8px 14px',
        borderRadius: 999,
        background: '#EAF4F1',
        color: '#075B4E',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ number, title }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '28px 0 18px',
        paddingBottom: 10,
        borderBottom: '1px solid #E4EBE8',
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: '#075B4E',
          color: '#E6A900',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        {number}
      </span>

      <h2
        style={{
          margin: 0,
          color: '#17342F',
          fontSize: 18,
        }}
      >
        {title}
      </h2>
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
    <Page>
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
          maxWidth: 520,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              color: '#075B4E',
              fontSize: 23,
              fontWeight: 900,
              letterSpacing: 1,
              marginBottom: 22,
            }}
          >
            TALAZA
          </div>

          <h1
            style={{
              margin: 0,
              color: '#17342F',
              fontSize: 31,
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
            <div style={field}>
              <label style={label}>Nome</label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                style={input}
              />
            </div>
          )}

          <div style={field}>
            <label style={label}>E-mail</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              style={input}
            />
          </div>

          <div style={field}>
            <label style={label}>Palavra-passe</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="A sua palavra-passe"
              style={input}
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
    </Page>
  );
}

/* ESTILOS */

const title = {
  margin: 0,
  color: '#17342F',
  fontSize: 'clamp(30px, 6vw, 42px)',
  lineHeight: 1.15,
};

const subtitle = {
  maxWidth: 560,
  margin: '15px auto 0',
  color: '#66736F',
  fontSize: 15,
  lineHeight: 1.6,
};

const loadingText = {
  minHeight: '70vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#075B4E',
  fontWeight: 700,
};

const intro = {
  textAlign: 'center',
  marginBottom: 35,
};

const choiceGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 18,
  maxWidth: 760,
  margin: '0 auto',
};

const choiceCard = {
  border: '2px solid #075B4E',
  background: '#FFFFFF',
  borderRadius: 22,
  padding: 28,
  textAlign: 'left',
  cursor: 'pointer',
};

const choiceCardGreen = {
  border: 'none',
  background: 'linear-gradient(145deg, #075B4E, #0B7563)',
  color: '#FFFFFF',
  borderRadius: 22,
  padding: 28,
  textAlign: 'left',
  cursor: 'pointer',
};

const choiceIcon = {
  fontSize: 28,
  marginBottom: 15,
};

const choiceIconGold = {
  fontSize: 28,
  marginBottom: 15,
  color: '#E6A900',
};

const choiceTitle = {
  margin: '0 0 8px',
  color: '#075B4E',
  fontSize: 21,
};

const choiceText = {
  margin: 0,
  color: '#66736F',
  lineHeight: 1.55,
  fontSize: 14,
};

const field = {
  marginBottom: 17,
};

const label = {
  display: 'block',
  marginBottom: 7,
  color: '#17342F',
  fontSize: 13,
  fontWeight: 800,
};

const input = {
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

               
      
        
          
                
          
      
