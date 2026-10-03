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
  }, [
    router.isReady,
    category,
    country,
    province,
  ]);

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
       * IMPORTANTE:
       * A ligação é:
       *
       * professional_subcategories.category_id
       *
       * =
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

      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openSubcategory(subcategoryId) {
    router.push({
      pathname: '/professional-profiles',
      query: {
        category,
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
          ← Categorias
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
      {!loading && categoryData && (
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
              fontSize: 27,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {categoryData.name}
          </h1>

          {categoryData.description && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 13,
                lineHeight: 1.6,
                opacity: 0.94,
              }}
            >
              {categoryData.description}
            </p>
          )}
        </section>
      )}

      {/* TÍTULO */}
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
          Escolha a área profissional
        </h2>

        <p
          style={{
            margin: '6px 0 16px',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Selecione a área que corresponde ao
          profissional que você procura.
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
            A carregar áreas profissionais…
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
          subcategories.length === 0 && (
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1px solid #DCE6E3',
                color: '#7A8986',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              Ainda não existem áreas profissionais
              cadastradas nesta categoria.
            </div>
          )}

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
          Não encontrou o profissional?
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 20,
          }}
        >
          Publique uma vaga
        </h2>

        <p
          style={{
            margin: '8px 0 14px',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          Não encontrou a pessoa certa? Publique uma
          vaga e descreva o profissional que você
          procura.
        </p>

        <Link
          href={{
            pathname: '/job-post',
            query: {
              country,
              province,
              category,
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
    </div>
  );
}
  
