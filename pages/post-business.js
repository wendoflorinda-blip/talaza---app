                import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function PostBusiness() {
  const router = useRouter();
  const { country, province } = router.query;

  const [user, setUser] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    if (!country || !province) {
      router.replace('/country');
      return;
    }

    loadInitialData();
    checkSession();
  }, [router.isReady, country, province]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId('');
      return;
    }

    loadSubcategories(categoryId);
  }, [categoryId]);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUser(session.user);

      setEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.name) {
        setFullName(profile.name);
      }
    }
  }

  async function loadInitialData() {
    setLoadingData(true);
    setError('');

    const { data: categoriesData, error: categoriesError } =
      await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });

    if (categoriesError) {
      console.error(categoriesError);
      setError('Não foi possível carregar as categorias.');
    } else {
      setCategories(categoriesData || []);
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

  async function validateLocation() {
    if (!country || !province) {
      return {
        valid: false,
        message: 'Escolha novamente o país e a província.',
      };
    }

    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('id')
      .eq('id', country)
      .maybeSingle();

    if (countryError || !countryData) {
      return {
        valid: false,
        message: 'O país selecionado não é válido.',
      };
    }

    const { data: provinceData, error: provinceError } = await supabase
      .from('provinces')
      .select('id, country_id')
      .eq('id', province)
      .eq('country_id', country)
      .maybeSingle();

    if (provinceError || !provinceData) {
      return {
        valid: false,
        message:
          'A província selecionada não pertence ao país escolhido.',
      };
    }

    return { valid: true };
  }

  async function createAccount() {
    if (user) {
      return {
        success: true,
        user,
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Digite o seu e-mail.');
      return { success: false };
    }

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return { success: false };
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (signupError) {
      console.error(signupError);

      if (
        signupError.message?.toLowerCase().includes('already registered')
      ) {
        setError(
          'Este e-mail já possui uma conta. Vá à página inicial e use “Já tenho uma conta” para entrar.'
        );
      } else {
        setError(
          signupError.message ||
            'Não foi possível criar a sua conta.'
        );
      }

      return { success: false };
    }

    if (!data?.user) {
      setError('Não foi possível criar a sua conta.');
      return { success: false };
    }

    /*
      Se a confirmação de e-mail estiver ativada no Supabase,
      o Supabase pode não devolver uma sessão imediatamente.
    */

    if (!data.session) {
      setError(
        'A conta foi criada. Confirme o seu e-mail e depois entre pela opção “Já tenho uma conta” na página inicial para concluir o cadastro do negócio.'
      );

      return {
        success: false,
        emailConfirmationRequired: true,
      };
    }

    setUser(data.user);

    return {
      success: true,
      user: data.user,
    };
  }

  async function prepareProfile(currentUser) {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: currentUser.id,
          name: fullName.trim(),
          country_id: country,
          province_id: province,
        },
        {
          onConflict: 'id',
        }
      );

    if (error) {
      console.error(error);

      setError(
        'Não foi possível criar o seu perfil Talaza. Verifique os dados e tente novamente.'
      );

      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
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

      const location = await validateLocation();

      if (!location.valid) {
        setError(location.message);
        setLoading(false);
        return;
      }

      const account = await createAccount();

      if (!account.success) {
        setLoading(false);
        return;
      }

      const currentUser = account.user;

      const profileOk = await prepareProfile(currentUser);

      if (!profileOk) {
        setLoading(false);
        return;
      }

      /*
        Criamos o negócio sempre com o país e a província
        selecionados anteriormente.
      */

      const { error: businessError } = await supabase
        .from('businesses')
        .insert({
          owner_id: currentUser.id,
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

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error(err);

      setError(
        'Ocorreu um erro inesperado. Tente novamente.'
      );

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
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 600,
            background: '#FFFFFF',
            borderRadius: 26,
            padding: 34,
            textAlign: 'center',
            boxShadow: '0 18px 50px rgba(0,70,60,.10)',
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#EAF4F1',
              color: '#075B4E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              margin: '0 auto 18px',
            }}
          >
            ✓
          </div>

          <h1
            style={{
              color: '#075B4E',
              margin: '0 0 14px',
              fontSize: 28,
            }}
          >
            O seu perfil de negócio já está criado
          </h1>

          <p
            style={{
              color: '#596B68',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            Agora vá à página inicial, clique em
            <strong> “Já tenho uma conta” </strong>
            e entre na sua conta de negócio para vender.
          </p>

          <div
            style={{
              display: 'grid',
              gap: 10,
              marginTop: 25,
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 20px',
                borderRadius: 13,
                background: '#075B4E',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontWeight: 800,
              }}
            >
              Ir para a página inicial
            </Link>

            <Link
              href={{
                pathname: '/explore',
                query: {
                  country,
                  province,
                },
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '13px 20px',
                borderRadius: 13,
                border: '1px solid #D5DEDB',
                color: '#075B4E',
                textDecoration: 'none',
                fontWeight: 800,
              }}
            >
              Explorar a Talaza
            </Link>
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
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: '0 auto',
        }}
      >
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#075B4E',
              fontWeight: 900,
              fontSize: 24,
              textDecoration: 'none',
              letterSpacing: 1,
            }}
          >
            TALAZA
          </Link>

          <Link
            href={{
              pathname: '/start',
              query: {
                country,
                province,
              },
            }}
            style={{
              color: '#075B4E',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            ← Voltar
          </Link>
        </nav>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 26,
            padding: 30,
            marginTop: 30,
            boxShadow: '0 18px 50px rgba(0,70,60,.07)',
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
              fontWeight: 800,
            }}
          >
            Perfil de negócio
          </div>

          <h1
            style={{
              color: '#17342F',
              margin: '15px 0 8px',
              fontSize: 28,
            }}
          >
            Crie o seu perfil de negócio
          </h1>

          <p
            style={{
              color: '#66736F',
              lineHeight: 1.6,
              marginBottom: 0,
            }}
          >
            Crie a sua conta Talaza e apresente o seu negócio para pessoas
            que procuram produtos e serviços na sua região.
          </p>

          <div
            style={{
              marginTop: 18,
              padding: 13,
              borderRadius: 13,
              background: '#F5F9F7',
              color: '#075B4E',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Localização escolhida: <strong>{country}</strong> ·{' '}
            <strong>{province}</strong>
          </div>

          <form onSubmit={handleSubmit}>
            <h3
              style={{
                marginTop: 28,
                color: '#075B4E',
              }}
            >
              A sua conta
            </h3>

            <label style={labelStyle}>
              Seu nome *
            </label>

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              required
              style={inputStyle}
            />

            <label style={labelStyle}>
              E-mail *
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={!!user}
              style={{
                ...inputStyle,
                background: user ? '#F1F4F3' : '#FFFFFF',
              }}
            />

            {!user && (
              <>
                <label style={labelStyle}>
                  Palavra-passe *
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  required
                  minLength={6}
                  style={inputStyle}
                />
              </>
            )}

            <h3
              style={{
                marginTop: 30,
                color: '#075B4E',
              }}
            >
              Dados do negócio
            </h3>

            <label style={labelStyle}>
              Nome do negócio *
            </label>

            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex.: Boutique Flor"
              required
              style={inputStyle}
            />

            <label style={labelStyle}>
              Descrição
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique brevemente o que o seu negócio oferece."
              rows={4}
              style={{
                ...inputStyle,
                resize: 'vertical',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(220px,1fr))',
                gap: 15,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Categoria *
                </label>

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  style={inputStyle}
                  disabled={loadingData}
                >
                  <option value="">
                    Escolher categoria
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Subcategoria *
                </label>

                <select
                  value={subcategoryId}
                  onChange={(e) =>
                    setSubcategoryId(e.target.value)
                  }
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

            <h3
              style={{
                marginTop: 30,
                color: '#075B4E',
              }}
            >
              Localização do negócio
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(220px,1fr))',
                gap: 15,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Município
                </label>

                <input
                  value={municipality}
                  onChange={(e) =>
                    setMunicipality(e.target.value)
                  }
                  placeholder="Ex.: Talatona"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Bairro
                </label>

                <input
                  value={neighborhood}
                  onChange={(e) =>
                    setNeighborhood(e.target.value)
                  }
                  placeholder="Ex.: Benfica"
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>
              Endereço
            </label>

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, avenida ou referência"
              style={inputStyle}
            />

            <h3
              style={{
                marginTop: 30,
                color: '#075B4E',
              }}
            >
              Contactos
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(220px,1fr))',
                gap: 15,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Telefone
                </label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefone"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  WhatsApp
                </label>

                <input
                  value={whatsapp}
                  onChange={(e) =>
                    setWhatsapp(e.target.value)
                  }
                  placeholder="WhatsApp"
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>
              E-mail do negócio
            </label>

            <input
              type="email"
              value={businessEmail}
              onChange={(e) =>
                setBusinessEmail(e.target.value)
              }
              placeholder="E-mail para clientes"
              style={inputStyle}
            />

            <label style={labelStyle}>
              Horário de funcionamento
            </label>

            <input
              value={openingHours}
              onChange={(e) =>
                setOpeningHours(e.target.value)
              }
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
                  lineHeight: 1.5,
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
                background:
                  loading || loadingData
                    ? '#8CAFA8'
                    : '#075B4E',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 800,
                cursor:
                  loading || loadingData
                    ? 'default'
                    : 'pointer',
              }}
            >
              {loading
                ? 'A criar o seu perfil…'
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
  fontSize: 15,
};

const labelStyle = {
  display: 'block',
  marginTop: 17,
  fontWeight: 700,
  color: '#17342F',
};                                      <div
                                            
