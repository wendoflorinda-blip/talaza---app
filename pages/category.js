import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Category() {
  const router = useRouter();
  const { id } = router.query;

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !id) return;

    loadCategory();
  }, [router.isReady, id]);

  async function loadCategory() {
    setLoading(true);
    setError('');

    // Carregar a categoria
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

    setCategory(categoryData);

    // Carregar as subcategorias
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
    <div className="container">

      <nav className="topnav">
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div className="logo">T</div>
            <b>Talaza</b>
          </div>
        </Link>
      </nav>

      {loading && (
        <p style={{ color: 'var(--ink-faint)' }}>
          A carregar…
        </p>
      )}

      {error && (
        <p
          style={{
            color: '#D92D20',
            fontSize: 13
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && category && (
        <>
          <h1
            style={{
              fontSize: 26,
              marginTop: 20
            }}
          >
            {category.name}
          </h1>

          <p
            style={{
              color: 'var(--ink-soft)',
              marginBottom: 24
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
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12
              }}
            >
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  href={`/subcategory?id=${subcategory.id}`}
                  className="card"
                  style={{
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <h3
                    style={{
                      fontSize: 15,
                      margin: '0 0 6px'
                    }}
                  >
                    {subcategory.name}
                  </h3>

                  {subcategory.description && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-soft)',
                        margin: 0
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
