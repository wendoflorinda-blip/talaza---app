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

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData.name || '');
  }

  async function loadCategories() {
    setLoadingCategories(true);
    setError('');

    /*
     * Não usamos description porque essa coluna
     * não existe em professional_categories.
     */
    const { data, error } = await supabase
      .from('professional_categories')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar categorias:', error);

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

  function handleCategoryClick(category) {
    router.push({
      pathname: '/professional-subcategory',
      query: {
        country,
        province,
        category: category.id,
      },
    });
  }

  async function handlePublishJob(event) {
    event.preventDefault();

    setMessage('');
    setError('');

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
     * A vaga precisa de uma categoria e subcategoria.
     * Como estamos na página inicial do Contratar,
     * o utilizador deverá escolher primeiro uma categoria.
     */
    setError(
      'Para publicar uma vaga, escolha primeiro a categoria profissional e a área correspondente.'
    );

    return;
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
          Esta área é destinada a quem procura pessoas ou
          profissionais para contratar. Os perfis apresentados
          pertencem a pessoas que procuram oportunidades de
          trabalho ou disponibilizam as suas competências para
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
          desde trabalhos especializados até serviços e
          tarefas do dia a dia.
        </p>
      </section>

      {/* CATEGORIAS PROFISSIONAIS */}
      <section
        style={{
          marginTop: 26,
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
            margin: '6px 0 16px',
            color: 'var(--ink-soft)',
            fontSize: 13,
          }}
        >
          Comece por uma categoria profissional.
        </p>

        {loadingCategories && (
          <p
            style={{
              color: 'var(--ink-faint)',
              fontSize: 13,
            }}
          >
            A carregar categorias profissionais…
          </p>
        )}

        {!loadingCategories &&
          categories.length === 0 && (
            <div
              style={{
                padding: 18,
                borderRadius: 14,
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
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: 10,
              }}
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    handleCategoryClick(category)
                  }
                  style={{
                    textAlign: 'left',
                    border: '1px solid #DCE6E3',
                    background: '#FFFFFF',
                    borderRadius: 14,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
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

                    <span
                      style={{
                        color: '#075B4E',
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      →
                    </span>
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
          Não encontrou o que procura?
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
          Não encontrou o profissional adequado nas
          categorias? Publique a sua vaga com as condições
          que deseja e permita que ela chegue aos
          profissionais da sua província.
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setShowJobForm(!showJobForm)
          }
        >
          {showJobForm
            ? 'Fechar'
            : 'Publicar uma vaga'}
        </button>

        {showJobForm && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            Para publicar uma vaga, primeiro escolha a
            categoria profissional adequada. Depois escolha a
            <strong> Professional Subcategory </strong>
            correspondente. A vaga será ligada à província
            selecionada e publicada na área de Oportunidades.
          </div>
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
          contratação. Com o plano Cliente Pró, o seu perfil
          poderá aparecer nesta área e você poderá desbloquear
          também a área de oportunidades.
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            setMessage(
              'A área de planos do Cliente Pró será ligada nesta etapa.'
            )
          }
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
                
          
            
