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
  const [loading, setLoading] = useState(true);

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
      const countryId = Array.isArray(country)
        ? country[0]
        : country;

      const provinceId = Array.isArray(province)
        ? province[0]
        : province;

      /*
       * 1. PAÍS
       */
      const {
        data: countryData,
        error: countryError,
      } = await supabase
        .from('countries')
        .select('id, name')
        .eq('id', countryId)
        .single();

      if (countryError) {
        console.error(
          'Erro ao carregar país:',
          countryError
        );

        throw countryError;
      }

      /*
       * 2. PROVÍNCIA
       */
      const {
        data: provinceData,
        error: provinceError,
      } = await supabase
        .from('provinces')
        .select('id, name, country_id')
        .eq('id', provinceId)
        .eq('country_id', countryId)
        .single();

      if (provinceError) {
        console.error(
          'Erro ao carregar província:',
          provinceError
        );

        throw provinceError;
      }

      setCountryName(countryData?.name || '');
      setProvinceName(provinceData?.name || '');

      /*
       * 3. CATEGORIAS PROFISSIONAIS
       *
       * IMPORTANTE:
       * Aqui usamos somente professional_categories.
       *
       * Não usamos categories.
       * Não usamos professional_subcategories.
       * Não usamos professional_profiles.
       */
      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from('professional_categories')
        .select(
          'id, name, description, is_active'
        )
        .eq('is_active', true)
        .order('name', {
          ascending: true,
        });

      if (categoryError) {
        console.error(
          'Erro ao carregar categorias profissionais:',
          categoryError
        );

        throw categoryError;
      }

      setCategories(categoryData || []);
    } catch (err) {
      console.error(
        'ERRO REAL NA PÁGINA CONTRATAR:',
        err
      );

      setError(
        'Não foi possível carregar as categorias profissionais.'
      );

      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openCategory(categoryId) {
    router.push({
      pathname: '/professional-subcategories',
      query: {
        category: categoryId,
        country,
        province,
      },
    });
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
            fontSize: 10,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          CONTRATAR
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
          trabalho, preencher uma função ou ajudar no
          seu negócio?
        </p>

        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14,
            lineHeight: 1.65,
            opacity: 0.95,
          }}
        >
          Encontre profissionais disponíveis na sua
          província, escolha a área que procura e
          entre em contacto diretamente.
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
        <p
          style={{
            margin: 0,
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          Esta área é destinada a quem procura pessoas
          para contratar. Os perfis apresentados
          pertencem a profissionais que procuram
          oportunidades de trabalho ou disponibilizam
          as suas competências para contratação.
        </p>

        <p
          style={{
            margin: '12px 0 0',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          Encontre a pessoa certa para o que você
          precisa — desde trabalhos especializados até
          serviços e tarefas do dia a dia.
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
          Comece por uma categoria.
        </p>

        {loading && (
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
            A carregar categorias profissionais…
          </div>
        )}

        {!loading &&
          error && (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                background: '#FFF1F0',
                border: '1px solid #F0C8C5',
                color: '#9B2C2C',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

        {!loading &&
          !error &&
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

        {!loading &&
          !error &&
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
                    openCategory(category.id)
                  }
                  style={{
                    textAlign: 'left',
                    border:
                      '1px solid #DCE6E3',
                    background: '#FFFFFF',
                    borderRadius: 15,
                    padding: 16,
                    cursor: 'pointer',
                    transition:
                      '0.2s ease',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#075B4E',
                    }}
                  >
                    {category.name}
                  </strong>

                  {category.description && (
                    <div
                      style={{
                        marginTop: 7,
                        fontSize: 11,
                        lineHeight: 1.45,
                        color:
                          'var(--ink-soft)',
                      }}
                    >
                      {category.description}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 11,
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
          padding: 20,
          borderRadius: 18,
          background: '#F4F8F7',
          border:
            '1px solid #DCE6E3',
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
            lineHeight: 1.6,
            margin: '8px 0 15px',
          }}
        >
          Descreva o profissional que procura e
          publique a sua necessidade. A vaga será
          direcionada aos profissionais da categoria,
          área e província escolhidas.
        </p>

        <Link
          href={{
            pathname: '/job-post',
            query: {
              country,
              province,
            },
          }}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            textDecoration: 'none',
          }}
        >
          Publicar uma vaga
        </Link>
      </section>

      {/* CLIENTE PRÓ */}
      <section
        style={{
          marginTop: 20,
          padding: 18,
          borderRadius: 16,
          background: '#FFF9E8',
          border:
            '1px solid #F0DE9B',
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
          Faça parte dos profissionais disponíveis
          para contratação. O seu perfil poderá ser
          encontrado por pessoas e empresas que
          procuram alguém com as suas competências.
        </p>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            alert(
              'A área de planos do Cliente Pró será ligada nesta etapa.'
            );
          }}
        >
          Quero aparecer aqui
        </button>
      </section>
    </div>
  );
}
                        
            
