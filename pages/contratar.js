import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Contratar() {
  const router = useRouter();

  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] =
    useState('');

  const [title, setTitle] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [professionalCompetence, setProfessionalCompetence] =
    useState('');
  const [workAvailability, setWorkAvailability] =
    useState('');
  const [salary, setSalary] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] =
    useState(false);
  const [publishing, setPublishing] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const receivedCountry = Array.isArray(router.query.country)
      ? router.query.country[0]
      : router.query.country;

    const receivedProvince = Array.isArray(
      router.query.province
    )
      ? router.query.province[0]
      : router.query.province;

    if (!receivedCountry || !receivedProvince) {
      router.replace('/country');
      return;
    }

    setCountry(receivedCountry);
    setProvince(receivedProvince);

    loadPage(
      receivedCountry,
      receivedProvince
    );
  }, [router.isReady]);

  async function loadPage(
    receivedCountry,
    receivedProvince
  ) {
    setLoading(true);
    setError('');

    try {
      const {
        data: countryData,
        error: countryError,
      } = await supabase
        .from('countries')
        .select('id, name')
        .eq('id', receivedCountry)
        .single();

      if (countryError) {
        console.error(
          'ERRO PAÍS:',
          countryError
        );
        throw countryError;
      }

      const {
        data: provinceData,
        error: provinceError,
      } = await supabase
        .from('provinces')
        .select('id, name, country_id')
        .eq('id', receivedProvince)
        .eq('country_id', receivedCountry)
        .single();

      if (provinceError) {
        console.error(
          'ERRO PROVÍNCIA:',
          provinceError
        );
        throw provinceError;
      }

      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from('professional_categories')
        .select(
          'id, name, is_active, created_at'
        )
        .eq('is_active', true)
        .order('name', {
          ascending: true,
        });

      if (categoryError) {
        console.error(
          'ERRO CATEGORIAS:',
          categoryError
        );
        throw categoryError;
      }

      setCountryName(
        countryData?.name || ''
      );

      setProvinceName(
        provinceData?.name || ''
      );

      setCategories(
        categoryData || []
      );
    } catch (err) {
      console.error(
        'ERRO COMPLETO CONTRATAR:',
        err
      );

      setError(
        'Não foi possível carregar os dados para publicar a vaga.'
      );

      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryChange(event) {
    const categoryId = event.target.value;

    setSelectedCategory(categoryId);
    setSelectedSubcategory('');
    setSubcategories([]);
    setError('');
    setMessage('');

    if (!categoryId) {
      return;
    }

    setLoadingSubcategories(true);

    const {
      data,
      error: subcategoryError,
    } = await supabase
      .from('professional_subcategories')
      .select(
        'id, category_id, name, is_active, created_at'
      )
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name', {
        ascending: true,
      });

    if (subcategoryError) {
      console.error(
        'ERRO SUBCATEGORIAS:',
        subcategoryError
      );

      setSubcategories([]);

      setError(
        'Não foi possível carregar as subcategorias profissionais.'
      );

      setLoadingSubcategories(false);
      return;
    }

    setSubcategories(data || []);
    setLoadingSubcategories(false);
  }

  async function handlePublish(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!selectedCategory) {
      setError(
        'Escolha uma categoria profissional.'
      );
      return;
    }

    if (!selectedSubcategory) {
      setError(
        'Escolha uma subcategoria profissional.'
      );
      return;
    }

    if (!title.trim()) {
      setError(
        'Informe o título da vaga.'
      );
      return;
    }

    if (!whatsapp.trim()) {
      setError(
        'Informe o WhatsApp para contacto.'
      );
      return;
    }

    if (!description.trim()) {
      setError(
        'Descreva o trabalho ou a função.'
      );
      return;
    }

    if (!professionalCompetence.trim()) {
      setError(
        'Informe a competência ou o perfil que procura.'
      );
      return;
    }

    setPublishing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/login?redirect=${encodeURIComponent(
            router.asPath
          )}`
        );

        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from('job_posts')
        .insert({
          user_id: user.id,
          country_id: country,
          province_id: province,
          category_id: selectedCategory,
          subcategory_id: selectedSubcategory,

          title: title.trim(),

          whatsapp: whatsapp.trim(),

          description:
            description.trim(),

          professional_competence:
            professionalCompetence.trim(),

          work_availability:
            workAvailability.trim() || null,

          salary:
            salary.trim() || null,

          municipality:
            municipality.trim() || null,

          neighborhood:
            neighborhood.trim() || null,

          status: 'published',
          is_active: true,
        });

      if (insertError) {
        console.error(
          'ERRO PUBLICAR VAGA:',
          insertError
        );

        throw insertError;
      }

      setMessage(
        'Vaga publicada com sucesso. Ela ficará disponível nas Oportunidades da província.'
      );

      setTitle('');
      setWhatsapp('');
      setDescription('');
      setProfessionalCompetence('');
      setWorkAvailability('');
      setSalary('');
      setMunicipality('');
      setNeighborhood('');

      setSelectedCategory('');
      setSelectedSubcategory('');
      setSubcategories([]);

      setShowForm(false);
    } catch (err) {
      console.error(
        'ERRO COMPLETO PUBLICAÇÃO:',
        err
      );

      setError(
        'Não foi possível publicar a vaga. Verifique os dados e tente novamente.'
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: 60,
      }}
    >
      {/* CABEÇALHO */}

      <nav
        className="topnav"
        style={{
          padding: '12px 0',
        }}
      >
        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province,
            },
          }}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            className="logo"
            style={{
              background: '#075B4E',
              color: '#E6A900',
            }}
          >
            T
          </div>

          <b>Talaza</b>
        </Link>

        <Link
          href={{
            pathname: '/explore',
            query: {
              country,
              province,
            },
          }}
          className="btn btn-ghost"
          style={{
            fontSize: 12,
          }}
        >
          ← Voltar
        </Link>
      </nav>

      {/* LOCALIZAÇÃO */}

      <div
        style={{
          marginTop: 12,
          display: 'inline-flex',
          padding: '7px 11px',
          borderRadius: 999,
          background: '#EAF4F1',
          color: '#075B4E',
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {countryName} · {provinceName}
      </div>

      {/* INTRODUÇÃO */}

      <section
        style={{
          marginTop: 18,
          padding: 22,
          borderRadius: 18,
          background:
            'linear-gradient(135deg,#075B4E,#0C7564)',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 9,
            opacity: 0.9,
          }}
        >
          Contratar
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: 1.15,
          }}
        >
          Precisa de alguém para trabalhar?
        </h1>

        <p
          style={{
            margin: '12px 0 0',
            fontSize: 14,
            lineHeight: 1.65,
            opacity: 0.94,
          }}
        >
          Publique o que você precisa e encontre
          pessoas interessadas em oportunidades
          de trabalho na sua província.
        </p>
      </section>

      {/* PUBLICAR VAGA */}

      <section
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 18,
          background: '#FFFFFF',
          border: '1px solid #DCE6E3',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 22,
          }}
        >
          Publicar uma vaga
        </h2>

        <p
          style={{
            margin: '7px 0 16px',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          Informe o que você procura. A vaga será
          publicada nas Oportunidades de{' '}
          <strong>
            {provinceName || 'sua província'}
          </strong>
          .
        </p>

        {!showForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setMessage('');
              setError('');
            }}
            style={{
              width: '100%',
            }}
          >
            Publicar uma vaga
          </button>
        )}

        {showForm && (
          <form
            onSubmit={handlePublish}
            style={{
              marginTop: 10,
            }}
          >
            {/* TÍTULO */}

            <input
              className="input"
              placeholder="Título da vaga"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />

            {/* CATEGORIA */}

            <select
              className="input"
              value={selectedCategory}
              onChange={handleCategoryChange}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            >
              <option value="">
                Escolha uma categoria profissional
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

            {/* SUBCATEGORIA */}

            <select
              className="input"
              value={selectedSubcategory}
              onChange={(event) =>
                setSelectedSubcategory(
                  event.target.value
                )
              }
              disabled={
                !selectedCategory ||
                loadingSubcategories
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            >
              <option value="">
                {loadingSubcategories
                  ? 'A carregar subcategorias…'
                  : !selectedCategory
                  ? 'Escolha primeiro a categoria'
                  : 'Escolha uma subcategoria profissional'}
              </option>

              {subcategories.map(
                (subcategory) => (
                  <option
                    key={subcategory.id}
                    value={subcategory.id}
                  >
                    {subcategory.name}
                  </option>
                )
              )}
            </select>

            {/* WHATSAPP */}

            <input
              className="input"
              placeholder="WhatsApp para contacto"
              value={whatsapp}
              onChange={(event) =>
                setWhatsapp(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />

            {/* DESCRIÇÃO */}

            <textarea
              className="input"
              placeholder="Descreva o trabalho ou a função que precisa preencher"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={5}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
                resize: 'vertical',
              }}
            />

            {/* COMPETÊNCIA */}

            <textarea
              className="input"
              placeholder="Que competência ou perfil você procura?"
              value={professionalCompetence}
              onChange={(event) =>
                setProfessionalCompetence(
                  event.target.value
                )
              }
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
                resize: 'vertical',
              }}
            />

            {/* HORÁRIO */}

            <input
              className="input"
              placeholder="Horário de trabalho — opcional"
              value={workAvailability}
              onChange={(event) =>
                setWorkAvailability(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />

            {/* SALÁRIO */}

            <input
              className="input"
              placeholder="Salário — opcional"
              value={salary}
              onChange={(event) =>
                setSalary(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />

            {/* MUNICÍPIO */}

            <input
              className="input"
              placeholder="Município — opcional"
              value={municipality}
              onChange={(event) =>
                setMunicipality(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />

            {/* BAIRRO */}

            <input
              className="input"
              placeholder="Bairro — opcional"
              value={neighborhood}
              onChange={(event) =>
                setNeighborhood(
                  event.target.value
                )
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={publishing}
              style={{
                width: '100%',
              }}
            >
              {publishing
                ? 'A publicar…'
                : 'Publicar vaga'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShowForm(false);
                setError('');
                setMessage('');
              }}
              style={{
                width: '100%',
                marginTop: 8,
              }}
            >
              Cancelar
            </button>
          </form>
        )}
      </section>

      {/* MENSAGEM */}

      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 13,
            background: '#EAF4F1',
            color: '#075B4E',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}

      {/* ERRO */}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 13,
            background: '#FFF1F0',
            color: '#9B2C2C',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            marginTop: 16,
            color: 'var(--ink-faint)',
            fontSize: 12,
          }}
        >
          A carregar…
        </div>
      )}
    </div>
  );
}  
