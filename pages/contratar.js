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
  const [professionals, setProfessionals] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] =
    useState(false);
  const [loadingProfessionals, setLoadingProfessionals] =
    useState(false);

  const [showJobForm, setShowJobForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
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

    loadLocation();
    loadCategories();
  }, [router.isReady, country, province]);

  async function loadLocation() {
    const { data: provinceData, error: provinceError } =
      await supabase
        .from('provinces')
        .select('id, name, country_id')
        .eq('id', province)
        .eq('country_id', country)
        .single();

    if (provinceError || !provinceData) {
      setError(
        'A província selecionada não pertence ao país escolhido.'
      );
      return;
    }

    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    setProvinceName(provinceData.name);
    setCountryName(countryData?.name || '');
  }

  async function loadCategories() {
    setLoadingCategories(true);
    setError('');

    /*
     * IMPORTANTE:
     * professional_categories NÃO possui description.
     * Por isso buscamos somente as colunas existentes.
     */
    const { data, error } = await supabase
      .from('professional_categories')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar categorias:', error);

      setError(
        'Não foi possível carregar as categorias profissionais.'
      );

      setCategories([]);
      setLoadingCategories(false);
      return;
    }

    setCategories(data || []);
    setLoadingCategories(false);
  }

  async function selectCategory(category) {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSubcategories([]);
    setProfessionals([]);
    setMessage('');
    setError('');
    setLoadingSubcategories(true);

    /*
     * professional_subcategories também será consultada
     * apenas com colunas essenciais.
     */
    const { data, error } = await supabase
      .from('professional_subcategories')
      .select('id, name, category_id, is_active')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error(
        'Erro ao carregar subcategorias:',
        error
      );

      setError(
        'Não foi possível carregar as áreas profissionais.'
      );

      setSubcategories([]);
      setLoadingSubcategories(false);
      return;
    }

    setSubcategories(data || []);
    setLoadingSubcategories(false);
  }

  async function selectSubcategory(subcategory) {
    setSelectedSubcategory(subcategory);
    setLoadingProfessionals(true);
    setProfessionals([]);
    setMessage('');
    setError('');

    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        id,
        user_id,
        country_id,
        province_id,
        category_id,
        subcategory_id,
        name,
        professional_competence,
        age,
        gender,
        photo_url,
        work_availability,
        municipality,
        neighborhood,
        accepts_any_job,
        plan_id,
        status,
        is_active,
        created_at
      `)
      .eq('country_id', country)
      .eq('province_id', province)
      .eq('category_id', selectedCategory.id)
      .eq('subcategory_id', subcategory.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        'Erro ao carregar profissionais:',
        error
      );

      setError(
        'Não foi possível carregar os profissionais desta área.'
      );

      setProfessionals([]);
      setLoadingProfessionals(false);
      return;
    }

    setProfessionals(data || []);
    setLoadingProfessionals(false);
  }

  async function handleSendMessage(professional) {
    setMessage('');
    setError('');

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

    const professionalUserId = professional.user_id;

    if (!professionalUserId) {
      setError(
        'Não foi possível identificar este profissional.'
      );
      return;
    }

    if (professionalUserId === user.id) {
      setError(
        'Você não pode enviar uma mensagem para o seu próprio perfil.'
      );
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: professionalUserId,
        professional_profile_id: professional.id,
        message_type: 'text',
        content:
          'Olá! Encontrei o seu perfil no Talaza e gostaria de falar consigo sobre uma oportunidade de trabalho.',
        is_read: false,
      });

    if (error) {
      console.error(
        'Erro ao enviar mensagem:',
        error
      );

      setError(
        'Não foi possível enviar a mensagem. Tente novamente.'
      );
      return;
    }

    setMessage(
      'Mensagem enviada. O profissional poderá responder pela área de mensagens do Talaza.'
    );
  }

  async function handlePublishJob(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!selectedCategory || !selectedSubcategory) {
      setError(
        'Escolha primeiro a categoria e a área profissional da vaga.'
      );
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError(
        'Preencha o título e a descrição da vaga.'
      );
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

    const { error } = await supabase
      .from('job_posts')
      .insert({
        user_id: user.id,
        country_id: country,
        province_id: province,
        category_id: selectedCategory.id,
        subcategory_id: selectedSubcategory.id,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || null,
        municipality: municipality.trim() || null,
        neighborhood: neighborhood.trim() || null,
        status: 'published',
        is_active: true,
      });

    if (error) {
      console.error(
        'Erro ao publicar vaga:',
        error
      );

      setError(
        'Não foi possível publicar a vaga. Tente novamente.'
      );
      return;
    }

    setTitle('');
    setDescription('');
    setRequirements('');
    setMunicipality('');
    setNeighborhood('');

    setMessage(
      'Sua vaga foi publicada e ficará disponível para profissionais da província selecionada.'
    );

    setShowJobForm(false);
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

      {/* INTRODUÇÃO */}
      <section
        style={{
          marginTop: 20,
          padding: 22,
          borderRadius: 18,
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
            background: 'rgba(255,255,255,0.12)',
            fontSize: 11,
            fontWeight: 700,
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
          Encontre pessoas prontas para trabalhar.
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.65,
            opacity: 0.94,
          }}
        >
          Precisa contratar alguém para realizar um
          trabalho, preencher uma função ou ajudar no seu
          negócio? Encontre profissionais disponíveis na sua
          província, escolha a área que procura e entre em
          contacto diretamente.
        </p>
      </section>

      {/* EXPLICAÇÃO */}
      <section
        style={{
          marginTop: 18,
          padding: 18,
          borderRadius: 15,
          background: '#FFFFFF',
          border: '1px solid #DCE6E3',
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          Esta área é destinada a quem procura profissionais
          para contratar. Os perfis apresentados pertencem a
          pessoas que procuram oportunidades de trabalho ou
          disponibilizam as suas competências para contratação.
        </p>

        <p
          style={{
            margin: '12px 0 0',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          Encontre a pessoa certa para o que você precisa —
          desde trabalhos especializados até serviços e
          tarefas do dia a dia.
        </p>
      </section>

      {/* CATEGORIAS */}
      <section
        style={{
          marginTop: 24,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            margin: 0,
          }}
        >
          Você procura alguém para trabalhar?
        </h2>

        <p
          style={{
            margin: '5px 0 14px',
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          Comece por uma categoria.
        </p>

        {loadingCategories && (
          <p style={{ color: 'var(--ink-faint)' }}>
            A carregar categorias…
          </p>
        )}

        {!loadingCategories &&
          categories.length === 0 && (
            <div
              style={{
                padding: 16,
                borderRadius: 13,
                background: '#FFFFFF',
                border: '1px solid #DCE6E3',
                color: '#7A8986',
                fontSize: 13,
              }}
            >
              Ainda não existem categorias profissionais
              disponíveis.
            </div>
          )}

        {!loadingCategories &&
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
                  selectedCategory?.id === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      selectCategory(category)
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
                        fontSize: 14,
                        color: '#075B4E',
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
            marginTop: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              margin: 0,
            }}
          >
            Escolha a área
          </h2>

          <p
            style={{
              color: 'var(--ink-soft)',
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {selectedCategory.name}
          </p>

          {loadingSubcategories && (
            <p style={{ color: 'var(--ink-faint)' }}>
              A carregar áreas profissionais…
            </p>
          )}

          {!loadingSubcategories &&
            subcategories.length === 0 && (
              <div
                style={{
                  padding: 15,
                  borderRadius: 13,
                  background: '#FFFFFF',
                  border: '1px solid #DCE6E3',
                  fontSize: 13,
                  color: '#7A8986',
                }}
              >
                Ainda não existem áreas profissionais
                cadastradas nesta categoria.
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
                {subcategories.map((subcategory) => {
                  const selected =
                    selectedSubcategory?.id ===
                    subcategory.id;

                  return (
                    <button
                      key={subcategory.id}
                      type="button"
                      onClick={() =>
                        selectSubcategory(subcategory)
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
                        padding: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13,
                        }}
                      >
                        {subcategory.name}
                      </strong>
                    </button>
                  );
                })}
              </div>
            )}
        </section>
      )}

      {/* PROFISSIONAIS */}
      {selectedSubcategory && (
        <section
          style={{
            marginTop: 26,
          }}
        >
          <div
            style={{
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 19,
                margin: 0,
              }}
            >
              Profissionais disponíveis
            </h2>

            <p
              style={{
                margin: '4px 0 0',
                color: 'var(--ink-soft)',
                fontSize: 11,
              }}
            >
              {selectedSubcategory.name} · {provinceName}
            </p>
          </div>

          {loadingProfessionals && (
            <p style={{ color: 'var(--ink-faint)' }}>
              A procurar profissionais…
            </p>
          )}

          {!loadingProfessionals &&
            professionals.length === 0 && (
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #DCE6E3',
                  fontSize: 13,
                  color: '#7A8986',
                }}
              >
                Ainda não encontramos profissionais
                disponíveis nesta área e província.
              </div>
            )}

          {!loadingProfessionals &&
            professionals.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(220px,1fr))',
                  gap: 12,
                }}
              >
                {professionals.map((professional) => (
                  <div
                    key={professional.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #DCE6E3',
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    {professional.photo_url && (
                      <img
                        src={professional.photo_url}
                        alt={
                          professional.name ||
                          'Profissional'
                        }
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginBottom: 9,
                        }}
                      />
                    )}

                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                      }}
                    >
                      {professional.name ||
                        'Profissional disponível'}
                    </h3>

                    {professional.professional_competence && (
                      <p
                        style={{
                          fontSize: 12,
                          lineHeight: 1.45,
                          color: 'var(--ink-soft)',
                          margin: '7px 0',
                        }}
                      >
                        {professional.professional_competence}
                      </p>
                    )}

                    {professional.work_availability && (
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-soft)',
                          margin: '5px 0',
                        }}
                      >
                        Disponibilidade:{' '}
                        {professional.work_availability}
                      </p>
                    )}

                    {(professional.municipality ||
                      professional.neighborhood) && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-faint)',
                          marginBottom: 10,
                        }}
                      >
                        {professional.municipality}

                        {professional.municipality &&
                        professional.neighborhood
                          ? ' · '
                          : ''}

                        {professional.neighborhood}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        handleSendMessage(professional)
                      }
                      style={{
                        width: '100%',
                      }}
                    >
                      Enviar mensagem
                    </button>
                  </div>
                ))}
              </div>
            )}
        </section>
      )}

      {/* PUBLICAR VAGA */}
      <section
        style={{
          marginTop: 32,
          padding: 20,
          borderRadius: 18,
          background: '#F4F8F7',
          border: '1px solid #DCE6E3',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#075B4E',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Não encontrou o profissional que procura?
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 21,
          }}
        >
          Publique uma vaga
        </h2>

        <p
          style={{
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.55,
            margin: '8px 0 15px',
          }}
        >
          Publique o que você precisa e deixe que o
          profissional certo encontre a sua oportunidade.
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setShowJobForm(!showJobForm)
          }
        >
          {showJobForm
            ? 'Fechar publicação'
            : 'Publicar uma vaga'}
        </button>

        {showJobForm && (
          <form
            onSubmit={handlePublishJob}
            style={{
              marginTop: 18,
            }}
          >
            <div
              style={{
                padding: 13,
                borderRadius: 12,
                background: '#EAF4F1',
                color: '#075B4E',
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              Escolha primeiro a categoria e a área
              profissional acima. A vaga será associada à
              província selecionada.
            </div>

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
                marginBottom: 9,
              }}
            />

            <textarea
              className="input"
              placeholder="Descreva o trabalho ou a função que precisa preencher"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              rows={5}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 9,
                resize: 'vertical',
              }}
            />

            <textarea
              className="input"
              placeholder="Condições e requisitos"
              value={requirements}
              onChange={(e) =>
                setRequirements(e.target.value)
              }
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 9,
                resize: 'vertical',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: 9,
              }}
            >
              <input
                className="input"
                placeholder="Município"
                value={municipality}
                onChange={(e) =>
                  setMunicipality(e.target.value)
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />

              <input
                className="input"
                placeholder="Bairro"
                value={neighborhood}
                onChange={(e) =>
                  setNeighborhood(e.target.value)
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
                marginTop: 12,
              }}
            >
              Publicar vaga
            </button>
          </form>
        )}
      </section>

      {/* CLIENTE PRÓ */}
      <section
        style={{
          marginTop: 20,
          padding: 18,
          borderRadius: 16,
          background: '#FFF9E8',
          border: '1px solid #F0DE9B',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
          }}
        >
          Quer que o seu perfil apareça aqui?
        </h3>

        <p
          style={{
            margin: '7px 0 12px',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--ink-soft)',
          }}
        >
          Faça parte dos profissionais disponíveis para
          contratação. A área de oportunidades e os recursos
          do Cliente Pró serão ligados quando o plano for
          criado.
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setMessage(
              'A área de planos do Cliente Pró será ligada numa etapa posterior.'
            );
          }}
        >
          Quero aparecer aqui
        </button>
      </section>

      {/* MENSAGEM DE SUCESSO */}
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

      {/* ERRO */}
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
