import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ProfessionalSubcategories() {
  const router = useRouter();

  const { category, country, province } = router.query;

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [categoryData, setCategoryData] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!category || !country || !province) {
      router.replace('/country');
      return;
    }

    loadPage();
  }, [router.isReady, category, country, province]);

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const categoryId = Array.isArray(category)
        ? category[0]
        : category;

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

      /*
       * 3. CATEGORIA PROFISSIONAL
       *
       * IMPORTANTE:
       * É professional_categories.
       * Não é categories.
       */
      const {
        data: categoryResult,
        error: categoryError,
      } = await supabase
        .from('professional_categories')
        .select(
          'id, name, description, is_active'
        )
        .eq('id', categoryId)
        .eq('is_active', true)
        .single();

      if (categoryError) {
        console.error(
          'Erro ao carregar categoria profissional:',
          categoryError
        );

        throw categoryError;
      }

      /*
       * 4. SUBCATEGORIAS
       *
       * Aqui está a ligação:
       *
       * professional_subcategories.category_id
       *
       * recebe o ID de:
       *
       * professional_categories.id
       */
      const {
        data: subcategoryData,
        error: subcategoryError,
      } = await supabase
        .from('professional_subcategories')
        .select(
          'id, created_at, category_id, name, description, is_active'
        )
        .eq('category_id', categoryResult.id)
        .eq('is_active', true)
        .order('name', {
          ascending: true,
        });

      if (subcategoryError) {
        console.error(
          'Erro ao carregar subcategorias profissionais:',
          subcategoryError
        );

        throw subcategoryError;
      }

      setCountryName(countryData?.name || '');
      setProvinceName(provinceData?.name || '');
      setCategoryData(categoryResult);
      setSubcategories(subcategoryData || []);
    } catch (err) {
      console.error(
        'ERRO REAL NA PÁGINA PROFESSIONAL SUBCATEGORIES:',
        err
      );

      setError(
        'Não foi possível carregar as subcategorias profissionais.'
      );

      setCategoryData(null);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openSubcategory(subcategoryId) {
    router.push({
      pathname: '/professional-profiles',
      query: {
        category: category,
        subcategory: subcategoryId,
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
            pathname: '/contratar',
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
            pathname: '/contratar',
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

      {/* CABEÇALHO DA CATEGORIA */}
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
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            opacity: 0.8,
            marginBottom: 9,
          }}
        >
          Contratar
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 27,
            lineHeight: 1.15,
          }}
        >
          {categoryData?.name ||
            'Escolha uma área profissional'}
        </h1>

        {categoryData?.description && (
          <p
            style={{
              margin: '11px 0 0',
              fontSize: 13,
              lineHeight: 1.6,
              opacity: 0.94,
            }}
          >
            {categoryData.description}
          </p>
        )}

        <p
          style={{
            margin: '12px 0 0',
            fontSize: 12,
            lineHeight: 1.5,
            opacity: 0.82,
          }}
        >
          Escolha abaixo a área profissional que
          corresponde ao que você procura.
        </p>
      </section>

      {/* CONTEÚDO */}
      <section
        style={{
          marginTop: 26,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 21,
          }}
        >
          Escolha uma área
        </h2>

        <p
          style={{
            margin: '6px 0 16px',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Encontre profissionais preparados para a
          função que você precisa.
        </p>

        {/* CARREGANDO */}
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
            A carregar áreas profissionais…
          </div>
        )}

        {/* ERRO */}
        {!loading && error && (
          <div
            style={{
              padding: 17,
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

        {/* SEM SUBCATEGORIAS */}
        {!loading &&
          !error &&
          subcategories.length === 0 && (
            <div
              style={{
                padding: 19,
                borderRadius: 15,
                background: '#FFFFFF',
                border: '1px solid #DCE6E3',
                color: '#7A8986',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              Ainda não existem áreas profissionais
              cadastradas nesta categoria.
            </div>
          )}

        {/* SUBCATEGORIAS */}
        {!loading &&
          !error &&
          subcategories.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(190px,1fr))',
                gap: 10,
              }}
            >
              {subcategories.map(
                (subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() =>
                      openSubcategory(
                        subcategory.id
                      )
                    }
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border:
                        '1px solid #DCE6E3',
                      background: '#FFFFFF',
                      borderRadius: 15,
                      padding: 16,
                      cursor: 'pointer',
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        fontSize: 14,
                        color: '#075B4E',
                      }}
                    >
                      {subcategory.name}
                    </strong>

                    {subcategory.description && (
                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 11,
                          lineHeight: 1.45,
                          color:
                            'var(--ink-soft)',
                        }}
                      >
                        {
                          subcategory.description
                        }
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
                      Ver profissionais →
                    </div>
                  </button>
                )
              )}
            </div>
          )}
      </section>

      {/* INFORMAÇÃO */}
      <section
        style={{
          marginTop: 30,
          padding: 18,
          borderRadius: 16,
          background: '#F4F8F7',
          border: '1px solid #DCE6E3',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#075B4E',
            marginBottom: 7,
          }}
        >
          LOCALIZAÇÃO
        </div>

        <p
          style={{
            margin: 0,
            color: 'var(--ink-soft)',
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          Você está procurando profissionais em{' '}
          <strong>
            {provinceName || 'sua província'}
          </strong>
          . Os profissionais apresentados na próxima
          etapa serão filtrados de acordo com a
          província selecionada.
        </p>
      </section>
    </div>
  );
}
           
          
