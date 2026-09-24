  import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function PostBusiness() {
  const router = useRouter();
  const { country, province } = router.query;

  const [mode, setMode] = useState('choice');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [user, setUser] = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  const [fullName, setFullName] = useState('');

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

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    loadCategories();

    const checkSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
      }
    };

    checkSession();
  }, [router.isReady]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId('');
      return;
    }

    loadSubcategories(categoryId);
  }, [categoryId]);

  async function loadCategories() {
    setLoadingData(true);

    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setError('Não foi possível carregar as categorias.');
    } else {
      setCategories(data || []);
    }

    setLoadingData(false);
  }

  async function loadSubcategories(category) {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name')
      .eq('category_id', category)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setError('Não foi possível carregar as subcategorias.');
      return;
    }

    setSubcategories(data || []);
  }

  async function handleLogin(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    const cleanEmail = email.trim();

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

    if (loginError) {
      console.error(loginError);
      setError('E-mail ou palavra-passe incorretos.');
      setLoading(false);
      return;
    }

    if (!data?.user) {
      setError('Não foi possível entrar na conta.');
      setLoading(false);
      return;
    }

    setUser(data.user);
    setEmail(cleanEmail);

    /*
      IMPORTANTE:
      Se o utilizador foi criado diretamente no Supabase Auth,
      pode ainda não existir uma linha correspondente em profiles.

      Aqui criamos/preparamos automaticamente o perfil.
    */

    const { data: existingProfile, error: profileCheckError } =
      await supabase
        .from('profiles')
        .select('id, name, country_id, province_id')
        .eq('id', data.user.id)
        .maybeSingle();

    if (profileCheckError) {
      console.error(profileCheckError);
    }

    if (existingProfile) {
      setFullName(existingProfile.name || '');
      setProfileReady(true);
    } else {
      setProfileReady(false);
    }

    setMode('business');
    setLoading(false);
  }

  async function prepareProfile() {
    if (!user) {
      setError('É necessário entrar na conta primeiro.');
      return false;
    }

    if (!fullName.trim()) {
      setError('Digite o seu nome.');
      return false;
    }

    if (!country || !province) {
      setError(
        'A localização não foi definida. Volte e escolha o país e a província.'
      );
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          name: fullName.trim(),
          country_id: country,
          province_id: province
        },
        {
          onConflict: 'id'
        }
      );

    if (error) {
      console.error(error);
      setError(
        'Não foi possível preparar o seu perfil. Verifique se entrou com a conta correta.'
      );
      return false;
    }

    setProfileReady(true);
    return true;
  }

  async function handleBusinessSubmit(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      if (!user) {
        setError('Entre na sua conta antes de continuar.');
        setLoading(false);
        return;
      }

      if (!fullName.trim()) {
        setError('Digite o seu nome.');
        setLoading(false);
        return;
      }

      if (!businessName.trim()) {
        setError('Digite o nome do negócio.');
        setLoading(false);
        return;
      }

      if (!categoryId) {
        setError('Escolha uma categoria.');
        setLoading(false);
        return;
      }

      if (!subcategoryId) {
        setError('Escolha uma subcategoria.');
        setLoading(false);
        return;
      }

      /*
        Primeiro garantimos que o perfil existe.
      */

      const profileOk = await prepareProfile();

      if (!profileOk) {
        setLoading(false);
        return;
      }

      /*
        Agora criamos o negócio.
      */

      const { data: business, error: businessError } =
        await supabase
          .from('businesses')
          .insert({
            owner_id: user.id,
            name: businessName.trim(),
            description: description.trim() || null,
            country_id: country,
            province_id: province,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            municipality: municipality.trim() || null,
            neighborhood: neighborhood.trim() || null,
            address: address.trim() || null,
            phone: phone.trim() || null,
            whatsapp: whatsapp.trim() || null,
            email: businessEmail.trim() || null,
            opening_hours: openingHours.trim() || null,
            is_active: true,
            approval_status: 'pending'
          })
          .select()
          .single();

      if (businessError) {
        console.error(businessError);
        setError(
          'Não foi possível criar o perfil do negócio. Verifique os dados e tente novamente.'
        );
        setLoading(false);
        return;
      }

      console.log('Negócio criado:', business);

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 620,
            background: '#FFFFFF',
            borderRadius: 28,
            padding: 38,
            textAlign: 'center',
            boxShadow: '0 18px 50px rgba(0,70,60,.10)'
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
              fontSize: 32,
              margin: '0 auto 20px'
            }}
          >
            ✓
          </div>

          <h1
            style={{
              color: '#075B4E',
              marginBottom: 12
            }}
          >
            Perfil criado
          </h1>

          <p
            style={{
              color: '#66736F',
              lineHeight: 1.6
            }}
          >
            O seu perfil de negócio foi enviado para a Talaza.
          </p>

          <p
            style={{
              color: '#66736F',
              lineHeight: 1.6
            }}
          >
            Agora poderemos continuar a preparar a sua área de negócio.
          </p>

          <Link
            href={{
              pathname: '/explore',
              query: { country, province }
            }}
            style={{
              display: 'inline-flex',
              marginTop: 20,
              padding: '14px 24px',
              borderRadius: 14,
              background: '#075B4E',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: 800
            }}
          >
            Ir para a Talaza
          </Link>
        </div>
      </div>
    );
  }

  if (mode === 'choice') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: 24
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto'
          }}
        >
          <nav
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0'
            }}
          >
            <Link
              href="/"
              style={{
                color: '#075B4E',
                fontSize: 24,
                fontWeight: 900,
                textDecoration: 'none',
                letterSpacing: 1
              }}
            >
              TALAZA
            </Link>

            <Link
              href={{
                pathname: '/start',
                query: { country, province }
              }}
              style={{
                color: '#075B4E',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              ← Voltar
            </Link>
          </nav>

          <div
            style={{
              textAlign: 'center',
              marginTop: 55,
              marginBottom: 35
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                borderRadius: 999,
                background: '#EAF4F1',
                color: '#075B4E',
                fontSize: 13,
                fontWeight: 800
              }}
            >
              Perfil de negócio
            </div>

            <h1
              style={{
                color: '#17342F',
                fontSize: 'clamp(30px, 6vw, 44px)',
                lineHeight: 1.15,
                margin: '16px 0 10px'
              }}
            >
              Vamos preparar o seu negócio
            </h1>

            <p
              style={{
                color: '#66736F',
                maxWidth: 560,
                margin: '0 auto',
                lineHeight: 1.6
              }}
            >
              Entre na sua conta ou crie uma conta para começar o perfil do
              seu negócio.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: 18
            }}
          >
            <button
              onClick={() => {
                setError('');
                setMode('login');
              }}
              style={{
                textAlign: 'left',
                border: '2px solid #075B4E',
                background: '#FFFFFF',
                borderRadius: 24,
                padding: 28,
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 14 }}>↪</div>

              <h2
                style={{
                  color: '#075B4E',
                  margin: '0 0 8px'
                }}
              >
                Já tenho uma conta
              </h2>

              <p
                style={{
                  color: '#66736F',
                  lineHeight: 1.6,
                  margin: 0
                }}
              >
                Entre com o e-mail e a palavra-passe da sua conta Talaza.
              </p>
            </button>

            <div
              style={{
                textAlign: 'left',
                borderRadius: 24,
                padding: 28,
                background: 'linear-gradient(145deg,#075B4E,#0B7563)',
                color: '#FFFFFF'
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 14 }}>✦</div>

              <h2 style={{ margin: '0 0 8px' }}>
                Criar uma conta
              </h2>

              <p
                style={{
                  color: 'rgba(255,255,255,.78)',
                  lineHeight: 1.6,
                  margin: 0
                }}
              >
                A criação de novas contas está temporariamente limitada.
                Para este teste, use a conta que já foi criada no Supabase.
              </p>

              <button
                onClick={() => {
                  setError(
                    'Para este teste, entre primeiro com a conta já criada.'
                  );
                }}
                style={{
                  marginTop: 18,
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px 16px',
                  background: '#E6A900',
                  color: '#17342F',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Usar conta existente
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 22,
                padding: 14,
                borderRadius: 14,
                background: '#FFF4E5',
                color: '#8A5A00',
                fontSize: 14
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F7F6',
          padding: 24
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto'
          }}
        >
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError('');
              setMode('choice');
            }}
            style={{
              color: '#075B4E',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            ← Voltar
          </Link>

          <div
            style={{
              marginTop: 35,
              background: '#FFFFFF',
              borderRadius: 26,
              padding: 30,
              boxShadow: '0 18px 45px rgba(0,70,60,.08)'
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: '#075B4E',
                color: '#E6A900',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 27,
                fontWeight: 900
              }}
            >
              T
            </div>

            <h1
              style={{
                color: '#075B4E',
                margin: '22px 0 8px'
              }}
            >
              Entrar na Talaza
            </h1>

            <p
              style={{
                color: '#66736F',
                lineHeight: 1.6
              }}
            >
              Entre na sua conta para continuar a criação do seu perfil de
              negócio.
            </p>

            <form onSubmit={handleLogin}>
              <label
                style={{
                  display: 'block',
                  marginTop: 22,
                  fontWeight: 700,
                  color: '#17342F'
                }}
              >
                E-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 8,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid #D5DEDB',
                  fontSize: 15
                }}
              />

              <label
                style={{
                  display: 'block',
                  marginTop: 18,
                  fontWeight: 700,
                  color: '#17342F'
                }}
              >
                Palavra-passe
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="A sua palavra-passe"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: 8,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid #D5DEDB',
                  fontSize: 15
                }}
              />

              {error && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 13,
                    borderRadius: 12,
                    background: '#FFF1F0',
                    color: '#9B2C2C',
                    fontSize: 14
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
                  marginTop: 22,
                  padding: 15,
                  border: 'none',
                  borderRadius: 13,
                  background: loading ? '#8CAFA8' : '#075B4E',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading ? 'default' : 'pointer'
                }}
              >
                {loading ? 'A entrar…' : 'Entrar e continuar →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7F6',
        padding: 24
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: '0 auto'
        }}
      >
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Link
            href="/"
            style={{
              color: '#075B4E',
              fontWeight: 900,
              fontSize: 24,
              textDecoration: 'none'
            }}
          >
            TALAZA
          </Link>

          <span
            style={{
              fontSize: 13,
              color: '#66736F'
            }}
          >
            Perfil de negócio
          </span>
        </nav>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 28,
            padding: 30,
            marginTop: 30,
            boxShadow: '0 18px 50px rgba(0,70,60,.08)'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '7px 12px',
              borderRadius: 999,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 12,
              fontWeight: 800
            }}
          >
            {profileReady ? 'Conta preparada' : 'Primeiro passo'}
          </div>

          <h1
            style={{
              color: '#17342F',
              margin: '15px 0 8px'
            }}
          >
            Crie o seu perfil de negócio
          </h1>

          <p
            style={{
              color: '#66736F',
              lineHeight: 1.6
            }}
          >
            Preencha os dados abaixo. Depois vamos acrescentar logo, fotos,
            produtos, mensagens e outras funções do seu painel.
          </p>

          <form onSubmit={handleBusinessSubmit}>
            <h3
              style={{
                marginTop: 28,
                color: '#075B4E'
              }}
            >
              Os seus dados
            </h3>

            <label
              style={{
                display: 'block',
                marginTop: 15,
                fontWeight: 700
              }}
            >
              Seu nome
            </label>

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              required
              style={inputStyle}
            />

            <h3
              style={{
                marginTop: 30,
                color: '#075B4E'
              }}
            >
              Dados do negócio
            </h3>

            <label style={labelStyle}>Nome do negócio *</label>

            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex.: Boutique Flor"
              required
              style={inputStyle}
            />

            <label style={labelStyle}>Descrição</label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique brevemente o que o seu negócio oferece."
              rows={4}
              style={{
                ...inputStyle,
                resize: 'vertical'
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 15
              }}
            >
              <div>
                <label style={labelStyle}>Categoria *</label>

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="">Escolher categoria</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Subcategoria *</label>

                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  required
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
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h3
              style={{
                marginTop: 30,
                color: '#075B4E'
              }}
            >
              Localização
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 15
              }}
            >
              <div>
                <label style={labelStyle}>Município</label>

                <input
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  placeholder="Ex.: Talatona"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Bairro</label>

                <input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex.: Benfica"
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>Endereço</label>

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, avenida ou referência"
              style={inputStyle}
            />

            <h3
              style={{
                marginTop: 30,
                color: '#075B4E'
              }}
            >
              Contactos
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 15
              }}
            >
              <div>
                <label style={labelStyle}>Telefone</label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefone"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>WhatsApp</label>

                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp"
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>E-mail do negócio</label>

            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="E-mail para clientes"
              style={inputStyle}
            />

            <label style={labelStyle}>Horário de funcionamento</label>

            <input
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="Ex.: Segunda a sábado, 08h às 18h"
              style={inputStyle}
            />

            {error && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 13,
                  background: '#FFF1F0',
                  color: '#9B2C2C',
                  fontSize: 14,
                  lineHeight: 1.5
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingData}
              style={{
                width: '100%',
                marginTop: 25,
                padding: 16,
                border: 'none',
                borderRadius: 14,
                background: loading ? '#8CAFA8' : '#075B4E',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 800,
                cursor: loading ? 'default' : 'pointer'
              }}
            >
              {loading
                ? 'A guardar o seu negócio…'
                : 'Criar perfil de negócio →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 8,
  padding: 14,
  borderRadius: 12,
  border: '1px solid #D5DEDB',
  background: '#FFFFFF',
  color: '#17342F',
  fontSize: 15
};

const labelStyle = {
  display: 'block',
  marginTop: 17,
  fontWeight: 700,
  color: '#17342F'
};
