import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ProfessionalSubcategories() {
  const router = useRouter();

  const { category, country, province } = router.query;

  const [categoryData, setCategoryData] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

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

    // PAÍS
    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    // PROVÍNCIA
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
      setLoading(false);
      return;
    }

    // CATEGORIA PROFISSIONAL
    const {
      data: categoryResult,
      error: categoryError,
    } = await supabase
      .from('professional_categories')
      .select(
        'id, name, description, is_active, created_at'
      )
      .eq('id', category)
      .eq('is_active', true)
      .single();

    if (categoryError || !categoryResult) {
      console.error(categoryError);

      setError(
        'Não foi possível encontrar esta categoria profissional.'
      );

      setLoading(false);
      return;
    }

    // SUBCATEGORIAS
    const {
      data: subcategoryData,
      error: subcategoryError,
    } = await supabase
      .from('professional_subcategories')
      .select(
        'id, category_id, name, description, is_active, created_at'
      )
      .eq('category_id', category)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (subcategoryError) {
      console.error(subcategoryError);

      setError(
        'Não foi possível carregar as subcategorias profissionais.'
      );

      setLoading(false);
      return;
    }

    setCountryName(countryData?.name || '');
    setProvinceName(provinceData.name || '');
    setCategoryData(categoryResult);
    setSubcategories(subcategoryData || []);

    setLoading(false);
  }

  function openSubcategory(subcategory) {
    router.push({
      pathname: '/professionals',
      query: {
        category,
        subcategory: subcategory.id,
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

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.back()}
          style={{
            fontSize: 12,
          }}
        >
          ← Voltar
        </button>
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

      {/* CABEÇALHO DA CATEGORIA */}
      {!loading && categoryData && (
        <section
          style={{
            marginTop: 17,
            padding: 21,
            borderRadius: 19,
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
              letterSpacing: 0.6,
              opacity: 0.78,
              marginBottom: 8,
            }}
          >
            Área profissional
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 27,
              lineHeight: 1.15,
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
          marginTop: 27,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 21,
          }}
        >
          Em que área você procura?
        </h2>

        <p
          style={{
            margin: '6px 0 16px',
            color: 'var(--ink-soft)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Escolha uma área profissional para encontrar pessoas
          disponíveis para trabalhar na sua província.
        </p>

        {loading && (
          <div
            style={{
              padding: 17,
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
                lineHeight: 1.55,
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
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() =>
                    openSubcategory(subcategory)
                  }
                  style={{
                    textAlign: 'left',
                    border: '1px solid #DCE6E3',
                    background: '#FFFFFF',
                    borderRadius: 15,
                    padding: 16,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#075B4E',
                    }}
                  >
                    {subcategory.name}
                  </div>

                  {subcategory.description && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        lineHeight: 1.45,
                        color: 'var(--ink-soft)',
                      }}
                    >
                      {subcategory.description}
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
                    Ver profissionais →
                  </div>
                </button>
              ))}
            </div>
          )}
      </section>

      {/* ERRO */}
      {error && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 12,
            background: '#FFF1F0',
            color: '#9B2C2C',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
