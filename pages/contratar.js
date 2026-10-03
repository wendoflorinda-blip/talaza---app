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
  const [loadingCategories, setLoadingCategories] = useState(true);

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
    setError('');

    const { data: countryData, error: countryError } =
      await supabase
        .from('countries')
        .select('id, name')
        .eq('id', country)
        .single();

    if (countryError) {
      console.error(countryError);
      setError('Não foi possível carregar o país selecionado.');
      return;
    }

    const { data: provinceData, error: provinceError } =
      await supabase
        .from('provinces')
        .select('id, name, country_id')
        .eq('id', province)
        .eq('country_id', country)
        .single();

    if (provinceError || !provinceData) {
      console.error(provinceError);
      setError(
        'A província selecionada não pertence ao país escolhido.'
      );
      return;
    }

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData.name || '');
  }

  async function loadCategories() {
    setLoadingCategories(true);
    setError('');

    const { data, error } = await supabase
      .from('professional_categories')
      .select('id, name, description, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      setCategories([]);
      setError(
        'Não foi possível carregar as categorias profissionais.'
      );
      setLoadingCategories(false);
      return;
    }

    setCategories(data || []);
    setLoadingCategories(false);
  }

  function openCategory(category) {
    router.push({
      pathname: '/professional-subcategories',
      query: {
        category: category.id,
        country,
        province,
      },
    });
  }

  async function handlePublishJob(event) {
    event.preventDefault();

    setMessage('');
    setError('');

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
        `/login?redirect=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    /*
      A vaga precisa de uma categoria e subcategoria.
      Como o formulário está nesta página inicial,
      o contratante deverá primeiro escolher uma categoria
      profissional para publicar uma vaga.
    */

    setError(
      'Para publicar uma vaga, escolha primeiro a categoria profissional adequada.'
    );
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
          marginTop: 10,
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
          marginTop: 16,
          padding: 22,
          borderRadius: 20,
          background:
            'linear-gradient(135deg,#075B4E,#0C7564)',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            opacity: 0.8,
            marginBottom: 9,
          }}
        >
          Contratar profissionais
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
            opacity: 0.95,
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
          padding: 19,
          borderRadius: 16,
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
          Esta área é destinada a quem procura pessoas para
          contratar. Os perfis apresentados pertencem a
          profissionais que procuram oportunidades de trabalho
          ou disponibilizam as suas competências para
          contratação.
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
          desde profissionais especializados até pessoas
          disponíveis para trabalhos e tarefas do dia a dia.
        </p>
      </section>

      {/* CATEGORIAS */}
      <section
        style={{
          marginTop: 28,
        }}
      >
        <h2
          style={{
            fontSize: 21,
            margin: 0,
          }}
        >
          Você procura alguém para trabalhar?
        </h2>

        <p
          style={{
            margin: '6px 0 16px',
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          Comece por uma categoria profissional.
        </p>

        {loadingCategories && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid #DCE6E3',
              color: '#7A8986',
              fontSize: 13,
            }}
          >
            A carregar categorias profissionais…
          </div>
        )}

        {!loadingCategories &&
          categories.length === 0 && (
            <div
              style={{
                padding: 17,
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1px solid #DCE6E3',
                color: '#7A8986',
                fontSize: 13,
                lineHeight: 1.5,
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
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: 10,
              }}
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    openCategory(category)
                  }
                  style={{
                    textAlign: 'left',
                    border: '1px solid #DCE6E3',
                    background: '#FFFFFF',
                    borderRadius: 15,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#075B4E',
                    }}
                  >
                    {category.name}
                  </div>

                  {category.description && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        lineHeight: 1.45,
                        color: 'var(--ink-soft)',
                      }}
                    >
                      {category.description}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#B88300',
                    }}
                  >
                    Ver áreas →
                  </div>
                </button>
              ))}
            </div>
          )}
      </section>

      {/* PUBLICAR VAGA */}
      <section
        style={{
          marginTop: 32,
          padding: 21,
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
          Descreva o que você precisa e faça a sua vaga
          chegar aos profissionais da área e da província
          selecionadas.
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
              Primeiro escolha a categoria profissional
              adequada acima. Depois você poderá selecionar a
              área específica e publicar a vaga para os
              profissionais dessa área.
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
              Continuar para escolher a área
            </button>
          </form>
        )}
      </section>

      {/* CLIENTE PRÓ */}
      <section
        style={{
          marginTop: 20,
          padding: 19,
          borderRadius: 17,
          background: '#FFF9E8',
          border: '1px solid #F0DE9B',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 17,
          }}
        >
          Quer que o seu perfil apareça aqui?
        </h3>

        <p
          style={{
            margin: '7px 0 13px',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--ink-soft)',
          }}
        >
          Faça parte dos profissionais disponíveis para
          contratação e, com o Cliente Pró, tenha acesso à
          área de oportunidades e às funcionalidades
          destinadas a quem procura trabalho.
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setMessage(
              'A área de planos do Cliente Pró será ligada nesta etapa.'
            );
          }}
        >
          Quero aparecer aqui
        </button>
      </section>

      {/* MENSAGEM */}
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
            
