import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Contratar() {
  const router = useRouter();

  const { country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] =
    useState(false);

  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [workSchedule, setWorkSchedule] = useState('');
  const [salary, setSalary] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!country || !province) {
      router.replace('/country');
      return;
    }

    loadPage();
  }, [router.isReady, country, province]);

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const { data: countryData, error: countryError } =
        await supabase
          .from('countries')
          .select('id, name')
          .eq('id', country)
          .single();

      if (countryError) throw countryError;

      const { data: provinceData, error: provinceError } =
        await supabase
          .from('provinces')
          .select('id, name, country_id')
          .eq('id', province)
          .eq('country_id', country)
          .single();

      if (provinceError) throw provinceError;

      const { data: categoryData, error: categoryError } =
        await supabase
          .from('professional_categories')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name', {
            ascending: true,
          });

      if (categoryError) throw categoryError;

      setCountryName(countryData?.name || '');
      setProvinceName(provinceData?.name || '');
      setCategories(categoryData || []);
    } catch (err) {
      console.error('ERRO CONTRATAR:', err);

      setError(
        'Não foi possível carregar os dados para publicar a vaga.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCategory(category) {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSubcategories([]);
    setShowForm(false);
    setMessage('');
    setError('');
    setLoadingSubcategories(true);

    const { data, error } = await supabase
      .from('professional_subcategories')
      .select(
        'id, created_at, category_id, name, is_active, description'
      )
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('name', {
        ascending: true,
      });

    if (error) {
      console.error(
        'ERRO SUBCATEGORIAS:',
        error
      );

      setError(
        'Não foi possível carregar as áreas desta categoria.'
      );

      setLoadingSubcategories(false);
      return;
    }

    setSubcategories(data || []);
    setLoadingSubcategories(false);
  }

  function handleSubcategory(subcategory) {
    setSelectedSubcategory(subcategory);
    setShowForm(true);
    setMessage('');
    setError('');

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  }

  async function handlePublish(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!selectedCategory) {
      setError('Escolha uma categoria.');
      return;
    }

    if (!selectedSubcategory) {
      setError('Escolha uma área profissional.');
      return;
    }

    if (!title.trim()) {
      setError('Informe o título da vaga.');
      return;
    }

    if (!description.trim()) {
      setError('Descreva a oportunidade.');
      return;
    }

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

    const { error: insertError } = await supabase
      .from('job_posts')
      .insert({
        user_id: user.id,
        country_id: country,
        province_id: province,
        category_id: selectedCategory.id,
        subcategory_id: selectedSubcategory.id,
        title: title.trim(),
        description: description.trim(),
        requirements:
          requirements.trim() || null,
        work_schedule:
          workSchedule.trim() || null,
        salary:
          salary.trim() || null,
        whatsapp:
          whatsapp.trim() || null,
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

      setError(
        'Não foi possível publicar a vaga. Tente novamente.'
      );

      return;
    }

    setTitle('');
    setDescription('');
    setRequirements('');
    setWorkSchedule('');
    setSalary('');
    setWhatsapp('');
    setMunicipality('');
    setNeighborhood('');

    setMessage(
      'Sua vaga foi publicada com sucesso e já pode aparecer em Oportunidades.'
    );

    setTimeout(() => {
      router.push({
        pathname: '/oportunidades',
        query: {
          country,
          province,
        },
      });
    }, 1200);
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: 70,
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

      {/* INTRODUÇÃO */}
      <section
        style={{
          marginTop: 20,
          padding: 22,
          borderRadius: 20,
          background:
            'linear-gradient(135deg,#075B4E,#0C7564)',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '6px 10px',
            borderRadius: 999,
            background:
              'rgba(255,255,255,0.12)',
            fontSize: 11,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          {countryName} · {provinceName}
        </div>

        <h1
          style={{
            fontSize: 28,
            lineHeight: 1.15,
            margin: '0 0 12px',
          }}
        >
          Precisa contratar alguém?
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.65,
            opacity: 0.95,
          }}
        >
          Publique uma vaga descrevendo o que você
          precisa. A oportunidade ficará disponível
          na área de Oportunidades da sua província
          para que pessoas interessadas possam
          encontrá-la.
        </p>
      </section>

      {/* EXPLICAÇÃO */}
      <section
        style={{
          marginTop: 18,
          padding: 18,
          borderRadius: 16,
          background: '#FFFFFF',
          border: '1px solid #DCE6E3',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
          }}
        >
          Publique uma oportunidade
        </h2>

        <p
          style={{
            margin: '8px 0 0',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Escolha primeiro a categoria e depois a área
          profissional. Em seguida, informe as condições
          da oportunidade e publique a vaga.
        </p>
      </section>

      {/* CATEGORIAS */}
      <section
        style={{
          marginTop: 26,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
          }}
        >
          1. Escolha uma categoria
        </h2>

        <p
          style={{
            margin: '5px 0 14px',
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          Qual área profissional você procura?
        </p>

        {loading && (
          <p style={{ color: 'var(--ink-faint)' }}>
            A carregar…
          </p>
        )}

        {!loading &&
          categories.length === 0 && (
            <div
              style={{
                padding: 16,
                borderRadius: 13,
                background: '#FFFFFF',
                border:
                  '1px solid #DCE6E3',
                color: '#7A8986',
                fontSize: 13,
              }}
            >
              Ainda não existem categorias
              profissionais disponíveis.
            </div>
          )}

        {!loading &&
          categories.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(170px,1fr))',
                gap: 10,
              }}
            >
              {categories.map((category) => {
                const selected =
                  selectedCategory?.id ===
                  category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      handleCategory(category)
                    }
                    style={{
                      textAlign: 'left',
                      border: selected
                        ? '2px solid #075B4E'
                        : '1px solid #DCE6E3',
                      background: selected
                        ? '#EAF4F1'
                        : '#FFFFFF',
                      borderRadius: 14,
                      padding: 15,
                      cursor: 'pointer',
                    }}
                  >
                    <strong
                      style={{
                        color: '#075B4E',
                        fontSize: 14,
                      }}
                    >
                      {category.name}
                    </strong>
                  </button>
                );
              })}
            </div>
          )}
      </section>

      {/* SUBCATEGORIAS */}
      {selectedCategory && (
        <section
          style={{
            marginTop: 26,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 19,
            }}
          >
            2. Escolha a área profissional
          </h2>

          <p
            style={{
              margin: '5px 0 14px',
              color: 'var(--ink-soft)',
              fontSize: 13,
            }}
          >
            {selectedCategory.name}
          </p>

          {loadingSubcategories && (
            <p
              style={{
                color: 'var(--ink-faint)',
              }}
            >
              A carregar áreas profissionais…
            </p>
          )}

          {!loadingSubcategories &&
            subcategories.length === 0 && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 13,
                  background: '#FFFFFF',
                  border:
                    '1px solid #DCE6E3',
                  color: '#7A8986',
                  fontSize: 13,
                }}
              >
                Ainda não existem áreas
                profissionais nesta categoria.
              </div>
            )}

          {!loadingSubcategories &&
            subcategories.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(180px,1fr))',
                  gap: 9,
                }}
              >
                {subcategories.map(
                  (subcategory) => {
                    const selected =
                      selectedSubcategory?.id ===
                      subcategory.id;

                    return (
                      <button
                        key={subcategory.id}
                        type="button"
                        onClick={() =>
                          handleSubcategory(
                            subcategory
                          )
                        }
                        style={{
                          textAlign: 'left',
                          border: selected
                            ? '2px solid #075B4E'
                            : '1px solid #DCE6E3',
                          background: selected
                            ? '#EAF4F1'
                            : '#FFFFFF',
                          borderRadius: 13,
                          padding: 14,
                          cursor: 'pointer',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                            color: '#17342F',
                          }}
                        >
                          {subcategory.name}
                        </strong>
                      </button>
                    );
                  }
                )}
              </div>
            )}
        </section>
      )}

      {/* FORMULÁRIO */}
      {showForm &&
        selectedCategory &&
        selectedSubcategory && (
          <section
            style={{
              marginTop: 28,
              padding: 20,
              borderRadius: 18,
              background: '#FFFFFF',
              border:
                '1px solid #DCE6E3',
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: '#EAF4F1',
                color: '#075B4E',
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              <strong>
                {selectedCategory.name}
              </strong>
              {' · '}
              {selectedSubcategory.name}
              {' · '}
              {provinceName}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              3. Descreva a oportunidade
            </h2>

            <p
              style={{
                margin: '6px 0 18px',
                color: 'var(--ink-soft)',
                fontSize: 13,
              }}
            >
              Informe os detalhes para que as pessoas
              interessadas possam compreender a vaga.
            </p>

            <form onSubmit={handlePublish}>
              <input
                className="input"
                placeholder="Título da vaga"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                }}
              />

              <textarea
                className="input"
                placeholder="Descrição da oportunidade"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
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

              <textarea
                className="input"
                placeholder="Competências ou requisitos"
                value={requirements}
                onChange={(e) =>
                  setRequirements(
                    e.target.value
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

              <input
                className="input"
                placeholder="Horário de trabalho (opcional)"
                value={workSchedule}
                onChange={(e) =>
                  setWorkSchedule(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                }}
              />

              <input
                className="input"
                placeholder="Salário ou remuneração (opcional)"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value)
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                }}
              />

              <input
                className="input"
                placeholder="WhatsApp para contacto (opcional)"
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                }}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(180px,1fr))',
                  gap: 10,
                }}
              >
                <input
                  className="input"
                  placeholder="Município (opcional)"
                  value={municipality}
                  onChange={(e) =>
                    setMunicipality(
                      e.target.value
                    )
                  }
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />

                <input
                  className="input"
                  placeholder="Bairro (opcional)"
                  value={neighborhood}
                  onChange={(e) =>
                    setNeighborhood(
                      e.target.value
                    )
                  }
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: 16,
                }}
              >
                Publicar vaga
              </button>
            </form>
          </section>
        )}

      {/* MENSAGENS */}
      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 13,
            borderRadius: 12,
            background: '#EAF4F1',
            color: '#075B4E',
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 13,
            borderRadius: 12,
            background: '#FFF1F0',
            color: '#9B2C2C',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
