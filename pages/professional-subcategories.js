import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ProfessionalSubcategories() {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState('');
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');

  const [categoryName, setCategoryName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [subcategories, setSubcategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const receivedCategory = Array.isArray(
      router.query.category
    )
      ? router.query.category[0]
      : router.query.category;

    const receivedCountry = Array.isArray(
      router.query.country
    )
      ? router.query.country[0]
      : router.query.country;

    const receivedProvince = Array.isArray(
      router.query.province
    )
      ? router.query.province[0]
      : router.query.province;

    if (
      !receivedCategory ||
      !receivedCountry ||
      !receivedProvince
    ) {
      router.replace('/country');
      return;
    }

    setCategoryId(receivedCategory);
    setCountryId(receivedCountry);
    setProvinceId(receivedProvince);

    loadPage(
      receivedCategory,
      receivedCountry,
      receivedProvince
    );
  }, [router.isReady]);

  async function loadPage(
    receivedCategory,
    receivedCountry,
    receivedProvince
  ) {
    setLoading(true);
    setError('');

    try {
      /* PAÍS */
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

      /* PROVÍNCIA */
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

      /* CATEGORIA PROFISSIONAL */
      const {
        data: categoryData,
        error: categoryError,
      } = await supabase
        .from('professional_categories')
        .select('id, name, is_active')
        .eq('id', receivedCategory)
        .eq('is_active', true)
        .single();

      if (categoryError) {
        console.error(
          'ERRO CATEGORIA PROFISSIONAL:',
          categoryError
        );
        throw categoryError;
      }

      /*
       * SUBCATEGORIAS PROFISSIONAIS
       *
       * Ligação:
       *
       * professional_subcategories.category_id
       *              ↓
       * professional_categories.id
       */
      const {
        data: subcategoryData,
        error: subcategoryError,
      } = await supabase
        .from('professional_subcategories')
        .select(
          'id, created_at, category_id, name, is_active, description'
        )
        .eq('category_id', receivedCategory)
        .eq('is_active', true)
        .order('name', {
          ascending: true,
        });

      if (subcategoryError) {
        console.error(
          'ERRO SUBCATEGORIAS PROFISSIONAIS:',
          subcategoryError
        );
        throw subcategoryError;
      }

      setCountryName(countryData?.name || '');
      setProvinceName(provinceData?.name || '');
      setCategoryName(categoryData?.name || '');
      setSubcategories(subcategoryData || []);
    } catch (err) {
      console.error(
        'ERRO COMPLETO:',
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
        category: categoryId,
        subcategory: subcategoryId,
        country: countryId,
        province: provinceId,
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
              country: countryId,
              province: provinceId,
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
              country: countryId,
              province: provinceId,
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

      {/* TÍTULO */}
      <section
        style={{
          marginTop: 22,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 27,
            lineHeight: 1.15,
          }}
        >
          {categoryName}
        </h1>

        <p
          style={{
            margin: '8px 0 0',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Escolha uma subcategoria profissional.
        </p>
      </section>

      {/* ESTADO DE CARREGAMENTO */}
      {loading && (
        <div
          style={{
            marginTop: 22,
            padding: 18,
            borderRadius: 14,
            background: '#FFFFFF',
            border: '1px solid #DCE6E3',
            color: '#7A8986',
            fontSize: 13,
          }}
        >
          A carregar subcategorias profissionais…
        </div>
      )}

      {/* ERRO */}
      {!loading && error && (
        <div
          style={{
            marginTop: 22,
            padding: 16,
            borderRadius: 14,
            background: '#FFF1F0',
            border: '1px solid #F0C7C4',
            color: '#9B2C2C',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* SUBCATEGORIAS */}
      {!loading &&
        !error &&
        subcategories.length === 0 && (
          <div
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid #DCE6E3',
              color: '#7A8986',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Ainda não existem subcategorias profissionais
            cadastradas nesta categoria.
          </div>
        )}

      {!loading &&
        !error &&
        subcategories.length > 0 && (
          <section
            style={{
              marginTop: 22,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(190px,1fr))',
                gap: 10,
              }}
            >
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() =>
                    openSubcategory(subcategory.id)
                  }
                  style={{
                    textAlign: 'left',
                    border: '1px solid #DCE6E3',
                    background: '#FFFFFF',
                    borderRadius: 15,
                    padding: 16,
                    cursor: 'pointer',
                    color: '#17342F',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      color: '#075B4E',
                      fontSize: 14,
                      lineHeight: 1.3,
                    }}
                  >
                    {subcategory.name}
                  </strong>

                  {subcategory.description && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 7,
                        color: 'var(--ink-soft)',
                        fontSize: 11,
                        lineHeight: 1.45,
                      }}
                    >
                      {subcategory.description}
                    </span>
                  )}

                  <span
                    style={{
                      display: 'block',
                      marginTop: 12,
                      color: '#B88300',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    Ver profissionais →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

      {/* RODAPÉ */}
      <div
        style={{
          marginTop: 30,
          padding: 15,
          borderRadius: 13,
          background: '#F4F8F7',
          border: '1px solid #DCE6E3',
          color: 'var(--ink-soft)',
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {provinceName} · {categoryName}
      </div>
    </div>
  );
}
      

    

    
        
