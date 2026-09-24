import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Category() {
  const router = useRouter();

  const {
    id,
    country,
    province,
  } = router.query;

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);

  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!id || !country || !province) {
      router.replace('/country');
      return;
    }

    loadData();
  }, [
    router.isReady,
    id,
    country,
    province,
  ]);

  async function loadData() {
    setLoading(true);
    setError('');

    const { data: categoryData, error: categoryError } =
      await supabase
        .from('categories')
        .select('id, name')
        .eq('id', id)
        .single();

    if (categoryError) {
      console.error(categoryError);
      setError('Não foi possível carregar esta categoria.');
      setLoading(false);
      return;
    }

    const { data: provinceData } = await supabase
      .from('provinces')
      .select('id, name, country_id')
      .eq('id', province)
      .eq('country_id', country)
      .single();

    if (!provinceData) {
      setError(
        'Esta província não pertence ao país selecionado.'
      );
      setLoading(false);
      return;
    }

    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name')
      .eq('id', country)
      .single();

    setCategory(categoryData);
    setProvinceName(provinceData.name);
    setCountryName(countryData?.name || '');

    const { data: subcategoryData, error: subcategoryError } =
      await supabase
        .from('subcategories')
        .select('id, name, description')
        .eq('category_id', id)
        .order('name', { ascending: true });

    if (subcategoryError) {
      console.error(subcategoryError);
      setError('Não foi possível carregar as subcategorias.');
      setLoading(false);
      return;
    }

    setSubcategories(subcategoryData || []);
    setLoading(false);
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: 50,
      }}
    >
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

      {loading && (
        <p style={{ color: 'var(--ink-faint)' }}>
          A carregar…
        </p>
      )}

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            background: '#FFF1F0',
            color: '#9B2C2C',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && category && (
        <>
          <div
            style={{
              marginTop: 15,
              padding: '9px 12px',
              borderRadius: 11,
              background: '#EAF4F1',
              color: '#075B4E',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
            }}
          >
            {countryName} · {provinceName}
          </div>

          <h1
            style={{
              fontSize: 25,
              marginTop: 18,
              marginBottom: 6,
            }}
          >
            {category.name}
          </h1>

          <p
            style={{
              color: 'var(--ink-soft)',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            Escolha uma subcategoria para encontrar exatamente
            o que procura.
          </p>

          {subcategories.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)' }}>
              Ainda não existem subcategorias nesta categoria.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(145px,1fr))',
                gap: 8,
              }}
            >
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  href={{
                    pathname: '/subcategory',
                    query: {
                      id: subcategory.id,
                      country,
                      province,
                    },
                  }}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    background: '#FFFFFF',
                    border: '1px solid #D9E5E1',
                    borderRadius: 12,
                    padding: 13,
                    minHeight: 58,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 13,
                      margin: 0,
                      color: '#17342F',
                    }}
                  >
                    {subcategory.name}
                  </h3>

                  {subcategory.description && (
                    <p
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-soft)',
                        margin: '6px 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {subcategory.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}                                
